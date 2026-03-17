const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function breakdownByEvent() {
  try {
    const result = await pool.query(`
      SELECT 
        e.id as event_id,
        e.title,
        e.host_id,
        COUNT(*) as tickets_sold,
        SUM(pt.amount) / 100 as total_amount,
        SUM(pt.host_share) / 100 as host_earnings
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      WHERE 
        pt.status = 'captured'
        AND pt.refunded_at IS NULL
        AND e.host_id = '102544632828289793490'
      GROUP BY e.id, e.title, e.host_id
      ORDER BY e.id
    `);
    
    console.log('\n=== HOST EARNINGS BY EVENT (Host: 102544632828289793490) ===\n');
    result.rows.forEach(row => {
      console.log(`Event ${row.event_id}: ${row.title}`);
      console.log(`  Tickets Sold: ${row.tickets_sold}`);
      console.log(`  Total Amount: ₹${row.total_amount}`);
      console.log(`  Host Earnings: ₹${row.host_earnings}`);
      console.log('');
    });
    
    const total = result.rows.reduce((sum, row) => sum + parseInt(row.tickets_sold), 0);
    const totalEarnings = result.rows.reduce((sum, row) => sum + parseFloat(row.host_earnings), 0);
    console.log(`TOTAL: ${total} tickets, ₹${totalEarnings.toFixed(2)} earnings`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

breakdownByEvent();
