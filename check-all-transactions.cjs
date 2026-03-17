const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkTransactions() {
  try {
    // Check all transactions for event 301
    const all = await pool.query(`
      SELECT id, event_id, amount/100 as amount_rupees, 
             platform_fee/100 as fee_rupees, 
             host_share/100 as host_share_rupees, 
             status, refunded_at
      FROM payment_transactions 
      WHERE event_id=301
      ORDER BY id DESC
    `);
    
    console.log('\n=== ALL TRANSACTIONS FOR EVENT 301 ===');
    console.log(JSON.stringify(all.rows, null, 2));
    
    // Summary by status
    const summary = await pool.query(`
      SELECT 
        status,
        refunded_at IS NOT NULL as is_refunded,
        COUNT(*) as count,
        SUM(amount)/100 as total_amount,
        SUM(host_share)/100 as total_host_share
      FROM payment_transactions 
      WHERE event_id=301
      GROUP BY status, refunded_at IS NOT NULL
      ORDER BY status
    `);
    
    console.log('\n=== SUMMARY BY STATUS ===');
    console.log(JSON.stringify(summary.rows, null, 2));
    
    // Check event RSVPs
    const rsvps = await pool.query(`
      SELECT COUNT(*) as rsvp_count
      FROM event_rsvps
      WHERE event_id=301 AND status='GOING'
    `);
    
    console.log('\n=== EVENT RSVPs (GOING) ===');
    console.log(`Count: ${rsvps.rows[0].rsvp_count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactions();
