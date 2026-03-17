const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function testHostEarnings() {
  try {
    // Simulate the exact query from getHostEarnings
    const earnings = await pool.query(`
      SELECT 
        e.host_id,
        SUM(pt.host_share) as total_revenue_paise,
        SUM(pt.host_share) as host_share_paise,
        COUNT(*) as tickets_sold
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      WHERE 
        pt.status = 'captured'
        AND pt.refunded_at IS NULL
        AND e.id = 301
      GROUP BY e.host_id
    `);
    
    console.log('\n=== HOST EARNINGS CALCULATION ===');
    const row = earnings.rows[0];
    if (row) {
      console.log('Host ID:', row.host_id);
      console.log('Tickets Sold:', row.tickets_sold);
      console.log('Total Revenue:', (Number(row.total_revenue_paise) / 100).toFixed(2), 'INR');
      console.log('Host Earnings:', (Number(row.host_share_paise) / 100).toFixed(2), 'INR');
    } else {
      console.log('No data found');
    }
    
    // Also check "created" status
    const pending = await pool.query(`
      SELECT COUNT(*) as pending_count
      FROM payment_transactions
      WHERE event_id = 301 AND status = 'created'
    `);
    console.log('\nPending (created) transactions:', pending.rows[0].pending_count);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testHostEarnings();
