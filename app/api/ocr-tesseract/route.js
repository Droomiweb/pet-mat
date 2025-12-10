// app/api/ocr-tesseract/route.js

// Avoid global import
// Tesseract causes build issues if imported globally in Next.js

export async function POST(req) {
  // Parse request data
  const { certificateUrl } = await req.json();

  if (!certificateUrl) {
    return new Response(JSON.stringify({ error: "Certificate URL is required" }), { status: 400 });
  }

  let worker;
  try {
    // Import Tesseract dynamically
    const tesseract = await import('tesseract.js');

    // Check API version
    // Verify compatibility with v5 factory pattern
    if (typeof tesseract.createWorker === 'function') {
      
      // Initialize worker
      // Must await creation in newer versions
      worker = await tesseract.createWorker(); 

      // Configure language
      // Initialize English language data
      if (typeof worker.load === 'function') {
        await worker.load();
      }
      if (typeof worker.loadLanguage === 'function') {
        await worker.loadLanguage('eng');
      }
      if (typeof worker.initialize === 'function') {
        await worker.initialize('eng');
      }

      // Perform OCR
      // Process image URL
      const res = await worker.recognize(certificateUrl);
      const text = res?.data?.text ?? '';

      // Terminate worker
      // Free up memory
      if (typeof worker.terminate === 'function') {
        await worker.terminate();
      }

      // Return extracted text
      return new Response(JSON.stringify({ ocrText: text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Legacy API fallback
    // Handle older Tesseract versions
    if (typeof tesseract.recognize === 'function') {
      const res = await tesseract.recognize(certificateUrl, 'eng');
      const text = res?.data?.text ?? '';

      return new Response(JSON.stringify({ ocrText: text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unsupported version
    throw new Error('Unsupported tesseract.js API shape. Please check version compatibility.');

  } catch (error) {
    console.error("Tesseract OCR Error:", error);
    
    // Ensure worker cleanup
    // Terminate worker on error
    if (worker && typeof worker.terminate === 'function') {
      try { await worker.terminate(); } catch (e) { /* ignore cleanup errors */ }
    }
    
    return new Response(JSON.stringify({ error: "Tesseract OCR failed", details: error?.message || String(error) }), { status: 500 });
  }
}