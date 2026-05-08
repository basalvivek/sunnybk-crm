// ── Base layout ─────────────────────────────────────────────────────────────

function base(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2332;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">

    <div style="background:#1a2332;padding:22px 32px;display:flex;align-items:center;">
      <div>
        <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;">Sunny Bedrooms &amp; Kitchens</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;letter-spacing:2px;text-transform:uppercase;">CRM Notification</div>
      </div>
    </div>

    <div style="padding:32px 32px 24px;">
      ${bodyHtml}
    </div>

    <div style="padding:16px 32px;background:#f8f9fb;border-top:1px solid #eef0f3;">
      <p style="margin:0;font-size:11px;color:#9aa0b0;line-height:1.5;">
        This is an automated notification from Sunny BK CRM. Please do not reply to this email.<br>
        &copy; ${new Date().getFullYear()} Sunny Bedrooms &amp; Kitchens
      </p>
    </div>

  </div>
</body>
</html>`;
}

function row(label, value) {
  if (!value) return '';
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:#7a8a9a;font-weight:600;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:7px 0;font-size:13px;color:#1a2332;vertical-align:top;">${value}</td>
  </tr>`;
}

function table(rows) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`;
}

function badge(text, color = '#1a5c8a') {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${color}22;color:${color};">${text}</span>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #eef0f3;margin:20px 0;">`;
}

