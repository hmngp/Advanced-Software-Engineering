// src/middleware.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type AuthUser = { sub: number; role: string };

// WIDEN the user type so it's compatible with any augmentation elsewhere
export type AuthRequest = Request & { user?: AuthUser | string | JwtPayload };

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.sendStatus(401); // don't "return res..." -> keep return type void
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === 'string') {
      res.sendStatus(401);
      return;
    }

    const { sub, role } = payload as any;
    if (sub == null || role == null) {
      res.sendStatus(401);
      return;
    }

    // attach a normalized user object
    (req as AuthRequest).user = { sub: Number(sub), role: String(role) };
    next();
  } catch {
    res.sendStatus(403);
  }
};
