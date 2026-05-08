import React, { useState, useEffect } from 'react';
import { updateOrgSettings } from '../api';
import { useOrg } from '../context/OrgContext';

const MAX_LOGO_BYTES = 512 * 1024; // 512 KB

const toForm = (org) => ({
  org_name:        org.org_name        || '',
  tagline:         org.tagline         || '',
  address:         org.address         || '',
  phone:           org.phone           || '',
  email:           org.email           || '',
  website:         org.website         || '',
  currency:        org.currency        || 'GBP',
  currency_symbol: org.currency_symbol || '£',
  logo_data:       org.logo_data       || null,
});

export default function OrgSettings() {
  const { org, setOrg } = useOrg();
  const [form, setForm]       = useState(toForm(org));
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  // Populate form once the org context finishes loading from API
  useEffect(() => { setForm(toForm(org)); }, [org]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSuccess(false); setError(''); };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file (PNG, JPG, SVG, etc.)'); return; }
    if (file.size > MAX_LOGO_BYTES) { setError(`Logo must be under 512 KB (selected: ${Math.round(file.size / 1024)} KB)`); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => set('logo_data', ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.org_name.trim()) { setError('Organisation name is required'); return; }
    setSaving(true); setError(''); setSuccess(false);
    try {
      const res = await updateOrgSettings(form);
      setOrg(res.data.data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Organisation Settings</h1>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* Left — details */}
          <div>
            <div className="card">
              <div className="card-title">Organisation Details</div>

              {error   && <div className="error-msg">{error}</div>}
              {success && (
                <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: 7, fontSize: 13, marginBottom: 16 }}>
                  Settings saved — sidebar and reports will now show the updated details.
                </div>
              )}

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Organisation Name *</label>
                  <input className="input" value={form.org_name} onChange={e => set('org_name', e.target.value)} placeholder="Sunny Bedrooms & Kitchens" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tagline / Subtitle</label>
                  <input className="input" value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="CRM System" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="02085792777" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@sunnybk.com" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://sunnybk.com" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <textarea className="textarea" rows={3} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Unit 5, Business Park, London, SW1A 1AA" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Currency</label>
                  <select className="select" value={form.currency} onChange={e => set('currency', e.target.value)}>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="AED">AED — UAE Dirham</option>
                  </select>
                </div>
                <div className="form-group" style={{ maxWidth: 120 }}>
                  <label>Symbol</label>
                  <input className="input" value={form.currency_symbol} onChange={e => set('currency_symbol', e.target.value)} placeholder="£" maxLength={5} />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Right — logo */}
          <div className="card">
            <div className="card-title">Organisation Logo</div>
            <p style={{ fontSize: 12, color: '#7a8a9a', marginBottom: 14 }}>
              Displayed in the sidebar and on reports. PNG, JPG or SVG, max 512 KB.
            </p>

            <div style={{
              width: '100%', minHeight: 120, border: '2px dashed #d8dce5', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14, background: '#f8f9fb', overflow: 'hidden',
            }}>
              {form.logo_data ? (
                <img src={form.logo_data} alt="Logo preview"
                  style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', padding: 8 }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#9aa0b0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                  <div style={{ fontSize: 12 }}>No logo uploaded</div>
                </div>
              )}
            </div>

            <label className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', marginBottom: 8 }}>
              📁 Choose Image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </label>

            {form.logo_data && (
              <button type="button" className="btn btn-danger-sm" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => set('logo_data', null)}>
                Remove Logo
              </button>
            )}
          </div>

        </div>
      </form>
    </div>
  );
}
