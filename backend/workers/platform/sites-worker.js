import { generateId, generateSubdomain, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin, handleStaffCRUD } from '../storefront/site-admin-worker.js';
import { registerCustomHostname, deleteCustomHostname, findCustomHostname } from '../../utils/cloudflare.js';
import { resolveSiteDBById, getSiteConfig, getSiteWithConfig } from '../../utils/site-db.js';
import { trackD1Write, trackD1Update, estimateRowBytes } from '../../utils/usage-tracker.js';

export async function handleSites(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const siteId = pathParts[2];
  const subResource = pathParts[3];

  if (siteId && subResource === 'staff') {
    const staffId = pathParts[4] || null;
    return handleStaffCRUD(request, env, siteId, subResource, staffId);
  }

  if (siteId && (subResource === 'custom-domain' || subResource === 'verify-domain')) {
    let authorized = false;
    const user = await validateAuth(request, env);
    if (user) {
      const ownedSite = await env.DB.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').bind(siteId, user.id).first();
      if (ownedSite) authorized = true;
    }
    if (!authorized) {
      const siteAdmin = await validateSiteAdmin(request, env, siteId);
      if (!siteAdmin) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (subResource === 'custom-domain') {
      if (method === 'PUT') return handleSetCustomDomain(request, env, siteId);
      if (method === 'DELETE') return handleRemoveCustomDomain(env, siteId);
      return errorResponse('Method not allowed', 405);
    }
    if (subResource === 'verify-domain') {
      if (method === 'POST') return handleVerifyDomain(env, siteId);
      return errorResponse('Method not allowed', 405);
    }
  }

  if (method === 'PUT' && siteId) {
    const user = await validateAuth(request, env);
    if (user) {
      return updateSite(request, env, user, siteId);
    }
    const siteAdmin = await validateSiteAdmin(request, env, siteId);
    if (siteAdmin) {
      return updateSiteAsAdmin(request, env, siteId);
    }
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (method === 'GET' && siteId === 'check-subdomain') {
    const url = new URL(request.url);
    const sub = url.searchParams.get('subdomain');
    return checkSubdomainAvailability(env, sub);
  }

  switch (method) {
    case 'GET':
      return siteId ? getSite(env, user, siteId) : getUserSites(env, user);
    case 'POST':
      return createSite(request, env, user);
    case 'DELETE':
      return deleteSite(env, user, siteId);
    default:
      return errorResponse('Method not allowed', 405);
  }
}

async function checkSubdomainAvailability(env, subdomain) {
  if (!subdomain || subdomain.length < 3) {
    return jsonResponse({ available: false, reason: 'Subdomain must be at least 3 characters' });
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) && subdomain.length > 1) {
    return jsonResponse({ available: false, reason: 'Only lowercase letters, numbers, and hyphens allowed' });
  }
  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM sites WHERE LOWER(subdomain) = ?'
    ).bind(subdomain.toLowerCase()).first();
    if (existing) {
      return jsonResponse({ available: false, reason: 'This subdomain is already taken' });
    }
    return jsonResponse({ available: true });
  } catch (error) {
    console.error('Check subdomain error:', error);
    return errorResponse('Failed to check subdomain', 500);
  }
}

async function getUserSites(env, user) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, template_id,
              is_active, subscription_plan, subscription_expires_at, created_at,
              custom_domain, domain_status
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();

    const enrichedSites = [];
    for (const site of sites.results) {
      const config = await getSiteConfig(env, site.id);

      let subscription = { plan: site.subscription_plan || null, status: 'none', billingCycle: null, periodStart: null, periodEnd: null };
      try {
        if (site.subscription_plan === 'enterprise') {
          subscription = {
            plan: 'enterprise',
            status: 'active',
            billingCycle: null,
            periodStart: null,
            periodEnd: site.subscription_expires_at || '2099-12-31T23:59:59',
          };
        } else {
          const sub = await env.DB.prepare(
            `SELECT plan, status, billing_cycle, current_period_start, current_period_end, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status != 'enterprise_override' ORDER BY created_at DESC LIMIT 1`
          ).bind(site.id).first();
          if (sub) {
            let subStatus = sub.status;
            if (subStatus === 'active' && sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
              subStatus = 'expired';
            }
            subscription = {
              plan: sub.plan,
              status: subStatus,
              billingCycle: sub.billing_cycle,
              periodStart: sub.current_period_start,
              periodEnd: sub.current_period_end,
              hasRazorpay: !!sub.razorpay_subscription_id,
            };
          } else if (site.subscription_plan && site.subscription_expires_at) {
            const isExpired = new Date(site.subscription_expires_at) < new Date();
            subscription = {
              plan: site.subscription_plan,
              status: isExpired ? 'expired' : 'active',
              billingCycle: null,
              periodStart: null,
              periodEnd: site.subscription_expires_at,
            };
          }
        }
      } catch (e) {}
      enrichedSites.push({
        ...site,
        brand_name: config.brand_name || site.brand_name,
        category: config.category || null,
        logo_url: config.logo_url || null,
        primary_color: config.primary_color || '#000000',
        subscription,
      });
    }

    return successResponse(enrichedSites);
  } catch (error) {
    console.error('Get sites error:', error);
    return errorResponse('Failed to fetch sites', 500);
  }
}

