const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkHostTransactions() {
  try {
    const hostId = '102544632828289793490';
    console.log(`\n=== CHECKING HOST: Birupakshya Mishra (${hostId}) ===\n`);
    
    // Get all events for this host
    const events = await pool.query(`
      SELECT id, title, datetime 
      FROM events 
      WHERE host_id = $1
    `, [hostId]);
    
    console.log('EVENTS HOSTED:');
    console.log(JSON.stringify(events.rows, null, 2));

    const eventIds = events.rows.map(e => e.id);
    
    // Get ALL transactions for these events
    if (eventIds.length > 0) {
      const txns = await pool.query(`
        SELECT 
          pt.id,
          pt.event_id,
          e.title,
          pt.status, 
          pt.amount / 100 as amount,
          pt.host_share / 100 as host_share,
          pt.refunded_at,
          pt.created_at,
          pt.razorpay_payment_id
        FROM payment_transactions pt
        JOIN events e ON pt.event_id = e.id
        WHERE pt.event_id = ANY($1::int[])
        ORDER BY pt.event_id, pt.created_at
      `, [eventIds]);

      console.log('\nALL TRANSACTIONS FOR THIS HOST:');
      console.log(JSON.stringify(txns.rows, null, 2));

      // Group by status
      const summary = txns.rows.reduce((acc, t) => {
        const key = `${t.event_id}-${t.status}${t.refunded_at ? '-refunded' : ''}`;
        if (!acc[key]) acc[key] = { count: 0, total: 0, host_share: 0 };
        acc[key].count++;
        acc[key].total += parseFloat(t.amount);
        acc[key].host_share += parseFloat(t.host_share);
        return acc;
      }, {});

      console.log('\nSUMMARY BY STATUS:');
      console.log(JSON.stringify(summary, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkHostTransactions();
