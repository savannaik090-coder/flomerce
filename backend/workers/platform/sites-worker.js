import { generateId, generateSubdomain, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin } from '../storefront/site-admin-worker.js';
import { registerCustomHostname, deleteCustomHostname, findCustomHostname } from '../../utils/cloudflare.js';
import { createDatabase, deleteDatabase, runSchemaOnDB, addBindingAndRedeploy } from '../../utils/d1-manager.js';
import { getSiteSchemaStatements } from '../../utils/site-schema.js';

export async function handleSites(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const siteId = pathParts[2];
  const subResource = pathParts[3];

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

async function getUserSites(env, user) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, category, template_id, logo_url, 
              primary_color, is_active, subscription_plan, subscription_expires_at, created_at,
              custom_domain, domain_status
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();

    const enrichedSites = [];
    for (const site of sites.results) {
      let subscription = { plan: site.subscription_plan || null, status: 'none', billingCycle: null, periodStart: null, periodEnd: null };
      try {
        const sub = await env.DB.prepare(
          `SELECT plan, status, billing_cycle, current_period_start, current_period_end FROM subscriptions WHERE site_id = ? ORDER BY created_at DESC LIMIT 1`
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
      } catch (e) {}
      enrichedSites.push({ ...site, subscription });
    }

    return successResponse(enrichedSites);
  } catch (error) {
    console.error('Get sites error:', error);
    return errorResponse('Failed to fetch sites', 500);
  }
}

async function getSite(env, user, siteId) {
  try {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    const { resolveSiteDB } = await import('../../utils/site-db.js');
    const siteDB = resolveSiteDB(env, site);

    const categories = await siteDB.prepare(
      `SELECT * FROM categories WHERE site_id = ? ORDER BY display_order`
    ).bind(siteId).all();

    return successResponse({ ...site, categories: categories.results });
  } catch (error) {
    console.error('Get site error:', error);
    return errorResponse('Failed to fetch site', 500);
  }
}

function getDefaultFeaturedVideoSettings(businessCategory) {
  const defaults = {
    jewellery: {
      featuredVideoTitle: "Let's Create Your Perfect Bridal Jewelry",
      featuredVideoDescription: "Dreaming of something truly elegant? Discover our exquisite jewelry collection. Connect with our designers and create your perfect bridal ensemble",
      featuredVideoChatButtonText: "CHAT NOW",
    },
    clothing: {
      featuredVideoTitle: "Discover Your Perfect Style",
      featuredVideoDescription: "Explore our latest fashion collection crafted for every occasion. Connect with our stylists and find the perfect outfit that defines you",
      featuredVideoChatButtonText: "CHAT NOW",
    },
    electronics: {
      featuredVideoTitle: "Experience Next-Gen Technology",
      featuredVideoDescription: "Discover cutting-edge gadgets and smart devices. Connect with our tech experts and find the perfect product for your needs",
      featuredVideoChatButtonText: "CHAT NOW",
    },
  };

  return defaults[businessCategory] || {
    featuredVideoTitle: "Discover Our Collection",
    featuredVideoDescription: "Explore our curated selection of premium products. Connect with us and find exactly what you're looking for",
    featuredVideoChatButtonText: "CHAT NOW",
  };
}

