const app = require('./src/app');
const config = require('./src/config/env');

const MAX_PORT_RETRIES = 3;
const RETRY_DELAY_MS = 600;
let activeServer = null;

function startServer(attempt = 1) {
  const server = app.listen(config.PORT, () => {
    activeServer = server;
    console.log(`=================================================`);
    console.log(`  EmiSafe REST API Server running on port ${config.PORT}`);
    console.log(`  Environment: ${config.NODE_ENV}`);
    console.log(`  Public Verify: http://localhost:${config.PORT}/api/public/verify/:certificateNumber`);
    console.log(`=================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt <= MAX_PORT_RETRIES) {
      console.warn(`[Server] Port ${config.PORT} busy on restart, retrying (${attempt}/${MAX_PORT_RETRIES})...`);
      setTimeout(() => startServer(attempt + 1), RETRY_DELAY_MS);
      return;
    }

    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${config.PORT} is already in use by another process. Stop the existing process and restart.`);
    } else {
      console.error('[Server] Startup error:', err.message);
    }
    process.exit(1);
  });
}

function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  if (!activeServer) {
    process.exit(0);
    return;
  }
  activeServer.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

