import app from './app.js';
import { config } from './config/env.js';
import { ensureAdminAccount } from './repositories/userRepository.js';

const PORT = config.port || 5000;

// Idempotently ensure administrator account is provisioned
ensureAdminAccount().catch((err) => {
  console.error('[Admin Provisioning]:', err?.message);
});

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 PrimePrep Backend API Server Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});

// Graceful shutdown handling
const handleShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default server;
