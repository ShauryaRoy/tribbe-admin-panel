const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_audit_log' ORDER BY ordinal_position")
  .then(result => {
    console.log('Admin Audit Log table columns:');
    result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    pool.end();
  })
  .catch(err => {
    console.error('Error:', err.message);
    pool.end();
  });
