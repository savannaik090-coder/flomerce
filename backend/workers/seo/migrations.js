export async function ensureSEOColumns(env) {
  const alterStatements = [
    `ALTER TABLE sites ADD COLUMN seo_title TEXT`,
    `ALTER TABLE sites ADD COLUMN seo_description TEXT`,
    `ALTER TABLE sites ADD COLUMN seo_og_image TEXT`,
    `ALTER TABLE sites ADD COLUMN seo_robots TEXT DEFAULT 'index, follow'`,
    `ALTER TABLE sites ADD COLUMN google_verification TEXT`,

    `ALTER TABLE sites ADD COLUMN og_title TEXT`,
    `ALTER TABLE sites ADD COLUMN og_description TEXT`,
    `ALTER TABLE sites ADD COLUMN og_image TEXT`,
    `ALTER TABLE sites ADD COLUMN og_type TEXT DEFAULT 'website'`,
    `ALTER TABLE sites ADD COLUMN twitter_card TEXT DEFAULT 'summary_large_image'`,
    `ALTER TABLE sites ADD COLUMN twitter_title TEXT`,
    `ALTER TABLE sites ADD COLUMN twitter_description TEXT`,
    `ALTER TABLE sites ADD COLUMN twitter_image TEXT`,
    `ALTER TABLE sites ADD COLUMN twitter_site TEXT`,

    `ALTER TABLE categories ADD COLUMN seo_title TEXT`,
    `ALTER TABLE categories ADD COLUMN seo_description TEXT`,
    `ALTER TABLE categories ADD COLUMN seo_og_image TEXT`,

    `ALTER TABLE products ADD COLUMN seo_title TEXT`,
    `ALTER TABLE products ADD COLUMN seo_description TEXT`,
    `ALTER TABLE products ADD COLUMN seo_og_image TEXT`,
  ];

  for (const sql of alterStatements) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
    }
  }

  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS page_seo (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        page_type TEXT NOT NULL,
        seo_title TEXT,
        seo_description TEXT,
        seo_og_image TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, page_type)
      )
    `).run();
  } catch {
  }

  try {
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_page_seo_site ON page_seo(site_id)'
    ).run();
  } catch {
  }
}
