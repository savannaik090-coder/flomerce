const _migratedDBs = new Set();
const _subcatMigratedDBs = new Set();

export async function ensureProductOptionsColumn(db, cacheKey) {
  const key = cacheKey || 'default';
  if (_migratedDBs.has(key)) return;
  try {
    const cols = await db.prepare("PRAGMA table_info(products)").all();
    const hasOptions = cols.results?.some(c => c.name === 'options');
    if (!hasOptions) {
      await db.prepare("ALTER TABLE products ADD COLUMN options TEXT").run();
    }
    _migratedDBs.add(key);
  } catch (e) {
    console.error('ensureProductOptionsColumn error:', e.message || e);
  }
}

export async function ensureProductSubcategoryColumn(db, cacheKey) {
  const key = cacheKey || 'default';
  if (_subcatMigratedDBs.has(key)) return;
  try {
    const cols = await db.prepare("PRAGMA table_info(products)").all();
    const hasSubcat = cols.results?.some(c => c.name === 'subcategory_id');
    if (!hasSubcat) {
      await db.prepare("ALTER TABLE products ADD COLUMN subcategory_id TEXT REFERENCES categories(id) ON DELETE SET NULL").run();
    }
    _subcatMigratedDBs.add(key);
  } catch (e) {
    console.error('ensureProductSubcategoryColumn error:', e.message || e);
  }
}

export function resolveSiteDB(env, site) {
  if (!site) {
    throw new Error('resolveSiteDB: site object is required');
  }

  if (site.shard_id) {
    try {
      const bindingName = site._shard_binding_name;
      if (bindingName && env[bindingName]) {
        return env[bindingName];
      }
    } catch (e) {
      console.error('resolveSiteDB shard lookup error:', e.message || e);
    }
  }

  const bindingName = site.d1_binding_name;
  if (bindingName && env[bindingName]) {
    return env[bindingName];
  }

  throw new Error(`resolveSiteDB: No shard assigned for site ${site.id || 'unknown'}. Every site must have a shard_id.`);
}

export async function resolveSiteDBById(env, siteId) {
  if (!siteId) {
    throw new Error('resolveSiteDBById: siteId is required');
  }

  try {
    const site = await env.DB.prepare(
      `SELECT s.shard_id, s.d1_binding_name, sh.binding_name as shard_binding
       FROM sites s
       LEFT JOIN shards sh ON s.shard_id = sh.id
       WHERE s.id = ?`
    ).bind(siteId).first();

    if (site) {
      if (site.shard_binding && env[site.shard_binding]) {
        return env[site.shard_binding];
      }
      if (site.d1_binding_name && env[site.d1_binding_name]) {
        return env[site.d1_binding_name];
      }
    }
  } catch (e) {
    console.error('resolveSiteDBById error:', e.message || e);
  }

  throw new Error(`resolveSiteDBById: No shard assigned for site ${siteId}. Every site must have a shard_id.`);
}

export async function checkMigrationLock(env, siteId) {
  if (!siteId) return false;
  try {
    const site = await env.DB.prepare(
      'SELECT migration_locked FROM sites WHERE id = ?'
    ).bind(siteId).first();
    return !!(site && site.migration_locked);
  } catch (e) {
    return false;
  }
}

export async function getSiteConfig(env, siteId) {
  if (!siteId) return {};
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    const config = await siteDB.prepare(
      'SELECT * FROM site_config WHERE site_id = ?'
    ).bind(siteId).first();
    return config || {};
  } catch (e) {
    console.error('getSiteConfig error:', e.message || e);
    return {};
  }
}

export async function getSiteWithConfig(env, siteRow) {
  if (!siteRow || !siteRow.id) return siteRow;
  const config = await getSiteConfig(env, siteRow.id);
  const { site_id, ...configData } = config;
  return { ...siteRow, ...configData };
}

export async function resolveSiteDBBySubdomain(env, subdomain) {
  if (!subdomain) {
    throw new Error('resolveSiteDBBySubdomain: subdomain is required');
  }

  try {
    const site = await env.DB.prepare(
      `SELECT s.id, s.shard_id, s.d1_binding_name, sh.binding_name as shard_binding
       FROM sites s
       LEFT JOIN shards sh ON s.shard_id = sh.id
       WHERE LOWER(s.subdomain) = LOWER(?)`
    ).bind(subdomain).first();

    if (site) {
      if (site.shard_binding && env[site.shard_binding]) {
        return env[site.shard_binding];
      }
      if (site.d1_binding_name && env[site.d1_binding_name]) {
        return env[site.d1_binding_name];
      }
    }
  } catch (e) {
    console.error('resolveSiteDBBySubdomain error:', e.message || e);
  }

  throw new Error(`resolveSiteDBBySubdomain: No shard assigned for subdomain "${subdomain}". Every site must have a shard_id.`);
}
