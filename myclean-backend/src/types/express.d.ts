// src/types/express.d.ts
import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { sub: number; role: string } | string | JwtPayload;
    }
  }
}
export {};