function getDefaultProductPolicies(businessCategory) {
  const defaults = {
    jewellery: {
      shippingRegions: 'We ship across India and select international destinations',
      shippingCharges: 'Free shipping on orders above \u20B92,000. Standard shipping \u20B999 for orders below \u20B92,000',
      shippingDeliveryTime: '5-7 business days for domestic orders. 10-15 business days for international orders',
      shippingTracking: 'Real-time tracking via SMS and email once your order is dispatched',
      returnPolicy: '7-day return policy for unused and undamaged items in original packaging. Custom or personalized jewellery is non-returnable',
      returnReplacements: 'Replacements available for damaged or defective items within 48 hours of delivery',
      returnMandatory: 'Original invoice, undamaged packaging, and all product tags must be intact for returns',
      careGuideWashing: 'Avoid contact with water, perfumes, and chemicals. Remove jewellery before bathing or swimming',
      careGuideCleaning: 'Gently wipe with a soft dry cloth after each use. Use a jewellery polishing cloth for shine',
      careGuideMaintenance: 'Store in the provided jewellery box or a soft pouch. Keep pieces separated to avoid scratches',
    },
    clothing: {
      shippingRegions: 'We deliver across India with express and standard shipping options',
      shippingCharges: 'Free shipping on orders above \u20B9999. Standard shipping \u20B979 for orders below \u20B9999',
      shippingDeliveryTime: '3-5 business days for metro cities. 5-7 business days for other locations',
      shippingTracking: 'Track your order in real-time via SMS, email, and WhatsApp updates',
      returnPolicy: '15-day easy return and exchange policy for unused items with original tags attached',
      returnReplacements: 'Size exchanges available subject to stock. Replacements for manufacturing defects',
      returnMandatory: 'Items must be unworn, unwashed, with all original tags and packaging intact',
      careGuideWashing: 'Follow the care label instructions on each garment. Use mild detergent and cold water for delicate fabrics',
      careGuideCleaning: 'Dry clean recommended for embroidered and embellished pieces. Spot clean minor stains gently',
      careGuideMaintenance: 'Store in a cool, dry place away from direct sunlight. Use padded hangers for structured garments',
    },
    electronics: {
      shippingRegions: 'Pan-India delivery available. Select products eligible for international shipping',
      shippingCharges: 'Free shipping on all orders above \u20B91,500. Flat \u20B9149 for smaller orders',
      shippingDeliveryTime: '2-4 business days for metros. 5-7 business days for other pin codes',
      shippingTracking: 'Real-time order tracking via our website, SMS, and email notifications',
      returnPolicy: '7-day replacement policy for manufacturing defects. No return on opened software or accessories',
      returnReplacements: 'Direct replacement for defective units. Manufacturer warranty applies for extended coverage',
      returnMandatory: 'Original packaging, accessories, invoice, and warranty card must be included with returns',
      careGuideWashing: 'Do not expose to water or moisture. Use only manufacturer-approved cleaning solutions',
      careGuideCleaning: 'Wipe surfaces with a soft microfiber cloth. Use compressed air for ports and vents',
      careGuideMaintenance: 'Store in a cool, dry environment. Use surge protectors and avoid overcharging batteries',
    },
  };

  return defaults[businessCategory] || {
    shippingRegions: 'We ship across India and select international destinations',
    shippingCharges: 'Free shipping on orders above \u20B91,500. Standard shipping charges apply for smaller orders',
    shippingDeliveryTime: '5-7 business days for standard delivery. Express delivery available in select cities',
    shippingTracking: 'Real-time tracking updates via SMS and email after dispatch',
    returnPolicy: '7-day return policy for unused items in original packaging with tags intact',
    returnReplacements: 'Replacements available for damaged or defective products within 48 hours of delivery',
    returnMandatory: 'Original packaging, invoice, and product tags must be intact for all returns',
    careGuideWashing: 'Follow the specific care instructions provided with your product',
    careGuideCleaning: 'Clean gently with appropriate materials as recommended for the product type',
    careGuideMaintenance: 'Store in a cool, dry place away from direct sunlight and moisture',
  };
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

    const existingSubdomain = await env.DB.prepare(
      'SELECT id FROM sites WHERE LOWER(subdomain) = ?'
    ).bind(subdomain).first();

    if (existingSubdomain) {
      return errorResponse('This subdomain is already taken. Please choose a different brand name.', 400, 'SUBDOMAIN_TAKEN');
    }

    finalSubdomain = subdomain;
    siteId = generateId();

    const defaultSettings = {
      ...getDefaultFeaturedVideoSettings(category),
      ...getDefaultProductPolicies(category),
    };
    
    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, logo_url, phone, email, address, primary_color, secondary_color, settings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      siteId, 
      user.id, 
      finalSubdomain, 
      sanitizeInput(brandName), 
      category, 
      templateId || 'storefront',
      logoUrl || null,
      phone || null,
      email || null,
      address || null,
      primaryColor || '#000000',
      secondaryColor || '#ffffff',
      JSON.stringify(defaultSettings)
    ).run();

    // Try to create categories but don't fail if it errors
    try {
      if (categories && categories.length > 0) {
        await createUserCategories(env, siteId, categories);
      } else if (category) {
        await createDefaultCategories(env, siteId, category);
      }
    } catch (catError) {
      console.error('Category creation failed, attempting to auto-create table:', catError);
      
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            parent_id TEXT,
            description TEXT,
            subtitle TEXT,
            show_on_home INTEGER DEFAULT 1,
            image_url TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            UNIQUE(site_id, slug)
          )
        `).run();
        
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)').run();

        // Retry creation
        if (categories && categories.length > 0) {
          await createUserCategories(env, siteId, categories);
        } else if (category) {
          await createDefaultCategories(env, siteId, category);
        }
      } catch (retryError) {
        console.error('Retry category creation failed:', retryError);
      }
    }

    let d1DatabaseId = null;
    let d1BindingName = null;

    try {
      const shortId = siteId.substring(0, 8);
      const dbName = `site-${finalSubdomain}-${shortId}`;
      d1BindingName = `SITE_DB_${shortId.toUpperCase()}`;

      const dbResult = await createDatabase(env, dbName);
      d1DatabaseId = dbResult.id;
      console.log(`Created per-site D1 database: ${dbName} (${d1DatabaseId})`);

      const schemaStatements = getSiteSchemaStatements();
      await runSchemaOnDB(env, d1DatabaseId, schemaStatements);
      console.log(`Schema applied to per-site DB: ${dbName}`);

      await env.DB.prepare(
        `UPDATE sites SET d1_database_id = ?, d1_binding_name = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(d1DatabaseId, d1BindingName, siteId).run();

      try {
        await addBindingAndRedeploy(env, siteId, d1DatabaseId, d1BindingName);
        console.log(`Worker redeployed with binding ${d1BindingName}`);
      } catch (redeployErr) {
        console.error('Worker redeploy failed (non-fatal, will use fallback):', redeployErr.message || redeployErr);
      }
    } catch (d1Err) {
      console.error('Per-site D1 creation failed (non-fatal, using platform DB fallback):', d1Err.message || d1Err);
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

    return successResponse({ id: siteId, subdomain: finalSubdomain, d1DatabaseId }, 'Site created successfully');
  } catch (error) {
    console.error('Create site error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('Subdomain already taken', 400, 'SUBDOMAIN_TAKEN');
    }
    return errorResponse('Failed to create site: ' + error.message, 500);
  }
}

