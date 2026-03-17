const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkEvent301() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as count, 
        SUM(amount)/100 as total_amount, 
        SUM(host_share)/100 as total_host_share, 
        SUM(platform_fee)/100 as total_fees 
      FROM payment_transactions 
      WHERE event_id=301 AND status='captured'
    `);
    
    console.log('Event 301 Summary (10 users × ₹180):');
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEvent301();
