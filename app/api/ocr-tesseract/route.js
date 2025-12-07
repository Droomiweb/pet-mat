// app/api/ocr-tesseract/route.js

// NOTE: We do NOT use a top-level import here.
// Importing tesseract.js globally can cause build errors in Next.js Serverless functions
// because the bundler tries to include the massive worker files unnecessarily.

export async function POST(req) {
  // 1. PARSE REQUEST
  const { certificateUrl } = await req.json();

  if (!certificateUrl) {
    return new Response(JSON.stringify({ error: "Certificate URL is required" }), { status: 400 });
  }

  let worker;
  try {
    // 2. DYNAMIC IMPORT (Server-Side)
    // We import the library only when this specific API route is hit.
    const tesseract = await import('tesseract.js');

    // 3. CHECK API VERSION COMPATIBILITY
    // Tesseract v5 uses createWorker factory pattern.
    if (typeof tesseract.createWorker === 'function') {
      
      // --- CRITICAL FIX: Initialize Worker ---
      // In newer versions (v5+), createWorker is async and MUST be awaited.
      // If you don't await, 'worker' will be a Promise, not the worker object.
      worker = await tesseract.createWorker(); 

      // 4. CONFIGURE LANGUAGE (English)
      // Some versions require explicit loading and initialization of the language data.
      if (typeof worker.load === 'function') {
        await worker.load();
      }
      if (typeof worker.loadLanguage === 'function') {
        await worker.loadLanguage('eng');
      }
      if (typeof worker.initialize === 'function') {
        await worker.initialize('eng');
      }

      // 5. PERFORM OCR
      // We pass the image URL directly. Tesseract will fetch and process it.
      const res = await worker.recognize(certificateUrl);
      const text = res?.data?.text ?? '';

      // 6. CLEANUP
      // Always kill the worker to free up server memory.
      if (typeof worker.terminate === 'function') {
        await worker.terminate();
      }

      // Return the extracted text
      return new Response(JSON.stringify({ ocrText: text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 7. FALLBACK FOR OLDER VERSIONS
    // If createWorker doesn't exist (very old versions), try the simple recognize API.
    if (typeof tesseract.recognize === 'function') {
      const res = await tesseract.recognize(certificateUrl, 'eng');
      const text = res?.data?.text ?? '';

      return new Response(JSON.stringify({ ocrText: text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If neither API works, something is wrong with the installed package.
    throw new Error('Unsupported tesseract.js API shape. Please check version compatibility.');

  } catch (error) {
    console.error("Tesseract OCR Error:", error);
    
    // 8. SAFETY CLEANUP
    // If the process crashed halfway, ensure the worker is still killed
    // to prevent "zombie" processes eating RAM.
    if (worker && typeof worker.terminate === 'function') {
      try { await worker.terminate(); } catch (e) { /* ignore cleanup errors */ }
    }
    
    return new Response(JSON.stringify({ error: "Tesseract OCR failed", details: error?.message || String(error) }), { status: 500 });
  }
}