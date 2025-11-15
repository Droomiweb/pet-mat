/** @type {import('next').NextConfig} */

const nextConfig = {
  // --- 1. ADD THIS BLOCK TO FIX THE IMAGE ERROR ---
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**", // Allows all paths from this domain
      },
    ],
  },
  // --- END IMAGE FIX ---

  // --- 2. FIXES FOR NEXT.JS 15 ---
  // (These were moved out of the 'experimental' block)
  serverExternalPackages: ["tesseract.js"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/**/*.wasm", "./node_modules/**/*.proto"],
  },
  // --- END FIXES ---
};

export default nextConfig;