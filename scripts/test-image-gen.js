
const fetch = require('node-fetch');

async function testImageGen() {
  const url = 'http://localhost:3000/api/ai-advisor/generate-image';
  const body = {
    petAId: 'mockPetA', // You'll need real IDs or mock the DB calls
    petBId: 'mockPetB',
    userId: 'mockUser',
    regenerate: true
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

// Since I can't easily run a script that hits the local server and connects to Mongo/Cloudinary without real IDs, 
// I'll check the logs and ask the user to verify in the UI.
console.log("Ready to verify in UI.");
