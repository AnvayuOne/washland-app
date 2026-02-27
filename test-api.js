const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing /api/admin/users endpoint...');

    const response = await fetch('http://localhost:3000/api/admin/users', {
      headers: {
        'x-user-email': 'admin@washlandlaundry.in',
        'x-user-role': 'SUPER_ADMIN'
      }
    });

    console.log('Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Response data type:', Array.isArray(data) ? 'Array' : typeof data);
      console.log('Response length:', Array.isArray(data) ? data.length : 'N/A');
      console.log('First user:', data[0] ? JSON.stringify(data[0], null, 2) : 'No users');
    } else {
      const error = await response.text();
      console.log('Error response:', error);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAPI();