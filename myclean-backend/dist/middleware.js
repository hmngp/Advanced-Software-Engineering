"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
function authenticateToken(req, res, next) {
    const authHeader = req.header('authorization');
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;
    if (!token)
        return res.sendStatus(401);
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (typeof payload === 'string' || !payload.sub)
            return res.sendStatus(401);
        req.user = {
            sub: Number(payload.sub),
            role: payload.role,
        };
        next();
    }
    catch {
        return res.sendStatus(403);
    }
}
