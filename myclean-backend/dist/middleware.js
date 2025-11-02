"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const authenticateToken = (req, res, next) => {
    const authHeader = req.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) {
        res.sendStatus(401); // don't "return res..." -> keep return type void
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (typeof payload === 'string') {
            res.sendStatus(401);
            return;
        }
        const { sub, role } = payload;
        if (sub == null || role == null) {
            res.sendStatus(401);
            return;
        }
        // attach a normalized user object
        req.user = { sub: Number(sub), role: String(role) };
        next();
    }
    catch {
        res.sendStatus(403);
    }
};
exports.authenticateToken = authenticateToken;
