// app/api/ocr-tesseract/route.js
// (no top-level import so the bundler won't try to resolve tesseract at build-time)

export async function POST(req) {
  const { certificateUrl } = await req.json();

  if (!certificateUrl) {
    return new Response(JSON.stringify({ error: "Certificate URL is required" }), { status: 400 });
  }

  let worker;
  try {
    // dynamic import at runtime (server-side)
    const tesseract = await import('tesseract.js');

    // If the package exposes createWorker(), use the worker lifecycle if supported.
    if (typeof tesseract.createWorker === 'function') {
      
      // --- V V V THIS IS THE FIX V V V ---
      worker = await tesseract.createWorker(); // <-- You must await this
      // --- ^ ^ ^ END OF FIX ^ ^ ^ ---

      // Some tesseract versions require load/loadLanguage/initialize
      if (typeof worker.load === 'function') {
        await worker.load();
      }
      if (typeof worker.loadLanguage === 'function') {
        await worker.loadLanguage('eng');
      }
      if (typeof worker.initialize === 'function') {
        await worker.initialize('eng');
      }

      // Recognize using the worker
      const res = await worker.recognize(certificateUrl);
      const text = res?.data?.text ?? '';

      // Terminate the worker
      if (typeof worker.terminate === 'function') {
        await worker.terminate();
      }

      return new Response(JSON.stringify({ ocrText: text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fallback: if createWorker() doesn't exist, try the library-level recognize function
    if (typeof tesseract.recognize === 'function') {
      const res = await tesseract.recognize(certificateUrl, 'eng');
      const text = res?.data?.text ?? '';

      return new Response(JSON.stringify({ ocrText: text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If neither API is available, return an informative error
    throw new Error('Unsupported tesseract.js API shape. Please install a compatible tesseract.js version (e.g. v2.x or v4.x/v5.x).');

  } catch (error) {
    console.error("Tesseract OCR Error:", error);
    // Ensure worker is terminated even if an error occurs
    if (worker && typeof worker.terminate === 'function') {
      try { await worker.terminate(); } catch (e) { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: "Tesseract OCR failed", details: error?.message || String(error) }), { status: 500 });
  }
}