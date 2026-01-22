/** @type {import('next').NextConfig} */
// Force new deployment
const nextConfig = {
  
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  output: "standalone",
}

export default nextConfig
