const pool = require('../db');

const DEFAULT_SETTINGS = {
  org_name: 'Sunny Bedrooms & Kitchens',
  tagline: 'CRM System',
  currency: 'GBP',
  currency_symbol: '£',
  logo_data: null,
  address: null,
  phone: null,
  email: null,
  website: null,
};

const getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organisation_settings WHERE id = 1');
    res.json({ success: true, data: result.rows[0] || DEFAULT_SETTINGS });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { org_name, tagline, address, phone, email, website, logo_data, currency, currency_symbol } = req.body;
    if (!org_name || !org_name.trim()) return res.status(400).json({ success: false, message: 'Organisation name is required' });

    const result = await pool.query(`
      INSERT INTO organisation_settings (id, org_name, tagline, address, phone, email, website, logo_data, currency, currency_symbol, updated_at)
      VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT (id) DO UPDATE SET
        org_name = EXCLUDED.org_name, tagline = EXCLUDED.tagline,
        address = EXCLUDED.address, phone = EXCLUDED.phone,
        email = EXCLUDED.email, website = EXCLUDED.website,
        logo_data = EXCLUDED.logo_data,
        currency = EXCLUDED.currency, currency_symbol = EXCLUDED.currency_symbol,
        updated_at = NOW()
      RETURNING *`,
      [org_name.trim(), tagline || null, address || null, phone || null,
       email || null, website || null, logo_data || null,
       currency || 'GBP', currency_symbol || '£']);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSettings, updateSettings };
