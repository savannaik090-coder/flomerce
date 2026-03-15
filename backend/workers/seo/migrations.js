export async function ensureSEOColumns(env) {
  const alterStatements = [
    `ALTER TABLE sites ADD COLUMN seo_title TEXT`,
    `ALTER TABLE sites ADD COLUMN seo_description TEXT`,
    `ALTER TABLE sites ADD COLUMN seo_og_image TEXT`,
    `ALTER TABLE sites ADD COLUMN seo_robots TEXT DEFAULT 'index, follow'`,
    `ALTER TABLE sites ADD COLUMN google_verification TEXT`,

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
      // Column likely already exists — safe to ignore
    }
  }
}
