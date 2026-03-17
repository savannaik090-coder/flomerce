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
  ];

  for (const sql of alterStatements) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
    }
  }
}
