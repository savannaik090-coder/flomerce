export function resolveSiteDB(env, site) {
  if (!site) return env.DB;

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
      'SELECT d1_database_id, d1_binding_name FROM sites WHERE id = ?'
    ).bind(siteId).first();

    if (site && site.d1_binding_name && env[site.d1_binding_name]) {
      return env[site.d1_binding_name];
    }
  } catch (e) {
    console.error('resolveSiteDBById error (falling back to platform DB):', e.message || e);
  }

  return env.DB;
}

export async function resolveSiteDBBySubdomain(env, subdomain) {
  if (!subdomain) return env.DB;

  try {
    const site = await env.DB.prepare(
      'SELECT id, d1_database_id, d1_binding_name FROM sites WHERE LOWER(subdomain) = LOWER(?)'
    ).bind(subdomain).first();

    if (site && site.d1_binding_name && env[site.d1_binding_name]) {
      return env[site.d1_binding_name];
    }
  } catch (e) {
    console.error('resolveSiteDBBySubdomain error (falling back to platform DB):', e.message || e);
  }

  return env.DB;
}
