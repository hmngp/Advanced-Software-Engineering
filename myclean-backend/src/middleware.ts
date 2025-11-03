import type { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthUser {
  sub: number;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!token) return res.sendStatus(401);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
    if (typeof payload === 'string' || !payload.sub) return res.sendStatus(401);

    (req as AuthRequest).user = {
      sub: Number(payload.sub),
      role: (payload as JwtPayload).role as string,
    };
    next();
  } catch {
    return res.sendStatus(403);
  }
}
