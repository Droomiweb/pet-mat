/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      // 1. Unsplash (Stock photos)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // 2. Pollinations AI (AI generated pet/baby images)
      {
        protocol: 'https',
        hostname: 'pollinations.ai',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        port: '',
        pathname: '/**',
      },
      // 3. Cloudinary (Your uploaded pet photos)
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      // 4. DiceBear (The user avatars - THIS WAS MISSING)
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      // 5. Google (If you add Google Auth profile pics later)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Allow SVG images (needed for DiceBear avatars)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Fixes for Tesseract OCR in Next.js 15
  serverExternalPackages: ["tesseract.js"],
  
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/**/*.wasm", "./node_modules/**/*.proto"],
  },
};

export default nextConfig;