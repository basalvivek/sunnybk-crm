const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD === 'your_app_password') return null;
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  return _transporter;
}

async function sendEmail({ to, subject, html }) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] Not configured — skipped: "${subject}" → ${to}`);
    return;
  }
  try {
    await t.sendMail({ from: `"Sunny BK CRM" <${process.env.GMAIL_USER}>`, to, subject, html });
    console.log(`[Email] Sent: "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[Email] Failed: "${subject}" → ${to} — ${err.message}`);
  }
}

// Fire-and-forget wrapper — never blocks the API response
function sendEmailAsync(opts) {
  sendEmail(opts).catch(() => {});
}

const ADMIN_EMAIL = () => process.env.GMAIL_USER;

module.exports = { sendEmail, sendEmailAsync, ADMIN_EMAIL };