async function getSite(env, user, siteId) {
  try {
    const siteRow = await env.DB.prepare(
      `SELECT * FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();

    if (!siteRow) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    const site = await getSiteWithConfig(env, siteRow);

    const siteDB = await resolveSiteDBById(env, siteId);
    const categories = await siteDB.prepare(
      `SELECT * FROM categories WHERE site_id = ? ORDER BY display_order`
    ).bind(siteId).all();

    return successResponse({ ...site, categories: categories.results });
  } catch (error) {
    console.error('Get site error:', error);
    return errorResponse('Failed to fetch site', 500);
  }
}

async function createSite(request, env, user) {
  let siteId = null;
  let finalSubdomain = null;
  
  try {
    const body = await request.json();
    const { brandName, categories, templateId, logoUrl, phone, email, address, primaryColor, secondaryColor } = body;
    const category = body.category || 'general';
    const subdomain = (body.subdomain || generateSubdomain(brandName)).toLowerCase().trim();

    if (!brandName) {
      return errorResponse('Brand name is required');
    }

    if (subdomain.length < 3) {
      return errorResponse('Subdomain must be at least 3 characters', 400, 'INVALID_SUBDOMAIN');
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
      return errorResponse('Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)', 400, 'INVALID_SUBDOMAIN');
    }

    const existingSubdomain = await env.DB.prepare(
      'SELECT id FROM sites WHERE LOWER(subdomain) = ?'
    ).bind(subdomain).first();

    if (existingSubdomain) {
      return errorResponse('This subdomain is already taken. Please choose a different brand name.', 400, 'SUBDOMAIN_TAKEN');
    }

    const activeShard = await env.DB.prepare(
      'SELECT id FROM shards WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    ).first();

    if (!activeShard) {
      return errorResponse('No active shard available. Please contact support.', 500);
    }

    finalSubdomain = subdomain;
    siteId = generateId();

    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, shard_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).bind(
      siteId,
      user.id,
      finalSubdomain,
      sanitizeInput(brandName),
      category,
      templateId || 'storefront',
      activeShard.id
    ).run();

    const siteDB = await resolveSiteDBById(env, siteId);

    const configData = {
      site_id: siteId,
      brand_name: sanitizeInput(brandName),
      category,
      logo_url: logoUrl || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      primary_color: primaryColor || '#000000',
      secondary_color: secondaryColor || '#ffffff',
    };
    const configBytes = estimateRowBytes(configData);

    await siteDB.prepare(
      `INSERT INTO site_config (site_id, brand_name, category, logo_url, phone, email, address, primary_color, secondary_color, settings, row_size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, datetime('now'), datetime('now'))`
    ).bind(
      siteId,
      sanitizeInput(brandName),
      category,
      logoUrl || null,
      phone || null,
      email || null,
      address || null,
      primaryColor || '#000000',
      secondaryColor || '#ffffff',
      configBytes
    ).run();
    await trackD1Write(env, siteId, configBytes);

    try {
      await env.DB.prepare(`
        INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
        VALUES (?, 0, 0, 0, datetime('now'))
        ON CONFLICT(site_id) DO NOTHING
      `).bind(siteId).run();
    } catch (usageErr) {
      console.error('Usage init failed (non-fatal):', usageErr.message || usageErr);
    }

    try {
      if (categories && categories.length > 0) {
        await createUserCategories(env, siteDB, siteId, categories);
      } else if (category) {
        await createDefaultCategories(env, siteDB, siteId, category);
      }
    } catch (catError) {
      console.error('Category creation failed (non-fatal):', catError.message || catError);
    }

    try {
      const activeSub = await env.DB.prepare(
        `SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
      ).bind(user.id).first();

      if (activeSub && activeSub.plan === 'trial' && activeSub.current_period_end && new Date(activeSub.current_period_end) > new Date()) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = 'trial', subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(activeSub.current_period_end, siteId).run();
      }
    } catch (subErr) {
      console.error('Check subscription for new site failed (non-fatal):', subErr);
    }

    return successResponse({ id: siteId, subdomain: finalSubdomain }, 'Site created successfully');
  } catch (error) {
    console.error('Create site error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('Subdomain already taken', 400, 'SUBDOMAIN_TAKEN');
    }
    return errorResponse('Failed to create site: ' + error.message, 500);
  }
}