async function createDefaultCategories(env, siteId, businessCategory) {
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
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, cat.subtitle || null, cat.showOnHome !== undefined ? cat.showOnHome : 1, order++).run();

    for (const childName of (cat.children || [])) {
      const childId = generateId();
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, '-')}`;
      await env.DB.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, show_on_home, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(childId, siteId, childName, childSlug, parentId, 0, order++).run();
    }
  }
}

async function createUserCategories(env, siteId, categories) {
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
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(catId, siteId, categoryName, slug, subtitle, showOnHome, order++).run();
  }
}

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
    const allowedFields = ['brand_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'phone', 'email', 'address', 'social_links', 'settings'];
    
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            const siteRow = await env.DB.prepare('SELECT settings FROM sites WHERE id = ?').bind(siteId).first();
            if (siteRow && siteRow.settings) {
              existingSettings = JSON.parse(siteRow.settings);
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

    await env.DB.prepare(
      `UPDATE sites SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return successResponse(null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site error:', error);
    return errorResponse('Failed to update site', 500);
  }
}

async function updateSiteAsAdmin(request, env, siteId) {
  try {
    const updates = await request.json();
    const allowedFields = ['brand_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'phone', 'email', 'address', 'social_links', 'settings'];
    
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (dbKey === 'settings' && typeof value === 'object') {
          let existingSettings = {};
          try {
            const site = await env.DB.prepare('SELECT settings FROM sites WHERE id = ?').bind(siteId).first();
            if (site && site.settings) {
              existingSettings = JSON.parse(site.settings);
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

    await env.DB.prepare(
      `UPDATE sites SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...values).run();

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
      'SELECT id, subdomain, d1_database_id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    if (site.d1_database_id) {
      try {
        await deleteDatabase(env, site.d1_database_id);
        console.log(`Deleted per-site D1 database: ${site.d1_database_id}`);
      } catch (d1Err) {
        console.error('Failed to delete per-site D1 database (non-fatal):', d1Err.message || d1Err);
      }
    }

    await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(siteId).run();

    return successResponse({ subdomain: site.subdomain }, 'Site deleted successfully');
  } catch (error) {
    console.error('Delete site error:', error);
    return errorResponse('Failed to delete site', 500);
  }
}

export async function getSiteBySubdomain(env, subdomain) {
  try {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1`
    ).bind(subdomain).first();

    return site;
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

    // --- TXT record check ---
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
        for (const answer of txtData.Answer) {
          const val = (answer.data || '').replace(/"/g, '').trim();
          if (val === expectedToken) {
            txtVerified = true;
            break;
          }
        }
      }
      if (!txtVerified) {
        errors.push(`TXT record _fluxe-verify.${baseDomain} not found or does not match the expected token.`);
      }
    } catch (e) {
      errors.push('Failed to check TXT record: ' + (e.message || 'DNS lookup error'));
    }

    // --- CNAME / A record check ---
    // Cloudflare-proxied domains flatten CNAMEs to A records, so we check
    // both the CNAME answer AND fall back to comparing A records with fluxe.in.
    let cnameVerified = false;
    try {
      const cnameResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const cnameData = await cnameResponse.json();
      if (cnameData.Answer && cnameData.Answer.length > 0) {
        for (const answer of cnameData.Answer) {
          const target = (answer.data || '').replace(/\.$/, '').toLowerCase();
          if (target === 'fluxe.in' || target.endsWith('.fluxe.in')) {
            cnameVerified = true;
            break;
          }
        }
      }

      // Fallback: compare A records — handles Cloudflare-proxied (orange-cloud) domains
      // where CNAME is flattened and only A records are returned.
      if (!cnameVerified) {
        const [domainIPs, fluxeIPs] = await Promise.all([
          resolveDnsA(domain),
          resolveDnsA('fluxe.in'),
        ]);
        if (domainIPs.length > 0 && fluxeIPs.length > 0) {
          cnameVerified = domainIPs.some(ip => fluxeIPs.includes(ip));
        }
      }

      if (!cnameVerified) {
        errors.push(`${domain} does not appear to point to fluxe.in. Please add a CNAME record pointing to fluxe.in.`);
      }
    } catch (e) {
      errors.push('Failed to check DNS records: ' + (e.message || 'DNS lookup error'));
    }

    if (txtVerified && cnameVerified) {
      // Register with Cloudflare for SaaS so SSL is provisioned automatically
      let cfHostnameId = null;
      try {
        const cfResult = await registerCustomHostname(env, domain);
        if (cfResult.success) {
          cfHostnameId = cfResult.cfHostnameId;
        } else if (cfResult.reason !== 'not_configured') {
          console.warn('Cloudflare hostname registration warning:', cfResult.reason);
        }
      } catch (cfErr) {
        console.error('Cloudflare registration failed (non-fatal):', cfErr.message);
      }

      await env.DB.prepare(
        `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(cfHostnameId, siteId).run();

      return successResponse({
        domain_status: 'verified',
        txt_verified: true,
        cname_verified: true,
      }, 'Domain verified successfully! Your custom domain is now active.');
    } else {
      await env.DB.prepare(
        `UPDATE sites SET domain_status = 'failed', updated_at = datetime('now') WHERE id = ?`
      ).bind(siteId).run();

      return successResponse({
        domain_status: 'failed',
        txt_verified: txtVerified,
        cname_verified: cnameVerified,
        errors,
      }, 'Domain verification failed. Please check your DNS records.');
    }
  } catch (error) {
    console.error('Verify domain error:', error);
    return errorResponse('Failed to verify domain: ' + error.message, 500);
  }
}

async function handleRemoveCustomDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      'SELECT id, cf_hostname_id FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    // Remove from Cloudflare for SaaS so SSL certificate is revoked
    if (site.cf_hostname_id) {
      try {
        await deleteCustomHostname(env, site.cf_hostname_id);
      } catch (cfErr) {
        console.error('Cloudflare hostname deletion failed (non-fatal):', cfErr.message);
      }
    }

    await env.DB.prepare(
      `UPDATE sites SET custom_domain = NULL, domain_status = NULL, domain_verification_token = NULL, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();

    return successResponse(null, 'Custom domain removed successfully.');
  } catch (error) {
    console.error('Remove custom domain error:', error);
    return errorResponse('Failed to remove custom domain: ' + error.message, 500);
  }
}
