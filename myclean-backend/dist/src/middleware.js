"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null)
        return res.sendStatus(401);
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (typeof payload === 'string')
            return res.sendStatus(401);
        const typedPayload = payload;
        if (!typedPayload.sub || !typedPayload.role)
            return res.sendStatus(401);
        req.user = {
            sub: typedPayload.sub,
            role: typedPayload.role,
        };
        next();
    }
    catch (err) {
        return res.sendStatus(403);
    }
};
exports.authenticateToken = authenticateToken;
//# sourceMappingURL=middleware.js.map