async function createDefaultCategories(env, db, siteId, businessCategory) {
  const categoryTemplates = {
    jewellery: [
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Discover our latest exquisite collections', showOnHome: 1, children: [] },
      { name: 'Jewellery Collection', slug: 'jewellery-collection', subtitle: 'Exquisite pieces for every occasion', showOnHome: 1, children: [] },
      { name: 'Featured Collection', slug: 'featured-collection', subtitle: 'Handpicked favourites just for you', showOnHome: 1, children: [] },
    ],
    clothing: [
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Discover our latest fashion trends', showOnHome: 1, children: [] },
      { name: 'Clothing Collection', slug: 'clothing-collection', subtitle: 'Stylish wear for every occasion', showOnHome: 1, children: [] },
      { name: 'Featured Collection', slug: 'featured-collection', subtitle: 'Handpicked favourites just for you', showOnHome: 1, children: [] },
    ],
    electronics: [
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Latest gadgets and tech', showOnHome: 1, children: [] },
      { name: 'Electronics Collection', slug: 'electronics-collection', subtitle: 'Top picks in electronics', showOnHome: 1, children: [] },
      { name: 'Featured Collection', slug: 'featured-collection', subtitle: 'Our best selling products', showOnHome: 1, children: [] },
    ],
  };

  const categories = categoryTemplates[businessCategory] || categoryTemplates.jewellery;
  let order = 0;

  for (const cat of categories) {
    const parentId = generateId();
    const parentData = { id: parentId, site_id: siteId, name: cat.name, slug: cat.slug, subtitle: cat.subtitle || null };
    const parentBytes = estimateRowBytes(parentData);
    await db.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, cat.subtitle || null, cat.showOnHome !== undefined ? cat.showOnHome : 1, order++, parentBytes).run();
    await trackD1Write(env, siteId, parentBytes);

    for (const childName of (cat.children || [])) {
      const childId = generateId();
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, '-')}`;
      const childData = { id: childId, site_id: siteId, name: childName, slug: childSlug, parent_id: parentId };
      const childBytes = estimateRowBytes(childData);
      await db.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, show_on_home, display_order, row_size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(childId, siteId, childName, childSlug, parentId, 0, order++, childBytes).run();
      await trackD1Write(env, siteId, childBytes);
    }
  }
}

async function createUserCategories(env, db, siteId, categories) {
  let order = 0;
  for (let cat of categories) {
    let categoryName = typeof cat === 'string' ? cat : (cat.name || cat.label);
    if (!categoryName) continue;
    
    const slug = categoryName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const subtitle = (typeof cat === 'object' && cat.subtitle) ? cat.subtitle : null;
    const showOnHome = (typeof cat === 'object' && cat.showOnHome !== undefined) ? (cat.showOnHome ? 1 : 0) : 1;
    
    const catId = generateId();
    const catData = { id: catId, site_id: siteId, name: categoryName, slug, subtitle };
    const catBytes = estimateRowBytes(catData);
    await db.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(catId, siteId, categoryName, slug, subtitle, showOnHome, order++, catBytes).run();
    await trackD1Write(env, siteId, catBytes);
  }
}

const CONFIG_FIELDS = ['brand_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'phone', 'email', 'address', 'social_links', 'settings', 'currency'];

async function updateSite(request, env, user, siteId) {
  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    const updates = await request.json();
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();

    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (CONFIG_FIELDS.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            if (existingConfig && existingConfig.settings) {
              existingSettings = JSON.parse(existingConfig.settings);
            }
          } catch (e) {}
          const mergedSettings = { ...existingSettings, ...value };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(siteId);

    const oldBytes = existingConfig?.row_size_bytes || 0;

    await siteDB.prepare(
      `UPDATE site_config SET ${setClause.join(', ')} WHERE site_id = ?`
    ).bind(...values).run();

    const updatedConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare('UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?').bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    const brandNameUpdate = Object.entries(updates).find(([key]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return dbKey === 'brand_name';
    });
    if (brandNameUpdate) {
      await env.DB.prepare(
        'UPDATE sites SET brand_name = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(brandNameUpdate[1], siteId).run();
    }

    return successResponse(null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site error:', error);
    return errorResponse('Failed to update site', 500);
  }
}

async function updateSiteAsAdmin(request, env, siteId) {
  try {
    const updates = await request.json();
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();

    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (CONFIG_FIELDS.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            if (existingConfig && existingConfig.settings) {
              existingSettings = JSON.parse(existingConfig.settings);
            }
          } catch (e) {}
          const mergedSettings = { ...existingSettings, ...value };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
    }

    if (setClause.length === 0) {
      return errorResponse('No valid fields to update');
    }

    setClause.push('updated_at = datetime("now")');
    values.push(siteId);

    const oldBytes = existingConfig?.row_size_bytes || 0;

    await siteDB.prepare(
      `UPDATE site_config SET ${setClause.join(', ')} WHERE site_id = ?`
    ).bind(...values).run();

    const updatedConfig = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare('UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?').bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }

    const brandNameUpdate = Object.entries(updates).find(([key]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return dbKey === 'brand_name';
    });
    if (brandNameUpdate) {
      await env.DB.prepare(
        'UPDATE sites SET brand_name = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(brandNameUpdate[1], siteId).run();
    }

    return successResponse(null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site as admin error:', error);
    return errorResponse('Failed to update site', 500);
  }
}

async function deleteSite(env, user, siteId) {
  if (!siteId) {
    return errorResponse('Site ID is required');
  }

  try {
    const site = await env.DB.prepare(
      'SELECT id, subdomain, shard_id, d1_database_id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (site.shard_id) {
      try {
        const shardDB = await resolveSiteDBById(env, siteId);
        const siteTables = [
          'site_config',
          'activity_log', 'page_seo', 'reviews', 'notifications', 'coupons',
          'customer_email_verifications', 'customer_password_resets',
          'customer_addresses', 'site_customer_sessions', 'site_customers',
          'wishlists', 'carts', 'guest_orders', 'orders',
          'product_variants', 'products', 'categories', 'site_media', 'site_usage', 'addresses'
        ];
        for (const table of siteTables) {
          try {
            await shardDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
          } catch (e) {}
        }
        console.log(`Cleaned site data from shard for site ${siteId}`);
      } catch (shardErr) {
        console.error('Shard cleanup failed (non-fatal):', shardErr.message || shardErr);
      }
    }

    try {
      await env.DB.prepare('DELETE FROM site_usage WHERE site_id = ?').bind(siteId).run();
      await env.DB.prepare('DELETE FROM site_media WHERE site_id = ?').bind(siteId).run();
    } catch (e) {}

    await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(siteId).run();

    return successResponse({ subdomain: site.subdomain }, 'Site deleted successfully');
  } catch (error) {
    console.error('Delete site error:', error);
    return errorResponse('Failed to delete site', 500);
  }
}

export async function getSiteBySubdomain(env, subdomain) {
  try {
    const siteRow = await env.DB.prepare(
      `SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1`
    ).bind(subdomain).first();

    if (!siteRow) return null;

    return await getSiteWithConfig(env, siteRow);
  } catch (error) {
    console.error('Get site by subdomain error:', error);
    return null;
  }
}

async function handleSetCustomDomain(request, env, siteId) {
  try {
    const body = await request.json();
    let { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return errorResponse('Domain is required');
    }

    domain = domain.toLowerCase().trim();

    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      domain = domain.replace(/^https?:\/\//, '');
    }
    domain = domain.replace(/\/+$/, '');

    const domainParts = domain.split('.');
    if (domainParts.length < 3 || domainParts[0] !== 'www') {
      return errorResponse('Only www subdomains are supported (e.g. www.mystore.com). Root domains like mystore.com are not supported.', 400, 'INVALID_DOMAIN');
    }

    const domainRegex = /^www\.[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return errorResponse('Invalid domain format. Please enter a valid domain like www.mystore.com', 400, 'INVALID_DOMAIN');
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM sites WHERE custom_domain = ? AND id != ?'
    ).bind(domain, siteId).first();

    if (existing) {
      return errorResponse('This domain is already connected to another site', 409, 'DOMAIN_TAKEN');
    }

    const site = await env.DB.prepare(
      'SELECT id, custom_domain, domain_status, domain_verification_token FROM sites WHERE id = ?'
    ).bind(siteId).first();
    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (site.custom_domain === domain && site.domain_verification_token) {
      return successResponse({
        custom_domain: domain,
        domain_status: site.domain_status || 'pending',
        domain_verification_token: site.domain_verification_token,
      }, 'Domain already configured. Use the existing verification token.');
    }

    const token = generateId().replace(/-/g, '');

    await env.DB.prepare(
      `UPDATE sites SET custom_domain = ?, domain_status = 'pending', domain_verification_token = ?, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(domain, token, siteId).run();

    return successResponse({
      custom_domain: domain,
      domain_status: 'pending',
      domain_verification_token: token,
    }, 'Custom domain saved. Please add the DNS records and verify.');
  } catch (error) {
    console.error('Set custom domain error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('This domain is already connected to another site', 409, 'DOMAIN_TAKEN');
    }
    return errorResponse('Failed to set custom domain: ' + error.message, 500);
  }
}

