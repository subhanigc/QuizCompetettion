import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  JUDGE_CODE: process.env.JUDGE_CODE || 'judge789',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_techquiz_jwt_key_2026_offline',
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/techquiz.db'),
  UPLOADS_DIR: path.resolve(__dirname, '../../uploads'),
  GROQ_API_KEY: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : '',
};

export function getLanIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}
