import { defineConfig } from 'vite';
import { hydrogen } from '@shopify/hydrogen/vite';
import { oxygen } from '@shopify/mini-oxygen/vite';
import { reactRouter } from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

const isVercel = process.env.VERCEL === '1' || process.env.BUILD_TARGET === 'vercel';

export default defineConfig({
  plugins: [
    tailwindcss(),
    hydrogen(),
    !isVercel && oxygen(),
    reactRouter(),
    tsconfigPaths(),
  ].filter(Boolean),
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router',
      'clsx',
      'tailwind-merge',
      'lucide-react',
    ],
  },
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      include: [
        'clsx',
        'tailwind-merge',
        'lucide-react',
      ],
    },
  },
});
