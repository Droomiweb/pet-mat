/** @type {import('next').NextConfig} */

    const nextConfig = {
       // Keys are now at the top level
       serverExternalPackages: ['tesseract.js'],
       outputFileTracingIncludes: {
          '/api/**/*': ['./node_modules/**/*.wasm', './node_modules/**/*.proto']
       },

       // The experimental block is now empty (or can be removed)
       experimental: {} 
    };

export default nextConfig;