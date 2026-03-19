import { resolveSiteDBById } from '../../utils/site-db.js';
import { jsonResponse, errorResponse, corsHeaders } from '../../utils/helpers.js';

function parseUserAgent(ua) {
  if (!ua) return { device: 'unknown', browser: 'unknown' };

  let device = 'desktop';
  if (/tablet|ipad/i.test(ua)) device = 'tablet';
  else if (/mobile|android|iphone|ipod/i.test(ua)) device = 'mobile';

  let browser = 'other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { device, browser };
}

function parseReferrerSource(referrer) {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (/google\./i.test(host)) return 'Google';
    if (/bing\./i.test(host)) return 'Bing';
    if (/yahoo\./i.test(host)) return 'Yahoo';
    if (/instagram\.com/i.test(host)) return 'Instagram';
    if (/facebook\.com|fb\.com/i.test(host)) return 'Facebook';
    if (/twitter\.com|x\.com/i.test(host)) return 'Twitter';
    if (/youtube\.com/i.test(host)) return 'YouTube';
    if (/whatsapp/i.test(host)) return 'WhatsApp';
    if (/pinterest/i.test(host)) return 'Pinterest';
    if (/linkedin/i.test(host)) return 'LinkedIn';
    if (/t\.co/i.test(host)) return 'Twitter';
    return host;
  } catch {
    return 'direct';
  }
}

