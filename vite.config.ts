import path from 'path';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

function claudeApiDev(): Plugin {
  return {
    name: 'claude-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/claude', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const { POST } = await server.ssrLoadModule('/api/claude.ts');
        const response: Response = await POST(new Request('http://localhost/api/claude', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: Buffer.concat(chunks),
        }));
        res.statusCode = response.status;
        res.setHeader('content-type', 'application/json');
        res.end(await response.text());
      });
    },
  };
}

function proxyApiDev(): Plugin {
  const routes = [
    { prefix: '/api/novig', module: '/api/novig.ts' },
    { prefix: '/api/cfb', module: '/api/cfb.ts' },
    { prefix: '/api/rundown', module: '/api/rundown.ts' },
    { prefix: '/api/espn', module: '/api/espn.ts' },
  ];
  return {
    name: 'quantumbets-api-dev',
    configureServer(server: ViteDevServer) {
      for (const route of routes) {
        server.middlewares.use(route.prefix, async (req, res) => {
          const { GET } = await server.ssrLoadModule(route.module);
          const response: Response = await GET(new Request(`http://localhost${req.url}`));
          res.statusCode = response.status;
          res.setHeader('content-type', response.headers.get('content-type') || 'application/json');
          res.setHeader('cache-control', 'no-store');
          res.end(await response.text());
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    if (env.THERUNDOWN_API_KEY) process.env.THERUNDOWN_API_KEY = env.THERUNDOWN_API_KEY;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), claudeApiDev(), proxyApiDev()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2020',
        cssCodeSplit: true,
        modulePreload: { polyfill: false },
        reportCompressedSize: false,
        assetsInlineLimit: 0,
        chunkSizeWarningLimit: 700,
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (!id.includes('node_modules')) return;
              if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) return 'charts';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('@google/genai')) return 'genai';
              if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
              return 'vendor';
            },
          },
        },
      },
    };
});
