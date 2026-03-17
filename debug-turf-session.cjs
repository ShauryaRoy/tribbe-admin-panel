const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // 1. Find event
    const eventParams = ["%Turf Session + Run%"];
    const eventRes = await pool.query(`SELECT id, title, ticket_price FROM events WHERE title ILIKE $1`, eventParams);

    if (eventRes.rows.length === 0) {
      console.log("Event not found.");
      return;
    }

    const event = eventRes.rows[0];
    console.log(`Found Event: ${event.title} (ID: ${event.id})`);
    console.log(`Ticket Price: ${event.ticket_price}`);

    const eventId = event.id;

    // 2. Get RSVPs
    // specific to checked in status or just generic 'GOING'
    const rsvpRes = await pool.query(`
        SELECT r.user_id, r.status, u.email, u.first_name, u.last_name
        FROM event_rsvps r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.event_id = $1
    `, [eventId]);

    console.log(`\nTotal RSVPs: ${rsvpRes.rows.length}`);
    const rsvpList = rsvpRes.rows.map(r => ({
        user_id: r.user_id,
        email: r.email,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        status: r.status
    }));
    console.table(rsvpList);

    // 3. Get Transactions
    const allTxnRes = await pool.query(`
        SELECT id, user_id, email, amount, status, created_at, razorpay_payment_id
        FROM payment_transactions
        WHERE event_id = $1
    `, [eventId]);

    console.log(`\nTotal Transactions: ${allTxnRes.rows.length}`);
    const txnList = allTxnRes.rows.map(t => ({
        id: t.id,
        user_id: t.user_id,
        email: t.email,
        amount: t.amount,
        status: t.status,
        date: t.created_at
    }));
    console.table(txnList);

    // 4. Analysis
    const successfulTxns = allTxnRes.rows.filter(t => t.status === 'captured' || t.status === 'paid' || t.status === 'SUCCESS');
    const paidUserIds = new Set(successfulTxns.map(t => t.user_id));
    
    console.log('\n--- Discrepancy Analysis ---');
    console.log(`Successful transactions: ${successfulTxns.length}`);
    console.log(`RSVPs: ${rsvpRes.rows.length}`);

    rsvpRes.rows.forEach(rsvp => {
        const hasPayment = successfulTxns.some(t => t.user_id === rsvp.user_id);
        if (!hasPayment) {
            console.log(`WARNING: User ${rsvp.email} (${rsvp.user_id}) has RSVP status '${rsvp.status}' but NO successful payment transaction.`);
        }
    });

    console.log('\n--- Reverse Check (Payment but no RSVP) ---');
    successfulTxns.forEach(txn => {
        const hasRsvp = rsvpRes.rows.some(r => r.user_id === txn.user_id);
        if (!hasRsvp) {
            console.log(`WARNING: Transaction ${txn.id} for User ${txn.email} exists, but NO RSVP found.`);
        }
    });

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
