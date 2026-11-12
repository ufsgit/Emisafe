const app = require('./src/app');
const config = require('./src/config/env');

const server = app.listen(config.PORT, () => {
  console.log(`=================================================`);
  console.log(`  EmiSafe REST API Server running on port ${config.PORT}`);
  console.log(`  Environment: ${config.NODE_ENV}`);
  console.log(`  Public Verify: http://localhost:${config.PORT}/api/public/verify/:certificateNumber`);
  console.log(`=================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

