const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/admin/payments/stats',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.argv[2] || ''}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('\nParsed:', JSON.stringify(json, null, 2));
    } catch(e) {
      console.log('Not JSON response');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
