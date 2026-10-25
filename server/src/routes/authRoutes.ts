import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG, getLanIpAddresses } from '../config';
import { GroqService } from '../services/groqService';

const router = Router();

// Admin Login
router.post('/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || password !== CONFIG.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid admin password' });
    return;
  }

  const token = jwt.sign({ role: 'admin' }, CONFIG.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, role: 'admin', message: 'Admin authentication successful' });
});

// Judge Login
router.post('/judge/login', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || code.trim() !== CONFIG.JUDGE_CODE) {
    res.status(401).json({ error: 'Invalid judge code' });
    return;
  }

  const token = jwt.sign({ role: 'judge' }, CONFIG.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, role: 'judge', message: 'Judge authentication successful' });
});

// System Info & LAN IP Discovery
router.get('/info', (_req: Request, res: Response) => {
  const ips = getLanIpAddresses();
  res.json({
    appName: 'TechQuiz Arena',
    version: '1.0.0',
    port: CONFIG.PORT,
    lanIps: ips,
    primaryLanUrl: `http://${ips[0]}:${CONFIG.PORT}`,
    hasAiFeatures: GroqService.isConfigured()
  });
});

export default router;
