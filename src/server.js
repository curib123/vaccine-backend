/**
 * Server Bootstrap
 * ----------------
 * Child Immunization Tracker System
 */

import dotenv from 'dotenv';

import app from './app.js';
import {
  connectDB,
  disconnectDB,
} from './config/db.js';

dotenv.config();// ✅ load env FIRST

const PORT = Number(process.env.PORT) || 3000;

let server;

/* =========================
   START SERVER
========================= */
const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

/* =========================
   GRACEFUL SHUTDOWN
========================= */
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await disconnectDB();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

/* =========================
   PROCESS HANDLERS
========================= */
process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // Docker / PM2 / Railway

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});
