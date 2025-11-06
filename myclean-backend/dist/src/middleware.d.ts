import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        sub: number;
        role: string;
    };
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => any;
//# sourceMappingURL=middleware.d.ts.map