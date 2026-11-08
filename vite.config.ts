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

function cfbApiDev(): Plugin {
  return {
    name: 'cfb-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/cfb', async (req, res) => {
        const { GET } = await server.ssrLoadModule('/api/cfb.ts');
        const response: Response = await GET(new Request(`http://localhost${req.url}`));
        res.statusCode = response.status;
        res.setHeader('content-type', response.headers.get('content-type') || 'application/json');
        res.end(await response.text());
      });
    },
  };
}

function novigApiDev(): Plugin {
  return {
    name: 'novig-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/novig', async (req, res) => {
        const { GET } = await server.ssrLoadModule('/api/novig.ts');
        const response: Response = await GET(new Request(`http://localhost${req.url}`));
        res.statusCode = response.status;
        res.setHeader('content-type', response.headers.get('content-type') || 'application/json');
        res.setHeader('cache-control', 'no-store');
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), claudeApiDev(), cfbApiDev(), novigApiDev()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
