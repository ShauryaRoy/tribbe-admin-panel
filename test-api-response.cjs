const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function testAPIResponse() {
  try {
    console.log('\n=== SIMULATING EXACT API RESPONSE FOR HOST EARNINGS ===\n');
    
    // This is the EXACT query from admin-payment.service.ts getHostEarnings()
    const result = await pool.query(`
      SELECT 
        e.host_id,
        COALESCE(SUM(pt.host_share), 0) as total_revenue,
        COALESCE(SUM(pt.host_share), 0) as host_share,
        COUNT(*) as tickets_sold
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      WHERE 
        pt.status = 'captured'
        AND pt.refunded_at IS NULL
        AND e.id = 301
      GROUP BY e.host_id
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const totalRevenue = Number(row.total_revenue) / 100;
      const hostEarnings = Number(row.host_share) / 100;
      const ticketsSold = Number(row.tickets_sold);
      
      console.log('What the API should return:');
      console.log(`  Tickets Sold: ${ticketsSold}`);
      console.log(`  Total Revenue: ₹${totalRevenue.toFixed(2)}`);
      console.log(`  Host Earnings: ₹${hostEarnings.toFixed(2)}`);
      
      if (ticketsSold === 9 && hostEarnings === 1490) {
        console.log('\n✓ This matches what you see in the admin panel');
      } else if (ticketsSold === 8 && hostEarnings === 1440) {
        console.log('\n✓ Database is correct. You need to clear cache/restart server.');
      } else {
        console.log(`\n✗ You see: 9 tickets, ₹1490`);
        console.log(`✗ Database returns: ${ticketsSold} tickets, ₹${hostEarnings}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAPIResponse();
