const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkPayouts() {
  try {
    const payouts = await pool.query(`
      SELECT * FROM payouts 
      WHERE status IN ('pending','paid')
      ORDER BY id DESC LIMIT 10
    `);
    
    console.log('\n=== RECENT PAYOUTS ===');
    console.log(JSON.stringify(payouts.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPayouts();
