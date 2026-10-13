/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://arthea-smart-class.arsyir.my.id' // Ganti dengan domain Anda
          },
          ...(process.env.NODE_ENV === 'production' ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY'
            },
            {
              key: 'Content-Security-Policy',
              value: "default-src 'self' vercel.live; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.app; style-src 'self' 'unsafe-inline' *.googleapis.com; img-src 'self' data: blob: *.googleusercontent.com; font-src 'self' *.gstatic.com; connect-src 'self' *.vercel.app"
            }
          ] : [])
        ],
      },
    ];
  },
};

export default nextConfig;