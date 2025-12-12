const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkData() {
  try {
    console.log('\n=== DATABASE DATA CHECK ===\n');
    
    // Check users
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Users: ${users.rows[0].count}`);
    
    // Check events
    const events = await pool.query('SELECT COUNT(*) as count FROM events');
    console.log(`Events: ${events.rows[0].count}`);
    
    // Check groups
    const groups = await pool.query('SELECT COUNT(*) as count FROM "groups"');
    console.log(`Groups: ${groups.rows[0].count}`);
    
    // Check if events table has discover columns
    const eventColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name IN ('discover_state', 'discover_approved_by', 'discover_rejected_by', 'discover_rejection_reason')
    `);
    console.log(`\nEvents table has ${eventColumns.rows.length}/4 discover columns`);
    eventColumns.rows.forEach(r => console.log(`  - ${r.column_name}`));
    
    // Check if admin_audit_log table exists
    const auditTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_audit_log'
      )
    `);
    console.log(`\nAudit log table exists: ${auditTable.rows[0].exists}`);
    
    // Sample some events if they exist
    if (parseInt(events.rows[0].count) > 0) {
      const sampleEvents = await pool.query('SELECT id, title, discover_state, created_at FROM events LIMIT 3');
      console.log('\nSample Events:');
      sampleEvents.rows.forEach(e => {
        console.log(`  - ID: ${e.id}, Title: ${e.title}, Discover State: ${e.discover_state || 'NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
