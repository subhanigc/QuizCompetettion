import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG, getLanIpAddresses } from './config';
import { initDatabase } from './db';
import { setupGameSockets } from './sockets/gameSocket';

import authRoutes from './routes/authRoutes';
import competitionRoutes from './routes/competitionRoutes';
import questionRoutes from './routes/questionRoutes';
import sessionRoutes from './routes/sessionRoutes';
import mediaRoutes from './routes/mediaRoutes';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with broad LAN support
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e7 // 10MB
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for user uploads
app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve frontend static build in production
let clientDistPath = path.resolve(__dirname, '../../client/dist');
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.resolve(__dirname, '../../../client/dist');
  if (!fs.existsSync(clientDistPath)) {
    clientDistPath = path.resolve(__dirname, '../../../../client/dist');
  }
}

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // React client SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database and socket handlers
initDatabase();
setupGameSockets(io);

// Start HTTP + Socket server
server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  const ips = getLanIpAddresses();
  console.log('\n=============================================================');
  console.log('           ⚡ TECHQUIZ ARENA - LAN COMPETITION PLATFORM ⚡');
  console.log('=============================================================');
  console.log(` Server Status : Online (Single-Laptop LAN Mode)`);
  console.log(` Localhost     : http://localhost:${CONFIG.PORT}`);
  console.log(' Connect Teams from Phones / Laptops on your Wi-Fi:');
  for (const ip of ips) {
    console.log(` 👉 LAN URL    : http://${ip}:${CONFIG.PORT}`);
  }
  console.log('-------------------------------------------------------------');
  console.log(` Admin Portal  : http://localhost:${CONFIG.PORT}/admin (Pass: ${CONFIG.ADMIN_PASSWORD})`);
  console.log(` Projector     : http://localhost:${CONFIG.PORT}/projector`);
  console.log(` Judge Portal  : http://localhost:${CONFIG.PORT}/judge (Code: ${CONFIG.JUDGE_CODE})`);
  console.log(` AI Features   : ${CONFIG.GROQ_API_KEY ? 'Enabled (Groq API)' : 'Disabled (Offline Mode)'}`);
  console.log('=============================================================\n');
});
