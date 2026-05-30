/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor 實機以區網 IP 載入 dev server 時，/_next 資源視為跨來源
  allowedDevOrigins: ['192.168.50.173', '127.0.0.1', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
