const key = "AIzaSyBEqs-w-_KDPWqskP0MmMm4jck8CiigzP4"; 

async function listAllModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log("✅ Available Models:");
      data.models.forEach(m => {
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
           console.log(`- ${m.name}`);
        }
      });
    } else {
      console.error("❌ Failed to list models:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

listAllModels();