async function resolveDnsA(hostname) {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    { headers: { 'Accept': 'application/dns-json' } }
  );
  const data = await res.json();
  return (data.Answer || []).filter(r => r.type === 1).map(r => r.data);
}

async function handleVerifyDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT id, custom_domain, domain_verification_token FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (!site.custom_domain) {
      return errorResponse('No custom domain configured for this site', 400);
    }

    const domain = site.custom_domain;
    const expectedToken = site.domain_verification_token;
    const errors = [];

    let txtVerified = false;
    try {
      const baseDomain = domain.replace(/^www\./, '');
      const txtHost = `_fluxe-verify.${baseDomain}`;
      const txtResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtHost)}&type=TXT`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const txtData = await txtResponse.json();
      if (txtData.Answer && txtData.Answer.length > 0) {
        for (const record of txtData.Answer) {
          const value = (record.data || '').replace(/"/g, '').trim();
          if (value === expectedToken) {
            txtVerified = true;
            break;
          }
        }
      }
      if (!txtVerified) {
        errors.push(`TXT record not found. Add a TXT record for _fluxe-verify.${baseDomain} with value: ${expectedToken}`);
      }
    } catch (dnsErr) {
      errors.push('Could not verify TXT record: ' + dnsErr.message);
    }

    let cnameVerified = false;
    try {
      const cnameResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const cnameData = await cnameResponse.json();
      if (cnameData.Answer && cnameData.Answer.length > 0) {
        for (const record of cnameData.Answer) {
          const target = (record.data || '').replace(/\.$/, '').toLowerCase();
          if (target.endsWith('.fluxe.in') || target.endsWith('.pages.dev')) {
            cnameVerified = true;
            break;
          }
        }
      }

      if (!cnameVerified) {
        const aRecords = await resolveDnsA(domain);
        if (aRecords.length > 0) {
          cnameVerified = true;
        }
      }

      if (!cnameVerified) {
        errors.push(`CNAME record not found. Add a CNAME record for ${domain} pointing to your .fluxe.in subdomain.`);
      }
    } catch (dnsErr) {
      errors.push('Could not verify CNAME record: ' + dnsErr.message);
    }

    if (txtVerified && cnameVerified) {
      try {
        const cfResult = await registerCustomHostname(env, domain);
        if (cfResult && cfResult.id) {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(cfResult.id, siteId).run();
        } else {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', updated_at = datetime('now') WHERE id = ?`
          ).bind(siteId).run();
        }
      } catch (cfErr) {
        console.error('CF hostname registration error:', cfErr);
        const existingHostname = await findCustomHostname(env, domain);
        if (existingHostname) {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(existingHostname.id, siteId).run();
        } else {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', updated_at = datetime('now') WHERE id = ?`
          ).bind(siteId).run();
        }
      }

      return successResponse({
        custom_domain: domain,
        domain_status: 'verified',
        verified: true,
      }, 'Domain verified and activated successfully!');
    }

    return successResponse({
      custom_domain: domain,
      domain_status: 'pending',
      verified: false,
      errors,
      checks: { txt: txtVerified, cname: cnameVerified },
    }, 'Domain verification incomplete. Please check the errors below.');
  } catch (error) {
    console.error('Verify domain error:', error);
    return errorResponse('Failed to verify domain: ' + error.message, 500);
  }
}

async function handleRemoveCustomDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT id, custom_domain, cf_hostname_id FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (!site.custom_domain) {
      return errorResponse('No custom domain configured for this site', 400);
    }

    if (site.cf_hostname_id) {
      try {
        await deleteCustomHostname(env, site.cf_hostname_id);
      } catch (cfErr) {
        console.error('Failed to delete CF hostname (non-fatal):', cfErr);
      }
    }

    await env.DB.prepare(
      `UPDATE sites SET custom_domain = NULL, domain_status = NULL, domain_verification_token = NULL, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();

    return successResponse(null, 'Custom domain removed successfully');
  } catch (error) {
    console.error('Remove custom domain error:', error);
    return errorResponse('Failed to remove custom domain', 500);
  }
}
