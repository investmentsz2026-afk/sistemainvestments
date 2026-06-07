const axios = require('axios');

async function main() {
  try {
    const resp = await axios.get('https://americancolt-system-production.up.railway.app/api/sales');
    const sales = resp.data;
    console.log(`Total sales: ${sales.length}`);
    
    // Find sales matching 'GRANDES OFERTAS' or amount 6264
    const matching = sales.filter(s => 
      (s.client && s.client.name && s.client.name.toUpperCase().includes('GRANDES OFERTAS')) ||
      s.totalAmount === 6264
    );
    
    console.log('Matching sales:', JSON.stringify(matching, null, 2));
    
  } catch (error) {
    console.error('Error fetching sales:', error.message);
  }
}
main();
