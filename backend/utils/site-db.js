export function resolveSiteDB(env, site) {
  if (!site) return env.DB;

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

  return env.DB;
}

export async function resolveSiteDBById(env, siteId) {
  if (!siteId) return env.DB;

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
    console.error('resolveSiteDBById error (falling back to platform DB):', e.message || e);
  }

  return env.DB;
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

export async function resolveSiteDBBySubdomain(env, subdomain) {
  if (!subdomain) return env.DB;

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
    console.error('resolveSiteDBBySubdomain error (falling back to platform DB):', e.message || e);
  }

  return env.DB;
}
