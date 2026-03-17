const { Client } = require('pg');

async function testHostEarningsByEvent() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_lP1r7hWfdtqv@ep-ancient-recipe-a1fz418h-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('=== Simulating getHostEarningsByEvent API Call ===\n');

    // Get all host events with payments
    const hostEvents = await client.query(`
      SELECT 
        e.host_id,
        e.id as event_id,
        e.title as event_title,
        e.ticket_price
      FROM events e
      INNER JOIN payment_transactions pt ON pt.event_id = e.id
        AND pt.status = 'captured'
        AND pt.refunded_at IS NULL
      GROUP BY e.host_id, e.id, e.title, e.ticket_price
      ORDER BY e.host_id
    `);

    console.log(`Found ${hostEvents.rows.length} events with captured payments\n`);

    if (hostEvents.rows.length === 0) {
      console.log('No events with payments found');
      return;
    }

    // Get host details
    const hostIds = [...new Set(hostEvents.rows.map(e => e.host_id).filter(Boolean))];
    const hosts = await client.query(`
      SELECT id, first_name, last_name, email
      FROM users
      WHERE id = ANY($1::text[])
    `, [hostIds]);

    const hostMap = new Map(hosts.rows.map(h => [h.id, h]));

    // Get all payments for these events with buyer details
    const eventIds = hostEvents.rows.map(e => e.event_id);
    const payments = await client.query(`
      SELECT 
        pt.id as transaction_id,
        pt.event_id,
        pt.amount,
        pt.platform_fee,
        pt.host_share,
        pt.created_at,
        u.id as buyer_id,
        u.first_name as buyer_first_name,
        u.last_name as buyer_last_name,
        u.email as buyer_email
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE pt.event_id = ANY($1::integer[])
        AND pt.status = 'captured'
        AND pt.refunded_at IS NULL
      ORDER BY pt.created_at DESC
    `, [eventIds]);

    // Group payments by event
    const paymentsByEvent = new Map();
    payments.rows.forEach(payment => {
      if (!paymentsByEvent.has(payment.event_id)) {
        paymentsByEvent.set(payment.event_id, []);
      }
      paymentsByEvent.get(payment.event_id).push(payment);
    });

    // Build result grouped by host
    const hostEarningsMap = new Map();

    hostEvents.rows.forEach(event => {
      if (!event.host_id) return;

      const eventPayments = paymentsByEvent.get(event.event_id) || [];
      const totalAmount = eventPayments.reduce((sum, p) => sum + parseInt(p.amount || 0), 0);
      const totalHostShare = eventPayments.reduce((sum, p) => sum + parseInt(p.host_share || 0), 0);
      const totalPlatformFee = eventPayments.reduce((sum, p) => sum + parseInt(p.platform_fee || 0), 0);

      const eventData = {
        eventId: event.event_id,
        eventTitle: event.event_title,
        ticketPrice: event.ticket_price / 100,
        ticketsSold: eventPayments.length,
        totalRevenue: totalAmount / 100,
        platformFee: totalPlatformFee / 100,
        hostEarnings: totalHostShare / 100,
        payments: eventPayments.map(p => ({
          transactionId: p.transaction_id,
          buyerName: `${p.buyer_first_name || ''} ${p.buyer_last_name || ''}`.trim() || 'Unknown',
          buyerEmail: p.buyer_email,
          amount: parseInt(p.amount) / 100,
          hostShare: parseInt(p.host_share) / 100,
          platformFee: parseInt(p.platform_fee) / 100,
          paidAt: p.created_at,
        })),
      };

      if (!hostEarningsMap.has(event.host_id)) {
        const host = hostMap.get(event.host_id);
        hostEarningsMap.set(event.host_id, {
          hostId: event.host_id,
          hostName: host ? `${host.first_name || ''} ${host.last_name || ''}`.trim() || host.email : 'Unknown',
          hostEmail: host?.email,
          events: [],
          totalEarnings: 0,
          totalTicketsSold: 0,
        });
      }

      const hostData = hostEarningsMap.get(event.host_id);
      hostData.events.push(eventData);
      hostData.totalEarnings += totalHostShare / 100;
      hostData.totalTicketsSold += eventPayments.length;
    });

    const result = Array.from(hostEarningsMap.values()).sort((a, b) => b.totalEarnings - a.totalEarnings);

    // Display results
    console.log(`📊 Total hosts with earnings: ${result.length}\n`);

    result.forEach((host, idx) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`HOST ${idx + 1}: ${host.hostName} (${host.hostEmail})`);
      console.log(`Total Earnings: ₹${host.totalEarnings.toFixed(2)}`);
      console.log(`Total Tickets Sold: ${host.totalTicketsSold}`);
      console.log(`Events: ${host.events.length}`);
      console.log(`${'='.repeat(80)}\n`);

      host.events.forEach((event, eventIdx) => {
        console.log(`  Event ${eventIdx + 1}: ${event.eventTitle}`);
        console.log(`  - Ticket Price: ₹${event.ticketPrice}`);
        console.log(`  - Tickets Sold: ${event.ticketsSold}`);
        console.log(`  - Total Revenue: ₹${event.totalRevenue.toFixed(2)}`);
        console.log(`  - Platform Fee: ₹${event.platformFee.toFixed(2)}`);
        console.log(`  - Host Earnings: ₹${event.hostEarnings.toFixed(2)}`);
        console.log(`  \n  Payments (Captured Only):`);
        
        event.payments.forEach((payment, payIdx) => {
          console.log(`    ${payIdx + 1}. ${payment.buyerName} (${payment.buyerEmail})`);
          console.log(`       Amount: ₹${payment.amount.toFixed(2)} | Host Gets: ₹${payment.hostShare.toFixed(2)}`);
        });
        console.log('');
      });
    });

    console.log('\n✅ Test complete! API should return similar data structure.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testHostEarningsByEvent();