function btn(text, href) {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:11px 22px;background:#1a5c8a;color:#fff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;">${text}</a>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

function newEnquiry({ enquiry, customer }) {
  const subject = `New Enquiry: ${enquiry.enquiry_code} — ${customer.first_name} ${customer.last_name}`;
  const html = base(subject, `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a2332;">New Enquiry Received</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#7a8a9a;">A new enquiry has been logged in the CRM.</p>

    <div style="background:#f0f7ff;border-left:4px solid #1a5c8a;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:18px;font-weight:700;color:#1a5c8a;">${enquiry.enquiry_code}</div>
      <div style="font-size:13px;color:#4a6a8a;margin-top:2px;">${enquiry.product_interest || 'Product TBC'} · ${enquiry.channel}</div>
    </div>

    <strong style="font-size:13px;color:#1a2332;">Customer Details</strong>
    ${table(
      row('Name', `${customer.first_name} ${customer.last_name}`) +
      row('Phone', customer.phone) +
      row('Email', customer.email) +
      row('Postcode', customer.postcode) +
      row('Source', customer.source)
    )}

    ${divider()}

    <strong style="font-size:13px;color:#1a2332;">Enquiry Details</strong>
    ${table(
      row('Product', enquiry.product_interest) +
      row('Priority', enquiry.priority) +
      row('Budget', enquiry.budget_estimate ? `£${Number(enquiry.budget_estimate).toLocaleString()}` : '') +
      row('Assigned To', enquiry.assigned_to_name || 'Unassigned') +
      row('Notes', enquiry.description)
    )}
  `);
  return { subject, html };
}

function enquiryStatusUpdate({ enquiry, customer, newStatus, notes }) {
  const statusColors = {
    'Confirmed': '#065f46', 'Converted to Order': '#065f46',
    'Cancelled': '#991b1b', 'Hold': '#6b7280',
    'Visit Scheduled': '#6d28d9', 'Quote Sent': '#0e7490',
    'In Progress': '#b45309',
  };
  const color = statusColors[newStatus] || '#1a5c8a';

  const subject = `Update on Your Enquiry — ${enquiry.enquiry_code}`;
  const html = base(subject, `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a2332;">Enquiry Update</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#7a8a9a;">Dear ${customer.first_name}, here's an update on your enquiry.</p>

    <div style="background:#f8f9fb;border-radius:8px;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#7a8a9a;margin-bottom:6px;">${enquiry.enquiry_code} · ${enquiry.product_interest || ''}</div>
      <div style="font-size:14px;font-weight:600;color:#4a5a6a;margin-bottom:8px;">Status updated to:</div>
      ${badge(newStatus, color)}
    </div>

    ${notes ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:20px;font-size:13px;color:#4a5a6a;line-height:1.6;">${notes}</div>` : ''}

    <p style="font-size:13px;color:#6a7a8a;line-height:1.6;">
      If you have any questions, please don't hesitate to call us. We're happy to help!
    </p>
  `);
  return { subject, html };
}

function visitScheduled({ visit, customer, engineer }) {
  const dateStr = new Date(visit.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = visit.scheduled_time ? visit.scheduled_time.slice(0, 5) : 'To be confirmed';

  const subject = `Visit Confirmed — ${dateStr}`;
  const html = base(subject, `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a2332;">Visit Confirmed</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#7a8a9a;">Dear ${customer.first_name}, your visit has been booked.</p>

    <div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:700;color:#065f46;">${dateStr}</div>
      <div style="font-size:15px;color:#047857;margin-top:4px;">⏰ ${timeStr}${visit.duration_minutes ? ` · ${visit.duration_minutes} minutes` : ''}</div>
    </div>

    ${table(
      row('Visit Type', visit.visit_type) +
      row('Engineer', engineer?.first_name ? `${engineer.first_name} ${engineer.last_name}` : 'To be confirmed') +
      row('Engineer Phone', engineer?.phone || '') +
      row('Reference', visit.visit_code)
    )}

    ${divider()}

    <strong style="font-size:13px;color:#1a2332;">Your Address</strong>
    ${table(
      row('Address', [customer.address_line1, customer.address_line2, customer.city].filter(Boolean).join(', ')) +
      row('Postcode', customer.postcode)
    )}

    ${visit.notes ? `<div style="background:#f0f7ff;border-radius:6px;padding:12px 16px;margin-top:16px;font-size:13px;color:#4a5a6a;line-height:1.6;"><strong>Notes:</strong> ${visit.notes}</div>` : ''}

    <p style="font-size:13px;color:#6a7a8a;margin-top:20px;line-height:1.6;">
      Please ensure someone is home at the scheduled time. If you need to reschedule, please contact us as soon as possible.
    </p>
  `);
  return { subject, html };
}

function visitAssignedToEngineer({ visit, customer, engineer, enquiry }) {
  const dateStr = new Date(visit.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = visit.scheduled_time ? visit.scheduled_time.slice(0, 5) : 'TBC';

  const subject = `New Visit Assigned — ${dateStr} · ${customer.last_name}`;
  const html = base(subject, `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a2332;">New Visit Assigned</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#7a8a9a;">Hi ${engineer.first_name}, you have a new visit scheduled.</p>

    <div style="background:#f0f7ff;border-left:4px solid #1a5c8a;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:20px;font-weight:700;color:#1a5c8a;">${dateStr}</div>
      <div style="font-size:14px;color:#1a5c8a;margin-top:4px;">⏰ ${timeStr}${visit.duration_minutes ? ` · ${visit.duration_minutes} min` : ''}</div>
    </div>

    <strong style="font-size:13px;color:#1a2332;">Customer &amp; Address</strong>
    ${table(
      row('Customer', `${customer.first_name} ${customer.last_name}`) +
      row('Phone', customer.phone) +
      row('Address', [customer.address_line1, customer.address_line2, customer.city].filter(Boolean).join(', ')) +
      row('Postcode', `<strong style="font-size:15px;">${customer.postcode || '—'}</strong>`)
    )}

    ${divider()}

    <strong style="font-size:13px;color:#1a2332;">Job Details</strong>
    ${table(
      row('Visit Type', visit.visit_type) +
      row('Product', enquiry?.product_interest || '') +
      row('Visit Ref', visit.visit_code) +
      row('Enquiry Ref', enquiry?.enquiry_code || '') +
      row('Notes', visit.notes || enquiry?.description || '')
    )}
  `);
  return { subject, html };
}

function visitRescheduled({ visit, customer, engineer, oldDate, reason }) {
  const newDateStr = new Date(visit.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = visit.scheduled_time ? visit.scheduled_time.slice(0, 5) : 'To be confirmed';

  const subject = `Your Visit Has Been Rescheduled — ${newDateStr}`;
  const html = base(subject, `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a2332;">Visit Rescheduled</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#7a8a9a;">Dear ${customer.first_name}, your visit has been rescheduled.</p>

    ${oldDate ? `<div style="background:#fff7ed;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:12px;font-size:13px;color:#92400e;">Previous date: ${new Date(oldDate).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</div>` : ''}

    <div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#047857;font-weight:600;margin-bottom:4px;">New Date</div>
      <div style="font-size:20px;font-weight:700;color:#065f46;">${newDateStr}</div>
      <div style="font-size:14px;color:#047857;margin-top:4px;">⏰ ${timeStr}</div>
    </div>

    ${table(
      row('Engineer', engineer?.first_name ? `${engineer.first_name} ${engineer.last_name}` : 'To be confirmed') +
      row('Reference', visit.visit_code)
    )}

    ${reason ? `<div style="background:#f8f9fb;border-radius:6px;padding:12px 16px;margin-top:8px;font-size:13px;color:#4a5a6a;"><strong>Reason:</strong> ${reason}</div>` : ''}
  `);
  return { subject, html };
}

function visitCompleted({ visit, customer, enquiry }) {
  const dateStr = new Date(visit.scheduled_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const subject = `Visit Completed — ${visit.visit_code} · ${customer.last_name}`;
  const html = base(subject, `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a2332;">Visit Completed</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#7a8a9a;">The following visit has been marked as completed.</p>

    ${table(
      row('Visit', visit.visit_code) +
      row('Date', dateStr) +
      row('Customer', `${customer.first_name} ${customer.last_name}`) +
      row('Phone', customer.phone) +
      row('Postcode', customer.postcode) +
      row('Product', enquiry?.product_interest || '') +
      row('Enquiry', enquiry?.enquiry_code || '') +
      row('Notes', visit.notes || '')
    )}

    <p style="font-size:13px;color:#6a7a8a;margin-top:16px;">The enquiry status has been updated to <strong>Visit Done</strong>. Next step: send a quote.</p>
  `);
  return { subject, html };
}

function orderCreated({ order, customer, enquiry }) {
  const subject = `New Order: ${order.order_code} — ${customer.first_name} ${customer.last_name}`;
  const html = base(subject, `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a2332;">New Order Created</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#7a8a9a;">An enquiry has been converted to an order.</p>

    <div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:20px;font-weight:700;color:#065f46;">${order.order_code}</div>
      <div style="font-size:13px;color:#047857;margin-top:2px;">From ${enquiry.enquiry_code} · ${enquiry.product_interest || ''}</div>
    </div>

    <strong style="font-size:13px;color:#1a2332;">Customer</strong>
    ${table(
      row('Name', `${customer.first_name} ${customer.last_name}`) +
      row('Phone', customer.phone) +
      row('Postcode', customer.postcode)
    )}

    ${divider()}

    <strong style="font-size:13px;color:#1a2332;">Financials</strong>
    ${table(
      row('Total Amount',   order.total_amount   ? `£${Number(order.total_amount).toLocaleString()}`   : 'TBC') +
      row('Deposit',        order.deposit_amount ? `£${Number(order.deposit_amount).toLocaleString()}` : 'TBC') +
      row('Expected Install', order.expected_install_date ? new Date(order.expected_install_date).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : 'TBC')
    )}
  `);
  return { subject, html };
}

module.exports = { newEnquiry, enquiryStatusUpdate, visitScheduled, visitAssignedToEngineer, visitRescheduled, visitCompleted, orderCreated };
