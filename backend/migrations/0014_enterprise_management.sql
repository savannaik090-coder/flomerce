CREATE TABLE IF NOT EXISTS enterprise_sites (
    site_id TEXT PRIMARY KEY,
    assigned_at TEXT DEFAULT (datetime('now')),
    assigned_by TEXT,
    notes TEXT,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_usage_monthly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL,
    year_month TEXT NOT NULL,
    d1_overage_bytes INTEGER DEFAULT 0,
    r2_overage_bytes INTEGER DEFAULT 0,
    d1_cost_inr REAL DEFAULT 0,
    r2_cost_inr REAL DEFAULT 0,
    total_cost_inr REAL DEFAULT 0,
    status TEXT DEFAULT 'unpaid',
    paid_at TEXT,
    notes TEXT,
    snapshot_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE(site_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_usage_site ON enterprise_usage_monthly(site_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_usage_month ON enterprise_usage_monthly(year_month);
