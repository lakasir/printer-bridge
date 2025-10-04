async function printViaHTTP() {
  const printData = {
    text: 'Hello from web app!',
    items: [
      'Item 1: Product A - $10.00',
      'Item 2: Product B - $15.00',
      '========================',
      'Total: $25.00'
    ]
  };

  try {
    const response = await fetch('http://localhost:8888/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(printData)
    });

    const result = await response.json();
    console.log('Print response:', result);
  } catch (error) {
    console.error('Print error:', error);
  }
}

async function getPrinters() {
  const response = await fetch('http://localhost:8888/printers');
  const data = await response.json();
  console.log('Available printers:', data.printers);
}

async function getSettings() {
  const response = await fetch('http://localhost:8888/settings');
  const data = await response.json();
  console.log('Current settings:', data);
}
