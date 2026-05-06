/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Env vars untuk server-side API proxy route (/api/backend/*)
  // Wajib di set di Vercel Dashboard: Settings > Environment Variables
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5094',
    API_SECRET_TOKEN: process.env.API_SECRET_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN || 'buat_token_rahasia_panjang_kamu_disini',
  },
};

export default nextConfig;

