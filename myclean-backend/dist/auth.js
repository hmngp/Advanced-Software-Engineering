"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = require("./prisma");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['CUSTOMER', 'PROVIDER', 'ADMIN']).optional().default('CUSTOMER'),
});
router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const { name, email, password, role } = parsed.data;
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ error: "Email already in use" });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({ data: { name, email, passwordHash, role } });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: "Invalid credentials" });
    const token = jsonwebtoken_1.default.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
exports.default = router;
