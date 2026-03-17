const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function findEvent() {
  try {
    // Find events with ~10 captured payments
    const events = await pool.query(`
      SELECT 
        pt.event_id,
        e.title,
        COUNT(*) FILTER (WHERE pt.status = 'captured' AND pt.refunded_at IS NULL) as captured_count,
        SUM(pt.amount) FILTER (WHERE pt.status = 'captured' AND pt.refunded_at IS NULL) / 100 as total_amount,
        SUM(pt.host_share) FILTER (WHERE pt.status = 'captured' AND pt.refunded_at IS NULL) / 100 as total_host_share
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      GROUP BY pt.event_id, e.title
      HAVING COUNT(*) FILTER (WHERE pt.status = 'captured' AND pt.refunded_at IS NULL) >= 8
      ORDER BY pt.event_id DESC
      LIMIT 5
    `);
    
    console.log('\n=== EVENTS WITH 8+ CAPTURED PAYMENTS ===\n');
    console.log(JSON.stringify(events.rows, null, 2));
    
    // Now check the specific transactions for each
    for (const evt of events.rows) {
      if (evt.captured_count >= 9) {
        console.log(`\n=== DETAILED TRANSACTIONS FOR EVENT ${evt.event_id} (${evt.title}) ===`);
        const txns = await pool.query(`
          SELECT 
            id,
            amount / 100 as amount,
            platform_fee / 100 as platform_fee,
            host_share / 100 as host_share,
            status,
            refunded_at
          FROM payment_transactions
          WHERE event_id = $1
          ORDER BY id
        `, [evt.event_id]);
        console.log(JSON.stringify(txns.rows, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findEvent();
