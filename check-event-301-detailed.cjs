const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkEvent301Details() {
  try {
    console.log('\n=== EVENT 301: 3k run + Turf Drills ===\n');
    
    // Get all transactions
    const allTxns = await pool.query(`
      SELECT 
        id,
        user_id,
        amount / 100 as amount_rupees,
        platform_fee / 100 as fee_rupees,
        host_share / 100 as host_share_rupees,
        status,
        refunded_at,
        created_at
      FROM payment_transactions
      WHERE event_id = 301
      ORDER BY id
    `);
    
    console.log('ALL TRANSACTIONS:');
    console.log(JSON.stringify(allTxns.rows, null, 2));
    
    // Summary
    const captured = allTxns.rows.filter(t => t.status === 'captured' && !t.refunded_at);
    const created = allTxns.rows.filter(t => t.status === 'created');
    const refunded = allTxns.rows.filter(t => t.refunded_at || t.status === 'refunded');
    
    console.log('\n=== SUMMARY ===');
    console.log(`Captured (paid): ${captured.length} tickets`);
    console.log(`  Total: ₹${captured.reduce((sum, t) => sum + parseFloat(t.host_share_rupees), 0)}`);
    console.log(`Created (pending): ${created.length} tickets`);
    console.log(`Refunded: ${refunded.length} tickets`);
    console.log(`\nTotal transactions: ${allTxns.rows.length}`);
    
    // Check if there are exactly 10 captured
    if (captured.length !== 10) {
      console.log(`\n⚠️ Database shows ${captured.length} captured payments, not 10!`);
    }
    
    // Check for RSVPs
    const rsvps = await pool.query(`
      SELECT COUNT(*) as count
      FROM event_rsvps
      WHERE event_id = 301 AND status = 'going'
    `);
    console.log(`\nRSVPs (going): ${rsvps.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEvent301Details();
