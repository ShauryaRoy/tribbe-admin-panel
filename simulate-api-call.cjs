const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function simulateAPICall() {
  try {
    console.log('\n=== SIMULATING getHostEarnings() API CALL ===\n');
    
    // Simulate the exact query with no date filters (all time)
    const result = await pool.query(`
      SELECT 
        e.host_id,
        SUM(pt.host_share) as total_revenue,
        SUM(pt.host_share) as host_share,
        COUNT(*) as tickets_sold
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      WHERE 
        pt.status = 'captured'
        AND (pt.refunded_at IS NULL OR pt.refunded_at IS NULL)
      GROUP BY e.host_id
    `);
    
    console.log('Raw results from database:');
    result.rows.forEach(row => {
      console.log(`\nHost ID: ${row.host_id}`);
      console.log(`  Tickets Sold: ${row.tickets_sold}`);
      console.log(`  Total Revenue: ₹${(Number(row.total_revenue) / 100).toFixed(2)}`);
      console.log(`  Host Earnings: ₹${(Number(row.host_share) / 100).toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

simulateAPICall();
