// Quick test of the new API endpoint
const testEndpoint = async () => {
  // You'll need to replace TOKEN with an actual admin token from localStorage
  const TOKEN = 'YOUR_ADMIN_TOKEN_HERE';
  
  try {
    const response = await fetch('http://localhost:5001/api/admin/payments/host-earnings-by-event', {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Response received!');
    console.log('Total hosts:', data.length);
    
    data.forEach((host, idx) => {
      console.log(`\n${idx + 1}. ${host.hostName} (${host.hostEmail})`);
      console.log(`   Earnings: ₹${host.totalEarnings}`);
      console.log(`   Events: ${host.events.length}`);
      console.log(`   Tickets: ${host.totalTicketsSold}`);
      
      host.events.forEach((event, eventIdx) => {
        console.log(`   ${eventIdx + 1}. ${event.eventTitle}`);
        console.log(`      - ${event.ticketsSold} tickets @ ₹${event.ticketPrice}`);
        console.log(`      - Host earns: ₹${event.hostEarnings}`);
        console.log(`      - Payments from ${event.payments.length} buyers`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nNote: You need to add an admin token to test this endpoint.');
    console.log('Get a token by logging into the admin panel first.');
  }
};

testEndpoint();
