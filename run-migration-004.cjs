const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('migrations/004_fix_refunded_host_share.sql', 'utf8');
    const result = await pool.query(sql);
    
    console.log('\n=== Migration Completed ===');
    console.log('\nEvent 301 Summary After Fix:');
    if (result.length && result[result.length - 1].rows) {
      console.log(JSON.stringify(result[result.length - 1].rows, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
