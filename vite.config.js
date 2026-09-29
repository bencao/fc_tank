import { Readable } from 'node:stream';
import { defineConfig, loadEnv } from 'vite';

// Serves the functions in api/ during `vite dev`, the way Vercel serves them
// in production, so the TypeSafe API key and the Redis token never have to
// reach the browser.
const API_ROUTES = ['enemy-guide', 'leaderboard', 'room'];

function vercelFunctions() {
  return {
    name: 'vercel-functions',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ['TYPESAFE_', 'KV_', 'UPSTASH_', 'JEV_', 'LEADERBOARD_']));
      API_ROUTES.forEach(route => server.middlewares.use(`/api/${route}`, async (req, res) => {
        const handlers = await server.ssrLoadModule(`/api/${route}.js`);
        const handler = handlers[req.method];
        if (!handler) {
          res.statusCode = 405;
          res.end();
          return;
        }
        const has_body = req.method !== 'GET' && req.method !== 'HEAD';
        const response = await handler(new Request(`http://localhost${req.originalUrl}`, {
          method: req.method,
          headers: req.headers,
          ...(has_body && { body: Readable.toWeb(req), duplex: 'half' }),
        }));
        res.statusCode = response.status;
        response.headers.forEach((value, name) => res.setHeader(name, value));
        res.end(await response.text());
      }));
    },
  };
}

export default defineConfig({
  plugins: [vercelFunctions()],
  build: {
    outDir: 'dist',
  },
});
