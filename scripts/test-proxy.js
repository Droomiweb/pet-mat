async function testProxyFetch() {
    const url = "https://image.pollinations.ai/prompt/a%20cute%20puppy";
    console.log(`Testing fetch for: ${url}`);
    
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        
        console.log(`Status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const buffer = await res.arrayBuffer();
            console.log(`Success! Received buffer of size: ${buffer.byteLength}`);
        } else {
            console.log("Failed to fetch image via Node.js");
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testProxyFetch();
