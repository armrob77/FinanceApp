import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth } from './src/middleware/auth.ts';
import { apiRouter } from './src/api/apiHandlers.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Public health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Protected API routes with Firebase Auth
  app.use('/api', requireAuth, apiRouter);

  // Vite middleware for development / SPA static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Finance Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
