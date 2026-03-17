const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function findIssue() {
  try {
    // Find all events with captured payments showing amounts around 1490-1800
    const result = await pool.query(`
      SELECT 
        pt.event_id,
        e.title,
        e.host_id,
        COUNT(*) as total_txns,
        COUNT(*) FILTER (WHERE pt.status = 'captured' AND pt.refunded_at IS NULL) as captured_count,
        SUM(pt.host_share) FILTER (WHERE pt.status = 'captured' AND pt.refunded_at IS NULL) / 100 as host_earnings,
        MIN(pt.amount) / 100 as min_amount,
        MAX(pt.amount) / 100 as max_amount
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      GROUP BY pt.event_id, e.title, e.host_id
      HAVING SUM(pt.host_share) FILTER (WHERE pt.status = 'captured' AND pt.refunded_at IS NULL) BETWEEN 140000 AND 190000
      ORDER BY pt.event_id DESC
    `);
    
    console.log('\n=== EVENTS WITH EARNINGS BETWEEN ₹1,400 - ₹1,900 ===\n');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check for the specific pattern: 10 payments at 180 each
    const pattern = await pool.query(`
      SELECT 
        event_id,
        COUNT(*) as txn_count,
        COUNT(*) FILTER (WHERE status = 'captured' AND refunded_at IS NULL) as captured,
        COUNT(*) FILTER (WHERE status = 'created') as created,
        COUNT(*) FILTER (WHERE status = 'refunded' OR refunded_at IS NOT NULL) as refunded,
        SUM(amount) FILTER (WHERE status = 'captured' AND refunded_at IS NULL) / 100 as total_captured_amount,
        SUM(host_share) FILTER (WHERE status = 'captured' AND refunded_at IS NULL) / 100 as host_earnings
      FROM payment_transactions
      WHERE amount = 18000
      GROUP BY event_id
      HAVING COUNT(*) >= 10 OR COUNT(*) FILTER (WHERE status = 'captured' AND refunded_at IS NULL) >= 9
    `);
    
    console.log('\n=== EVENTS WITH ₹180 TICKETS (10+ total OR 9+ captured) ===\n');
    console.log(JSON.stringify(pattern.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findIssue();
