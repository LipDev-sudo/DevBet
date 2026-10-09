import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

// Firefox e Safari bloqueiam o armazenamento de terceiros, o que quebra o login do Firebase quando ele roda em
// <projeto>.firebaseapp.com. Servindo `/__/auth/*` pelo próprio site (com NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN igual
// ao domínio do jogo) o login passa a ser first-party. Só vale quando o placar está configurado.
const firebaseProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    if (!firebaseProject) return [];
    const target = `https://${firebaseProject}.firebaseapp.com`;
    return [
      { source: '/__/auth/:path*', destination: `${target}/__/auth/:path*` },
      { source: '/__/firebase/:path*', destination: `${target}/__/firebase/:path*` },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
