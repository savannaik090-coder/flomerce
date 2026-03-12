import { generateId, generateSubdomain, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin } from '../storefront/site-admin-worker.js';

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
              primary_color, is_active, subscription_plan, created_at,
              custom_domain, domain_status
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();

    return successResponse(sites.results);
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

    const categories = await env.DB.prepare(
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

    const defaultSettings = getDefaultFeaturedVideoSettings(category);
    
    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, logo_url, phone, email, address, primary_color, secondary_color, settings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      siteId, 
      user.id, 
      finalSubdomain, 
      sanitizeInput(brandName), 
      category, 
      templateId || 'template1',
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

    return successResponse({ id: siteId, subdomain: finalSubdomain }, 'Site created successfully');
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
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, '-')}`;
      await env.DB.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, show_on_home, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), siteId, childName, childSlug, parentId, 0, order++).run();
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
    
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), siteId, categoryName, slug, subtitle, showOnHome, order++).run();
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
      'SELECT id, subdomain FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();

    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
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

    const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ?').bind(siteId).first();
    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    const token = generateId().replace(/-/g, '');

    await env.DB.prepare(
      `UPDATE sites SET custom_domain = ?, domain_status = 'pending', domain_verification_token = ?, updated_at = datetime('now') WHERE id = ?`
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
          if (target === 'fluxe.in') {
            cnameVerified = true;
            break;
          }
        }
      }
      if (!cnameVerified) {
        errors.push(`CNAME record for ${domain} not found or does not point to fluxe.in.`);
      }
    } catch (e) {
      errors.push('Failed to check CNAME record: ' + (e.message || 'DNS lookup error'));
    }

    if (txtVerified && cnameVerified) {
      await env.DB.prepare(
        `UPDATE sites SET domain_status = 'verified', updated_at = datetime('now') WHERE id = ?`
      ).bind(siteId).run();

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
    const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ?').bind(siteId).first();
    if (!site) {
      return errorResponse('Site not found', 404, 'NOT_FOUND');
    }

    await env.DB.prepare(
      `UPDATE sites SET custom_domain = NULL, domain_status = NULL, domain_verification_token = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();

    return successResponse(null, 'Custom domain removed successfully.');
  } catch (error) {
    console.error('Remove custom domain error:', error);
    return errorResponse('Failed to remove custom domain: ' + error.message, 500);
  }
}
