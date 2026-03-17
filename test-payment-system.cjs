const { Client } = require('pg');

async function testPaymentSystem() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_lP1r7hWfdtqv@ep-ancient-recipe-a1fz418h-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Test 1: Check payment transactions structure
    console.log('=== TEST 1: Payment Transactions Structure ===');
    const payments = await client.query(`
      SELECT 
        pt.id,
        pt.event_id,
        pt.user_id,
        pt.amount,
        pt.platform_fee,
        pt.host_share,
        pt.status,
        pt.refunded_at,
        pt.created_at,
        e.title as event_title,
        e.host_id,
        u_buyer.first_name || ' ' || u_buyer.last_name as buyer_name,
        u_buyer.email as buyer_email,
        u_host.first_name || ' ' || u_host.last_name as host_name,
        u_host.email as host_email
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      LEFT JOIN users u_buyer ON pt.user_id = u_buyer.id
      LEFT JOIN users u_host ON e.host_id = u_host.id
      WHERE pt.status = 'captured' AND pt.refunded_at IS NULL
      ORDER BY pt.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Total captured payments (last 10): ${payments.rows.length}`);
    if (payments.rows.length > 0) {
      console.log('\nSample payment:');
      const sample = payments.rows[0];
      console.log(`  ID: ${sample.id}`);
      console.log(`  Event: ${sample.event_title} (ID: ${sample.event_id})`);
      console.log(`  Host: ${sample.host_name} (${sample.host_email})`);
      console.log(`  Buyer: ${sample.buyer_name} (${sample.buyer_email})`);
      console.log(`  Amount: ₹${sample.amount / 100}`);
      console.log(`  Platform Fee: ₹${sample.platform_fee / 100}`);
      console.log(`  Host Share: ₹${sample.host_share / 100}`);
      console.log(`  Status: ${sample.status}`);
      console.log(`  Date: ${sample.created_at}`);
    }

    // Test 2: Host Earnings Aggregation
    console.log('\n\n=== TEST 2: Host Earnings by Event ===');
    const hostEarningsByEvent = await client.query(`
      SELECT 
        e.host_id,
        u.first_name || ' ' || u.last_name as host_name,
        u.email as host_email,
        e.id as event_id,
        e.title as event_title,
        COUNT(pt.id) as tickets_sold,
        SUM(pt.amount) as total_amount,
        SUM(pt.platform_fee) as total_platform_fee,
        SUM(pt.host_share) as total_host_share,
        json_agg(
          json_build_object(
            'buyer_name', u_buyer.first_name || ' ' || u_buyer.last_name,
            'buyer_email', u_buyer.email,
            'amount', pt.amount / 100,
            'host_share', pt.host_share / 100,
            'date', pt.created_at
          ) ORDER BY pt.created_at DESC
        ) as payments
      FROM events e
      LEFT JOIN payment_transactions pt ON e.id = pt.event_id 
        AND pt.status = 'captured' 
        AND pt.refunded_at IS NULL
      LEFT JOIN users u ON e.host_id = u.id
      LEFT JOIN users u_buyer ON pt.user_id = u_buyer.id
      WHERE pt.id IS NOT NULL
      GROUP BY e.host_id, u.first_name, u.last_name, u.email, e.id, e.title
      ORDER BY total_host_share DESC NULLS LAST
      LIMIT 5
    `);

    console.log(`Total hosts with events that have payments: ${hostEarningsByEvent.rows.length}\n`);
    
    hostEarningsByEvent.rows.forEach((row, idx) => {
      console.log(`\n--- Host ${idx + 1} ---`);
      console.log(`Host: ${row.host_name} (${row.host_email})`);
      console.log(`Event: ${row.event_title} (ID: ${row.event_id})`);
      console.log(`Tickets Sold: ${row.tickets_sold}`);
      console.log(`Total Revenue: ₹${row.total_amount / 100}`);
      console.log(`Platform Fees: ₹${row.total_platform_fee / 100}`);
      console.log(`Host Earnings: ₹${row.total_host_share / 100}`);
      console.log('\nPayments (captured only):');
      row.payments.forEach((payment, payIdx) => {
        if (payment.buyer_name) {
          console.log(`  ${payIdx + 1}. ${payment.buyer_name} (${payment.buyer_email}) - ₹${payment.amount} (Host gets: ₹${payment.host_share})`);
        }
      });
    });

    // Test 3: Overall Host Earnings
    console.log('\n\n=== TEST 3: Overall Host Earnings (All Events) ===');
    const overallHostEarnings = await client.query(`
      SELECT 
        e.host_id,
        u.first_name || ' ' || u.last_name as host_name,
        u.email as host_email,
        COUNT(DISTINCT e.id) as event_count,
        COUNT(pt.id) as total_tickets_sold,
        SUM(pt.amount) as total_revenue,
        SUM(pt.platform_fee) as total_platform_fee,
        SUM(pt.host_share) as total_host_share
      FROM events e
      LEFT JOIN payment_transactions pt ON e.id = pt.event_id 
        AND pt.status = 'captured' 
        AND pt.refunded_at IS NULL
      LEFT JOIN users u ON e.host_id = u.id
      WHERE pt.id IS NOT NULL
      GROUP BY e.host_id, u.first_name, u.last_name, u.email
      ORDER BY total_host_share DESC NULLS LAST
    `);

    console.log(`Total hosts with earnings: ${overallHostEarnings.rows.length}\n`);
    overallHostEarnings.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.host_name} (${row.host_email})`);
      console.log(`   Events: ${row.event_count} | Tickets: ${row.total_tickets_sold}`);
      console.log(`   Revenue: ₹${row.total_revenue / 100} | Host Share: ₹${row.total_host_share / 100}`);
    });

    // Test 4: Payment Status Distribution
    console.log('\n\n=== TEST 4: Payment Status Distribution ===');
    const statusDistribution = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(host_share) as total_host_share
      FROM payment_transactions
      GROUP BY status
      ORDER BY count DESC
    `);

    statusDistribution.rows.forEach(row => {
      console.log(`${row.status}: ${row.count} transactions, ₹${row.total_amount / 100} total, ₹${row.total_host_share / 100} host share`);
    });

    // Test 5: Refunded Payments
    console.log('\n\n=== TEST 5: Refunded Payments ===');
    const refunded = await client.query(`
      SELECT 
        pt.id,
        e.title as event_title,
        pt.amount,
        pt.refund_amount,
        pt.refunded_at
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      WHERE pt.refunded_at IS NOT NULL
      ORDER BY pt.refunded_at DESC
      LIMIT 5
    `);

    console.log(`Total refunded payments: ${refunded.rows.length}`);
    refunded.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.event_title} - ₹${row.amount / 100} (Refunded: ₹${row.refund_amount / 100})`);
    });

    // Test 6: Events without payments
    console.log('\n\n=== TEST 6: Events Without Payments ===');
    const eventsWithoutPayments = await client.query(`
      SELECT 
        e.id,
        e.title,
        e.host_id,
        u.first_name || ' ' || u.last_name as host_name,
        e.ticketing_enabled,
        e.ticket_price,
        e.created_at
      FROM events e
      LEFT JOIN payment_transactions pt ON e.id = pt.event_id
      LEFT JOIN users u ON e.host_id = u.id
      WHERE pt.id IS NULL AND e.ticketing_enabled = true
      ORDER BY e.created_at DESC
      LIMIT 10
    `);

    console.log(`Events with ticketing but no payments: ${eventsWithoutPayments.rows.length}`);
    eventsWithoutPayments.rows.forEach(row => {
      console.log(`  ${row.title} (Host: ${row.host_name}) - Price: ₹${row.ticket_price / 100}`);
    });

    // Test 7: Problems Detection
    console.log('\n\n=== TEST 7: Problems Detection ===');
    
    // Check for NULL host_share on captured payments
    const nullHostShare = await client.query(`
      SELECT COUNT(*) as count
      FROM payment_transactions
      WHERE status = 'captured' AND refunded_at IS NULL AND host_share IS NULL
    `);
    console.log(`🔍 Captured payments with NULL host_share: ${nullHostShare.rows[0].count}`);
    if (nullHostShare.rows[0].count > 0) {
      console.log('   ⚠️  PROBLEM: Some captured payments don\'t have host_share calculated!');
    }

    // Check for NULL platform_fee
    const nullPlatformFee = await client.query(`
      SELECT COUNT(*) as count
      FROM payment_transactions
      WHERE status = 'captured' AND refunded_at IS NULL AND platform_fee IS NULL
    `);
    console.log(`🔍 Captured payments with NULL platform_fee: ${nullPlatformFee.rows[0].count}`);

    // Check for events without host information
    const eventsNoHost = await client.query(`
      SELECT COUNT(*) as count
      FROM payment_transactions pt
      LEFT JOIN events e ON pt.event_id = e.id
      WHERE pt.status = 'captured' AND e.host_id IS NULL
    `);
    console.log(`🔍 Captured payments for events with NULL host_id: ${eventsNoHost.rows[0].count}`);
    if (eventsNoHost.rows[0].count > 0) {
      console.log('   ⚠️  PROBLEM: Some events don\'t have a host assigned!');
    }

    // Check for payments where amount != platform_fee + host_share
    const mathMismatch = await client.query(`
      SELECT 
        id,
        amount,
        platform_fee,
        host_share,
        (COALESCE(platform_fee, 0) + COALESCE(host_share, 0)) as calculated_total
      FROM payment_transactions
      WHERE status = 'captured' 
        AND refunded_at IS NULL
        AND amount != (COALESCE(platform_fee, 0) + COALESCE(host_share, 0))
      LIMIT 5
    `);
    console.log(`🔍 Payments with amount != (platform_fee + host_share): ${mathMismatch.rows.length}`);
    if (mathMismatch.rows.length > 0) {
      console.log('   ⚠️  PROBLEM: Fee calculation doesn\'t match total!');
      mathMismatch.rows.forEach(row => {
        console.log(`   ID ${row.id}: Amount=${row.amount}, PlatformFee=${row.platform_fee}, HostShare=${row.host_share}, Calculated=${row.calculated_total}`);
      });
    }

    console.log('\n✅ Payment system analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testPaymentSystem();
