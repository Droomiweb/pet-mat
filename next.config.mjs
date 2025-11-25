/** @type {import('next').NextConfig} */

const nextConfig = {
  // --- IMAGE CONFIGURATION ---
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        port: '',
        pathname: '/**',
      },
      // --- NEW: Add Cloudinary ---
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // --- FIXES FOR NEXT.JS 15 & OCR ---
  serverExternalPackages: ["tesseract.js"],
  
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/**/*.wasm", "./node_modules/**/*.proto"],
  },
};

export default nextConfig;