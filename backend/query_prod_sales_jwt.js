const jwt = require('jsonwebtoken');
const axios = require('axios');

async function main() {
  try {
    // Generate token
    const token = jwt.sign(
      { id: 'cmq1f9z2b000008jw2z7c8z9a', role: 'ADMIN', name: 'Admin' }, 
      'supersecretkey123', 
      { expiresIn: '1h' }
    );
    
    console.log('Token:', token);

    // Call API
    const resp = await axios.get('https://americancolt-system-production.up.railway.app/api/sales', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const sales = resp.data;
    console.log(`Total sales: ${sales.length}`);
    
    const matching = sales.filter(s => 
      (s.client && s.client.name && s.client.name.toUpperCase().includes('GRANDES OFERTAS')) ||
      (s.notes && s.notes.includes('000002'))
    );
    
    console.log('Matching sales:', JSON.stringify(matching, null, 2));
    
  } catch (error) {
    console.error('Error fetching sales:', error.response ? error.response.data : error.message);
  }
}
main();
