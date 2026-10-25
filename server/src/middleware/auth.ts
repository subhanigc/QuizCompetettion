import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export interface AuthenticatedRequest extends Request {
  userRole?: 'admin' | 'judge' | 'team';
  teamId?: string;
  teamName?: string;
  sessionId?: string;
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    req.userRole = 'admin';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

export function requireJudge(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const judgeCode = req.headers['x-judge-code'] as string;
  const authHeader = req.headers.authorization;

  if (judgeCode && judgeCode.trim() === CONFIG.JUDGE_CODE) {
    req.userRole = 'judge';
    next();
    return;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { role: string };
      if (decoded.role === 'judge' || decoded.role === 'admin') {
        req.userRole = 'judge';
        next();
        return;
      }
    } catch {
      // Fall through to error
    }
  }

  res.status(401).json({ error: 'Valid judge code or token required' });
}
