-- Organisation Settings — run once against sunnybk_crm
-- psql -U postgres -d sunnybk_crm -f backend/db/migration_org_settings.sql

CREATE TABLE IF NOT EXISTS organisation_settings (
  id               SERIAL PRIMARY KEY,
  org_name         VARCHAR(200) NOT NULL DEFAULT 'Sunny Bedrooms & Kitchens',
  tagline          VARCHAR(200)          DEFAULT 'CRM System',
  address          TEXT,
  phone            VARCHAR(50),
  email            VARCHAR(200),
  website          VARCHAR(200),
  logo_data        TEXT,   -- base64 data URL, e.g. "data:image/png;base64,..."
  currency         VARCHAR(10)           DEFAULT 'GBP',
  currency_symbol  VARCHAR(5)            DEFAULT '£',
  updated_at       TIMESTAMPTZ NOT NULL  DEFAULT NOW()
);

-- Seed one default row so GET always returns data
INSERT INTO organisation_settings (id, org_name, tagline, currency, currency_symbol)
VALUES (1, 'Sunny Bedrooms & Kitchens', 'CRM System', 'GBP', '£')
ON CONFLICT (id) DO NOTHING;
