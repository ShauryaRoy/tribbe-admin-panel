const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkGuestCounts() {
  try {
    console.log('\n=== CHECKING ALL GUEST/ATTENDEE COUNTS FOR EVENT 301 ===\n');
    
    // Check event_rsvps
    const rsvps = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM event_rsvps
      WHERE event_id = 301
      GROUP BY status
    `);
    console.log('Event RSVPs:');
    console.log(rsvps.rows.length ? JSON.stringify(rsvps.rows, null, 2) : 'No RSVPs found');
    
    // Check event_attendees
    const attendees = await pool.query(`
      SELECT COUNT(*) as count
      FROM event_attendees
      WHERE event_id = 301
    `);
    console.log('\nEvent Attendees:', attendees.rows[0].count);
    
    // Check payment transactions by status
    const payments = await pool.query(`
      SELECT status, refunded_at IS NOT NULL as is_refunded, COUNT(*) as count
      FROM payment_transactions
      WHERE event_id = 301
      GROUP BY status, refunded_at IS NOT NULL
      ORDER BY status
    `);
    console.log('\nPayment Transactions by Status:');
    console.log(JSON.stringify(payments, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkGuestCounts();
