import { Readable } from 'node:stream';
import { defineConfig, loadEnv } from 'vite';

// Serves api/enemy-guide.js during `vite dev`, the way Vercel serves it in
// production, so the TypeSafe API key never has to reach the browser.
function enemyGuideApi() {
  return {
    name: 'enemy-guide-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), 'TYPESAFE_'));
      server.middlewares.use('/api/enemy-guide', async (req, res) => {
        const { POST } = await server.ssrLoadModule('/api/enemy-guide.js');
        const response = await POST(new Request(`http://localhost${req.originalUrl}`, {
          method: req.method,
          headers: req.headers,
          body: Readable.toWeb(req),
          duplex: 'half',
        }));
        res.statusCode = response.status;
        res.setHeader('content-type', response.headers.get('content-type') ?? 'application/json');
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig({
  plugins: [enemyGuideApi()],
  build: {
    outDir: 'dist',
  },
});
