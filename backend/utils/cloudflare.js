const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function cfHeaders(apiToken) {
  return {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

export async function registerCustomHostname(env, hostname) {
  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;

  if (!token || !zoneId) {
    console.warn('CF_API_TOKEN or CF_ZONE_ID not configured — skipping Cloudflare hostname registration');
    return { success: false, reason: 'not_configured' };
  }

  const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/custom_hostnames`, {
    method: 'POST',
    headers: cfHeaders(token),
    body: JSON.stringify({
      hostname,
      ssl: {
        method: 'http',
        type: 'dv',
        settings: {
          http2: 'on',
          min_tls_version: '1.2',
          tls_1_3: 'on',
        },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.errors?.[0]?.message || 'Unknown Cloudflare API error';
    // hostname already exists — look it up to get its ID
    if (data?.errors?.[0]?.code === 1406) {
      return findCustomHostname(env, hostname);
    }
    console.error('Cloudflare registerCustomHostname error:', errMsg);
    return { success: false, reason: errMsg };
  }

  return { success: true, cfHostnameId: data.result.id };
}

export async function findCustomHostname(env, hostname) {
  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;

  if (!token || !zoneId) return { success: false, reason: 'not_configured' };

  const res = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
    { headers: cfHeaders(token) }
  );

  const data = await res.json();
  if (!res.ok || !data.result?.length) {
    return { success: false, reason: 'not_found' };
  }

  return { success: true, cfHostnameId: data.result[0].id };
}

export async function deleteCustomHostname(env, cfHostnameId) {
  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;

  if (!token || !zoneId) {
    console.warn('CF_API_TOKEN or CF_ZONE_ID not configured — skipping Cloudflare hostname deletion');
    return { success: false, reason: 'not_configured' };
  }

  if (!cfHostnameId) {
    return { success: false, reason: 'no_id' };
  }

  const res = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/custom_hostnames/${cfHostnameId}`,
    { method: 'DELETE', headers: cfHeaders(token) }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg = data?.errors?.[0]?.message || 'Unknown Cloudflare API error';
    console.error('Cloudflare deleteCustomHostname error:', errMsg);
    return { success: false, reason: errMsg };
  }

  return { success: true };
}
