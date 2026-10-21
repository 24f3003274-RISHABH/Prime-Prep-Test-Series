import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import backendApp from './backend/src/app.js';
import { ensureAdminAccount } from './backend/src/repositories/userRepository.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Mount Express Backend (handles /api/health and all /api routes)
  app.use(backendApp);

  // Idempotently ensure administrator account is provisioned in PostgreSQL
  try {
    await ensureAdminAccount();
  } catch (err: any) {
    console.error('[Admin Provisioning]:', err?.message);
  }

  // Vite development middleware for the React frontend
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🌟 PrimePrep Dev Server Active on http://0.0.0.0:${PORT}`);
    console.log(`🩺 Health API: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