async function ensurePageViewsTable(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      referrer TEXT,
      country TEXT,
      device_type TEXT,
      browser TEXT,
      visitor_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_page_views_site ON page_views(site_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(site_id, created_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(site_id, visitor_id)').run();
  } catch (e) {}
}

export async function handleAnalytics(request, env, path) {
  const url = new URL(request.url);
  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  if (action === 'track' && request.method === 'POST') {
    return handleTrack(request, env);
  }

  if (action === 'stats' && request.method === 'GET') {
    return handleStats(request, env, url);
  }

  return errorResponse('Not found', 404);
}

async function handleTrack(request, env) {
  try {
    const body = await request.json();
    const { siteId, pagePath, referrer, visitorId } = body;

    if (!siteId || !pagePath) {
      return jsonResponse({ ok: true });
    }

    const ua = request.headers.get('user-agent') || '';
    const { device, browser } = parseUserAgent(ua);
    const country = request.headers.get('cf-ipcountry') || request.headers.get('CF-IPCountry') || '';

    const db = await resolveSiteDBById(env, siteId);
    await ensurePageViewsTable(db);

    await db.prepare(
      `INSERT INTO page_views (site_id, page_path, referrer, country, device_type, browser, visitor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(siteId, pagePath, referrer || '', country, device, browser, visitorId || '').run();

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('Analytics track error:', e.message || e);
    return jsonResponse({ ok: true });
  }
}

async function handleStats(request, env, url) {
  const siteId = url.searchParams.get('siteId');
  const period = url.searchParams.get('period') || '7days';

  if (!siteId) {
    return errorResponse('siteId required', 400);
  }

  try {
    const db = await resolveSiteDBById(env, siteId);
    await ensurePageViewsTable(db);

    let dateFilter;
    if (period === '7days') {
      dateFilter = "datetime('now', '-7 days')";
    } else if (period === '30days') {
      dateFilter = "datetime('now', '-30 days')";
    } else {
      dateFilter = "datetime('now', '-365 days')";
    }

    const totalViews = await db.prepare(
      `SELECT COUNT(*) as count FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}`
    ).bind(siteId).first();

    const uniqueVisitors = await db.prepare(
      `SELECT COUNT(DISTINCT visitor_id) as count FROM page_views WHERE site_id = ? AND visitor_id != '' AND created_at >= ${dateFilter}`
    ).bind(siteId).first();

    const bounceQuery = await db.prepare(
      `SELECT 
        COUNT(DISTINCT visitor_id) as total_sessions,
        SUM(CASE WHEN page_count = 1 THEN 1 ELSE 0 END) as single_page_sessions
       FROM (
         SELECT visitor_id, COUNT(*) as page_count 
         FROM page_views 
         WHERE site_id = ? AND visitor_id != '' AND created_at >= ${dateFilter}
         GROUP BY visitor_id
       )`
    ).bind(siteId).first();

    const totalSessions = bounceQuery?.total_sessions || 0;
    const singlePageSessions = bounceQuery?.single_page_sessions || 0;
    const bounceRate = totalSessions > 0 ? Math.round((singlePageSessions / totalSessions) * 100) : 0;

    let trendQuery;
    if (period === '7days') {
      trendQuery = await db.prepare(
        `SELECT DATE(created_at) as date_label, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
         FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
         GROUP BY DATE(created_at) ORDER BY date_label`
      ).bind(siteId).all();
    } else if (period === '30days') {
      trendQuery = await db.prepare(
        `SELECT DATE(created_at) as date_label, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
         FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
         GROUP BY DATE(created_at) ORDER BY date_label`
      ).bind(siteId).all();
    } else {
      trendQuery = await db.prepare(
        `SELECT strftime('%Y-%m', created_at) as date_label, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
         FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
         GROUP BY strftime('%Y-%m', created_at) ORDER BY date_label`
      ).bind(siteId).all();
    }

    const sourcesQuery = await db.prepare(
      `SELECT referrer, COUNT(*) as count FROM page_views 
       WHERE site_id = ? AND created_at >= ${dateFilter}
       GROUP BY referrer ORDER BY count DESC LIMIT 10`
    ).bind(siteId).all();

    const sources = (sourcesQuery.results || []).map(r => ({
      name: parseReferrerSource(r.referrer),
      count: r.count,
    }));

    const mergedSources = {};
    for (const s of sources) {
      if (mergedSources[s.name]) {
        mergedSources[s.name] += s.count;
      } else {
        mergedSources[s.name] = s.count;
      }
    }
    const totalSourceCount = Object.values(mergedSources).reduce((a, b) => a + b, 0) || 1;
    const sourcesList = Object.entries(mergedSources)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name: name === 'direct' ? 'Direct' : name,
        count,
        pct: Math.round((count / totalSourceCount) * 100),
      }));

    const devicesQuery = await db.prepare(
      `SELECT device_type, COUNT(*) as count FROM page_views 
       WHERE site_id = ? AND created_at >= ${dateFilter}
       GROUP BY device_type ORDER BY count DESC`
    ).bind(siteId).all();

    const totalDevices = (devicesQuery.results || []).reduce((a, r) => a + r.count, 0) || 1;
    const devicesList = (devicesQuery.results || []).map(r => ({
      name: (r.device_type || 'unknown').charAt(0).toUpperCase() + (r.device_type || 'unknown').slice(1),
      count: r.count,
      pct: Math.round((r.count / totalDevices) * 100),
    }));

    const countriesQuery = await db.prepare(
      `SELECT country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors 
       FROM page_views 
       WHERE site_id = ? AND country != '' AND created_at >= ${dateFilter}
       GROUP BY country ORDER BY count DESC LIMIT 10`
    ).bind(siteId).all();

    const totalCountryVisitors = (countriesQuery.results || []).reduce((a, r) => a + r.visitors, 0) || 1;
    const countriesList = (countriesQuery.results || []).map(r => ({
      code: r.country,
      visitors: r.visitors,
      pct: Math.round((r.visitors / totalCountryVisitors) * 100),
    }));

    const topPagesQuery = await db.prepare(
      `SELECT page_path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
       FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
       GROUP BY page_path ORDER BY views DESC LIMIT 10`
    ).bind(siteId).all();

    return jsonResponse({
      stats: {
        pageViews: totalViews?.count || 0,
        visitors: uniqueVisitors?.count || 0,
        bounceRate,
      },
      trends: trendQuery.results || [],
      sources: sourcesList,
      devices: devicesList,
      countries: countriesList,
      topPages: topPagesQuery.results || [],
    });
  } catch (e) {
    console.error('Analytics stats error:', e.message || e);
    return jsonResponse({
      stats: { pageViews: 0, visitors: 0, bounceRate: 0 },
      trends: [],
      sources: [],
      devices: [],
      countries: [],
      topPages: [],
    });
  }
}
