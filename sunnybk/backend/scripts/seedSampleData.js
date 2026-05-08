const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });

// ── helpers ────────────────────────────────────────────────────────────────
const dt = (y, m, d, h = 9, min = 0) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:00+00`;
const date = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Seeding sample data...');

    // ── 1. NEW CUSTOMERS ────────────────────────────────────────────────────
    const custRows = await client.query(`
      INSERT INTO customers (first_name, last_name, email, phone, whatsapp, address_line1, city, postcode, source, customer_code) VALUES
      ('Oliver',   'Bennett',   'basalvivek@gmail.com','07811200001','07811200001','12 Maple Close',      'Leicester',   'LE1 3QP','Phone',          ''),
      ('Sophia',   'Hussain',   'basalvivek@gmail.com','07811200002','07811200002','45 Oak Road',         'Birmingham',  'B15 2TH','Website',         ''),
      ('George',   'Sharma',    'basalvivek@gmail.com','07811200003',NULL,         '8 Birch Avenue',      'Coventry',    'CV1 4RN','Referral',        ''),
      ('Isabella', 'Khan',      'basalvivek@gmail.com','07811200004','07811200004','33 Cedar Street',     'Nottingham',  'NG2 5LP','WhatsApp',        ''),
      ('Harry',    'O Brien',   'basalvivek@gmail.com','07811200005',NULL,         '67 Elm Drive',        'Derby',       'DE1 2WQ','Walk-in',         ''),
      ('Amelia',   'Patel',     'basalvivek@gmail.com','07811200006','07811200006','21 Willow Lane',      'Wolverhampton','WV3 9HK','Phone',          ''),
      ('Jack',     'Robinson',  'basalvivek@gmail.com','07811200007',NULL,         '5 Ash Court',         'Solihull',    'B91 2SN','Website',         ''),
      ('Emily',    'Mahmood',   'basalvivek@gmail.com','07811200008','07811200008','90 Pine Road',        'Stoke',       'ST1 6TT','Referral',        ''),
      ('Thomas',   'Wright',    'basalvivek@gmail.com','07811200009','07811200009','14 Poplar Way',       'Walsall',     'WS1 3FG','Phone',           ''),
      ('Charlotte','Begum',     'basalvivek@gmail.com','07811200010','07811200010','28 Sycamore Close',   'Telford',     'TF1 5HJ','Friend/Family',   '')
      RETURNING id, first_name, last_name`,
    );
    const newCusts = custRows.rows; // IDs 14-23
    console.log(`Added ${newCusts.length} customers`);

    // All customer IDs available
    const cids = {
      james:3, sarah:4, mohammed:5, emma:6, david:7, priya:8, robert:9, fatima:10, chris:11, anita:12,
      oliver:newCusts[0].id, sophia:newCusts[1].id, george:newCusts[2].id, isabella:newCusts[3].id,
      harry:newCusts[4].id, amelia:newCusts[5].id, jack:newCusts[6].id, emily:newCusts[7].id,
      thomas:newCusts[8].id, charlotte:newCusts[9].id,
    };
    // Employee IDs
    const e = { admin:1, raj:4, sophie:5, daniel:6, aisha:7, tom:8, carlos:9, steve:10, liam:11, preet:12, nina:13 };

    // ── 2. ENQUIRIES ────────────────────────────────────────────────────────
    // 30 enquiries spread Dec 2025 – May 2026 with varied statuses
    const enquiryData = [
      // Dec 2025
      [cids.oliver,   e.sophie, 'Bedroom',         'Phone',    'Normal','High',  4500,  'Converted to Order', dt(2025,12,3)],
      [cids.sophia,   e.daniel, 'Kitchen',         'Website',  'High',  'Normal',8000,  'Converted to Order', dt(2025,12,8)],
      [cids.george,   e.raj,    'Fitted Wardrobe', 'Referral', 'Normal','Normal',3200,  'Converted to Order', dt(2025,12,15)],
      [cids.james,    e.sophie, 'Sliding Wardrobe','Phone',    'Normal','High',  5500,  'Confirmed',          dt(2025,12,18)],
      [cids.sarah,    e.daniel, 'Home Office',     'Website',  'Low',   'Normal',2800,  'Converted to Order', dt(2025,12,22)],
      // Jan 2026
      [cids.isabella, e.raj,    'Kitchen',         'WhatsApp', 'High',  'High',  12000, 'Converted to Order', dt(2026,1,5)],
      [cids.harry,    e.sophie, 'Bedroom',         'Phone',    'Normal','Normal',5000,  'Converted to Order', dt(2026,1,9)],
      [cids.amelia,   e.daniel, 'Loft Room',       'Phone',    'Normal','High',  7500,  'Converted to Order', dt(2026,1,14)],
      [cids.emma,     e.raj,    'Fitted Wardrobe', 'Walk-in',  'Normal','Normal',3800,  'Quote Sent',         dt(2026,1,18)],
      [cids.mohammed, e.sophie, 'Bedroom',         'Referral', 'Low',   'Normal',4200,  'Confirmed',          dt(2026,1,23)],
      [cids.david,    e.daniel, 'Kitchen',         'Website',  'High',  'High',  9500,  'Converted to Order', dt(2026,1,28)],
      // Feb 2026
      [cids.jack,     e.raj,    'Sliding Wardrobe','Phone',    'Normal','Normal',4000,  'Converted to Order', dt(2026,2,4)],
      [cids.emily,    e.sophie, 'Home Office',     'WhatsApp', 'Normal','High',  6500,  'Converted to Order', dt(2026,2,10)],
      [cids.priya,    e.daniel, 'Bedroom',         'Website',  'Normal','Normal',5200,  'Visit Done',         dt(2026,2,14)],
      [cids.robert,   e.raj,    'Kitchen',         'Phone',    'High',  'High',  11000, 'Visit Done',         dt(2026,2,19)],
      [cids.thomas,   e.sophie, 'Fitted Wardrobe', 'Referral', 'Normal','Normal',3500,  'Converted to Order', dt(2026,2,24)],
      // Mar 2026
      [cids.charlotte,e.daniel, 'Loft Room',       'Phone',    'Normal','High',  8200,  'Converted to Order', dt(2026,3,3)],
      [cids.fatima,   e.raj,    'Bedroom',         'WhatsApp', 'Normal','Normal',4800,  'Quote Sent',         dt(2026,3,7)],
      [cids.chris,    e.sophie, 'Commercial',      'Website',  'High',  'High',  16000, 'Converted to Order', dt(2026,3,12)],
      [cids.anita,    e.daniel, 'Kitchen',         'Phone',    'Normal','Normal',7000,  'In Progress',        dt(2026,3,17)],
      [cids.oliver,   e.raj,    'Sliding Wardrobe','Referral', 'Low',   'Normal',3000,  'Hold',               dt(2026,3,21)],
      [cids.sophia,   e.sophie, 'Home Office',     'Website',  'Normal','High',  5800,  'In Progress',        dt(2026,3,26)],
      // Apr 2026
      [cids.george,   e.daniel, 'Bedroom',         'Phone',    'Normal','Normal',4500,  'New',                dt(2026,4,2)],
      [cids.isabella, e.raj,    'Kitchen',         'WhatsApp', 'High',  'High',  9800,  'Visit Scheduled',    dt(2026,4,8)],
      [cids.harry,    e.sophie, 'Fitted Wardrobe', 'Walk-in',  'Normal','Normal',3600,  'New',                dt(2026,4,14)],
      [cids.amelia,   e.daniel, 'Loft Room',       'Phone',    'Normal','High',  8500,  'In Progress',        dt(2026,4,20)],
      [cids.jack,     e.raj,    'Bedroom',         'Website',  'Low',   'Normal',2500,  'Cancelled',          dt(2026,4,25)],
      // May 2026
      [cids.emily,    e.sophie, 'Kitchen',         'Phone',    'High',  'High',  11500, 'New',                dt(2026,5,2)],
      [cids.thomas,   e.daniel, 'Sliding Wardrobe','WhatsApp', 'Normal','Normal',4200,  'New',                dt(2026,5,5)],
      [cids.charlotte,e.raj,    'Home Office',     'Website',  'Normal','High',  6200,  'New',                dt(2026,5,7)],
    ];

    const enqIds = [];
    for (const [cid, assignTo, product, channel, priority, source, budget, status, createdAt] of enquiryData) {
      const r = await client.query(
        `INSERT INTO enquiries (customer_id,assigned_to,created_by,product_interest,channel,priority,budget_estimate,status,description,enquiry_code,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'',CAST($10 AS TIMESTAMPTZ)) RETURNING id`,
        [cid, assignTo, assignTo, product, channel, priority, budget, status, `${product} - customer contacted via ${channel}`, createdAt]);
      enqIds.push(r.rows[0].id);
    }
    console.log(`Added ${enqIds.length} enquiries`);

    // ── 3. VISITS ────────────────────────────────────────────────────────────
    // enqIds[0..4] = Dec, [5..10] = Jan, [11..15] = Feb, [16..21] = Mar, [22..26] = Apr
    const visitData = [
      // Completed visits (historical)
      [enqIds[0],  cids.oliver,   e.carlos, date(2025,12,10),'09:00',90,'Survey',      'Completed',  'Measurements taken, good access'],
      [enqIds[1],  cids.sophia,   e.steve,  date(2025,12,16),'10:30',60,'Survey',      'Completed',  'Kitchen layout discussed'],
      [enqIds[2],  cids.george,   e.liam,   date(2025,12,19),'14:00',60,'Measurement', 'Completed',  'Wardrobe dimensions confirmed'],
      [enqIds[4],  cids.sarah,    e.preet,  date(2025,12,29),'09:30',90,'Survey',      'Completed',  'Home office requirements noted'],
      [enqIds[5],  cids.isabella, e.carlos, date(2026,1,12), '11:00',120,'Survey',     'Completed',  'Full kitchen survey, detailed measurements'],
      [enqIds[6],  cids.harry,    e.steve,  date(2026,1,16), '09:00',90,'Survey',      'Completed',  'Bedroom survey completed'],
      [enqIds[7],  cids.amelia,   e.liam,   date(2026,1,20), '10:00',90,'Survey',      'Completed',  'Loft conversion survey done'],
      [enqIds[10], cids.david,    e.preet,  date(2026,1,31), '14:30',60,'Survey',      'Completed',  'Kitchen survey, noted utility positions'],
      [enqIds[11], cids.jack,     e.carlos, date(2026,2,10), '09:00',60,'Measurement', 'Completed',  'Precise measurements taken'],
      [enqIds[12], cids.emily,    e.steve,  date(2026,2,17), '11:00',90,'Survey',      'Completed',  'Office requirements discussed'],
      [enqIds[14], cids.robert,   e.liam,   date(2026,2,24), '10:00',120,'Survey',     'Completed',  'Large kitchen, complex requirements'],
      [enqIds[15], cids.thomas,   e.preet,  date(2026,3,1),  '09:30',60,'Measurement', 'Completed',  'Wardrobe fit confirmed'],
      [enqIds[16], cids.charlotte,e.carlos, date(2026,3,8),  '11:00',90,'Survey',      'Completed',  'Loft measurements, access confirmed'],
      [enqIds[18], cids.chris,    e.steve,  date(2026,3,17), '09:00',120,'Survey',     'Completed',  'Commercial space measured'],
      // Installation visits (completed)
      [enqIds[0],  cids.oliver,   e.liam,   date(2026,2,5),  '08:00',480,'Installation','Completed', 'Bedroom installation completed'],
      [enqIds[1],  cids.sophia,   e.preet,  date(2026,2,18), '08:00',480,'Installation','Completed', 'Kitchen fully fitted'],
      [enqIds[7],  cids.amelia,   e.carlos, date(2026,3,25), '08:00',360,'Installation','Completed', 'Loft room conversion done'],
      // Upcoming/scheduled
      [enqIds[23], cids.isabella, e.carlos, date(2026,5,15), '10:00',90,'Survey',      'Scheduled',  'Kitchen survey scheduled'],
      [enqIds[25], cids.amelia,   e.steve,  date(2026,5,22), '09:30',90,'Survey',      'Scheduled',  'Loft survey booked'],
      // Cancelled
      [enqIds[26], cids.jack,     e.liam,   date(2026,5,5),  '11:00',60,'Survey',      'Cancelled',  'Customer cancelled'],
    ];

    const visIds = [];
    for (const [enqId, custId, engId, sDate, sTime, dur, vType, vstatus, notes] of visitData) {
      const r = await client.query(
        `INSERT INTO visits (enquiry_id,customer_id,engineer_id,scheduled_date,scheduled_time,duration_minutes,visit_type,status,notes,created_by,visit_code,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'',NOW()) RETURNING id`,
        [enqId, custId, engId, sDate, sTime, dur, vType, vstatus, notes]);
      visIds.push(r.rows[0].id);
    }
    console.log(`Added ${visIds.length} visits`);

    // Update enquiry statuses for visit done
    await client.query(`UPDATE enquiries SET status='Visit Done' WHERE id IN ($1,$2)`, [enqIds[13], enqIds[14]]);

    // ── 4. ORDERS ────────────────────────────────────────────────────────────
    // Enquiries converted: [0,1,2,4,5,6,7,10,11,12,15,16,18] = indices with "Converted to Order"
    const orderData = [
      // [enqIdx, custId, assignTo, total, deposit, status, depPaid, depPaidDate, depDue, balPaid, balPaidDate, balDue, installDate, createdAt]
      [enqIds[0], cids.oliver,   e.raj,    4500,  2250, 'Completed',            true, date(2025,12,20), date(2025,12,20), true, date(2026,2,10), date(2026,1,30), date(2026,2,5),  dt(2025,12,12)],
      [enqIds[1], cids.sophia,   e.sophie, 8200,  4100, 'Completed',            true, date(2025,12,28), date(2025,12,28), true, date(2026,2,20), date(2026,2,10), date(2026,2,18), dt(2025,12,18)],
      [enqIds[2], cids.george,   e.daniel, 3200,  1600, 'Completed',            true, date(2026,1,3),  date(2026,1,3),   true, date(2026,3,5),  date(2026,2,28), date(2026,3,1),  dt(2025,12,22)],
      [enqIds[4], cids.sarah,    e.raj,    2800,  1400, 'Completed',            true, date(2026,1,10), date(2026,1,10),  true, date(2026,3,15), date(2026,3,10), date(2026,3,12), dt(2025,12,28)],
      [enqIds[5], cids.isabella, e.sophie, 12500, 6250, 'Installed',            true, date(2026,1,18), date(2026,1,15),  false,null,            date(2026,5,20), date(2026,4,25), dt(2026,1,8)],
      [enqIds[6], cids.harry,    e.daniel, 5200,  2600, 'In Production',        true, date(2026,2,5),  date(2026,2,1),   false,null,            date(2026,5,15), date(2026,5,20), dt(2026,1,12)],
      [enqIds[7], cids.amelia,   e.raj,    7800,  3900, 'Ready to Install',     true, date(2026,2,10), date(2026,2,8),   false,null,            date(2026,5,1),  date(2026,5,10), dt(2026,1,16)],
      [enqIds[10],cids.david,    e.sophie, 9800,  4900, 'In Production',        true, date(2026,2,15), date(2026,2,10),  false,null,            date(2026,5,30), date(2026,6,1),  dt(2026,2,2)],
      [enqIds[11],cids.jack,     e.daniel, 4100,  2050, 'Deposit Paid',         true, date(2026,2,22), date(2026,2,20),  false,null,            date(2026,5,10), date(2026,5,25), dt(2026,2,8)],
      [enqIds[12],cids.emily,    e.raj,    6800,  3400, 'Installation Scheduled',true,date(2026,3,5),  date(2026,3,1),   false,null,            date(2026,4,30), date(2026,5,12), dt(2026,2,12)],
      [enqIds[15],cids.thomas,   e.sophie, 3600,  1800, 'Confirmed',            false,null,            date(2026,4,1),   false,null,            date(2026,5,15), date(2026,5,20), dt(2026,2,26)],
      [enqIds[16],cids.charlotte,e.daniel, 8500,  4250, 'Ready to Install',     true, date(2026,3,18), date(2026,3,15),  false,null,            date(2026,5,28), date(2026,6,5),  dt(2026,3,6)],
      [enqIds[18],cids.chris,    e.raj,    16500, 8250, 'In Production',        true, date(2026,4,2),  date(2026,3,25),  false,null,            date(2026,6,30), date(2026,7,1),  dt(2026,3,15)],
    ];

    const ordIds = [];
    for (const [enqId,custId,assignTo,total,dep,status,depPaid,depPaidDate,depDue,balPaid,balPaidDate,balDue,installDate,createdAt] of orderData) {
      const r = await client.query(
        `INSERT INTO orders (enquiry_id,customer_id,assigned_to,total_amount,deposit_amount,status,
          deposit_paid,deposit_paid_date,deposit_due_date,balance_paid,balance_paid_date,balance_due_date,
          expected_install_date,notes,created_by,order_code,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Order placed',1,'',CAST($14 AS TIMESTAMPTZ)) RETURNING id`,
        [enqId,custId,assignTo,total,dep,status,depPaid,depPaidDate||null,depDue||null,balPaid,balPaidDate||null,balDue||null,installDate||null,createdAt]);
      ordIds.push(r.rows[0].id);
      // Add order log
      await client.query(
        `INSERT INTO order_logs (order_id,logged_by,notes,status_changed_to,log_date) VALUES ($1,1,'Order created from enquiry',$2,CAST($3 AS TIMESTAMPTZ))`,
        [r.rows[0].id, status, createdAt]);
      // Update enquiry to converted
      await client.query(`UPDATE enquiries SET status='Converted to Order' WHERE id=$1`, [enqId]);
    }
    console.log(`Added ${ordIds.length} orders`);

    // ── 5. PAYMENTS ──────────────────────────────────────────────────────────
    // Full deposits and balance payments for completed orders + some partial installments
    const payData = [
      // ORD idx 0 (Completed): deposit + balance full
      [ordIds[0], 'deposit', 2250, date(2025,12,20), 'Full deposit - bank transfer', e.sophie],
      [ordIds[0], 'balance', 2250, date(2026,2,10),  'Balance paid in full', e.sophie],
      // ORD idx 1 (Completed)
      [ordIds[1], 'deposit', 4100, date(2025,12,28), 'Deposit received - card', e.daniel],
      [ordIds[1], 'balance', 4100, date(2026,2,20),  'Final balance paid', e.daniel],
      // ORD idx 2 (Completed)
      [ordIds[2], 'deposit', 1600, date(2026,1,3),   'Deposit paid', e.raj],
      [ordIds[2], 'balance', 1600, date(2026,3,5),   'Balance paid', e.raj],
      // ORD idx 3 (Completed)
      [ordIds[3], 'deposit', 1400, date(2026,1,10),  'Deposit received', e.sophie],
      [ordIds[3], 'balance', 1400, date(2026,3,15),  'Final payment received', e.sophie],
      // ORD idx 4 (Installed) - deposit paid, balance in 3 installments (partially paid)
      [ordIds[4], 'deposit', 6250, date(2026,1,18),  'Full deposit bank transfer', e.daniel],
      [ordIds[4], 'balance', 2000, date(2026,3,15),  'First balance instalment', e.daniel],
      [ordIds[4], 'balance', 2000, date(2026,4,20),  'Second balance instalment', e.daniel],
      // ORD idx 5 (In Production) - deposit + first balance instalment
      [ordIds[5], 'deposit', 2600, date(2026,2,5),   'Deposit paid - bank transfer', e.raj],
      [ordIds[5], 'balance', 1000, date(2026,4,1),   'Partial balance - first instalment', e.raj],
      // ORD idx 6 (Ready to Install) - deposit paid, balance installments
      [ordIds[6], 'deposit', 3900, date(2026,2,10),  'Deposit cleared', e.sophie],
      [ordIds[6], 'balance', 1300, date(2026,3,20),  'Balance instalment 1', e.sophie],
      [ordIds[6], 'balance', 1300, date(2026,4,25),  'Balance instalment 2', e.sophie],
      // ORD idx 7 (In Production) - deposit paid only
      [ordIds[7], 'deposit', 4900, date(2026,2,15),  'Deposit received', e.daniel],
      // ORD idx 8 (Deposit Paid)
      [ordIds[8], 'deposit', 2050, date(2026,2,22),  'Full deposit paid', e.raj],
      // ORD idx 9 (Installation Scheduled) - deposit paid
      [ordIds[9], 'deposit', 3400, date(2026,3,5),   'Deposit bank transfer', e.sophie],
      // ORD idx 10 (Confirmed) - NO payments yet, deposit OVERDUE
      // ORD idx 11 (Ready to Install) - deposit paid
      [ordIds[11], 'deposit', 4250, date(2026,3,18), 'Deposit cleared', e.daniel],
      // ORD idx 12 (In Production) - deposit paid
      [ordIds[12], 'deposit', 8250, date(2026,4,2),  'Deposit received - large commercial order', e.raj],
    ];

    for (const [ordId, pType, amount, pDate, notes, loggedBy] of payData) {
      await client.query(
        `INSERT INTO order_payments (order_id,payment_type,amount,payment_date,notes,recorded_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [ordId, pType, amount, pDate, notes, loggedBy]);
    }
    console.log(`Added ${payData.length} payment records`);

    // ── 6. ORDER LOGS for status progression ────────────────────────────────
    const statusLogs = [
      [ordIds[5], 'Status updated: In Production', 'In Production', dt(2026,3,15)],
      [ordIds[6], 'Status updated: Ready to Install', 'Ready to Install', dt(2026,4,20)],
      [ordIds[7], 'Status updated: In Production', 'In Production', dt(2026,3,10)],
      [ordIds[9], 'Status updated: Installation Scheduled', 'Installation Scheduled', dt(2026,4,10)],
      [ordIds[11], 'Status updated: Ready to Install', 'Ready to Install', dt(2026,4,25)],
      [ordIds[12], 'Status updated: In Production', 'In Production', dt(2026,4,15)],
      [ordIds[4], 'Installation completed', 'Installed', dt(2026,4,26)],
    ];
    for (const [ordId, note, status, logDate] of statusLogs) {
      await client.query(`INSERT INTO order_logs (order_id,logged_by,notes,status_changed_to,log_date) VALUES ($1,1,$2,$3,CAST($4 AS TIMESTAMPTZ))`, [ordId, note, status, logDate]);
    }

    // ── 7. ENQUIRY LOGS for status history ──────────────────────────────────
    await client.query(`
      INSERT INTO enquiry_logs (enquiry_id,logged_by,channel,notes,status_changed_to,log_date) VALUES
      ($1,4,'Phone','Customer confirmed budget and requirements. Moving forward.','Confirmed',CAST('2026-01-22 10:00:00+00' AS TIMESTAMPTZ)),
      ($2,5,'Email','Quote sent, awaiting decision.','Quote Sent',CAST('2026-01-25 14:00:00+00' AS TIMESTAMPTZ)),
      ($3,6,'Phone','On hold - customer renovating another room first.','Hold',CAST('2026-03-22 11:00:00+00' AS TIMESTAMPTZ)),
      ($4,4,'WhatsApp','Customer in progress, site visit scheduled.','In Progress',CAST('2026-03-28 09:00:00+00' AS TIMESTAMPTZ)),
      ($5,5,'Phone','Customer confirmed, proceeding.','Confirmed',CAST('2026-01-25 10:00:00+00' AS TIMESTAMPTZ)),
      ($6,6,'Email','Customer requested quote.','Quote Sent',CAST('2026-03-10 14:00:00+00' AS TIMESTAMPTZ)),
      ($7,4,'Phone','Follow up done, in progress.','In Progress',CAST('2026-03-28 10:00:00+00' AS TIMESTAMPTZ))`,
      [enqIds[3], enqIds[8], enqIds[20], enqIds[21], enqIds[9], enqIds[17], enqIds[25]]);

    await client.query('COMMIT');
    console.log('\n✅ Sample data seeded successfully!');
    console.log(`   Customers: ${newCusts.length} added`);
    console.log(`   Enquiries: ${enqIds.length} added`);
    console.log(`   Visits:    ${visIds.length} added`);
    console.log(`   Orders:    ${ordIds.length} added`);
    console.log(`   Payments:  ${payData.length} records`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
