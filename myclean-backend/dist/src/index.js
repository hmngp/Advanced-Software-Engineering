"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const prisma_1 = require("./prisma");
const auth_1 = __importDefault(require("./auth"));
const providers_1 = __importDefault(require("./providers"));
const bookings_1 = __importDefault(require("./bookings"));
const reviews_1 = __importDefault(require("./reviews"));
const middleware_1 = require("./middleware");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
// CORS configuration - accept multiple origins
const allowedOrigins = [
    "http://localhost:3000",
    "https://myclean-project.vercel.app",
    "https://advanced-software-engineering-orpin.vercel.app"
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", auth_1.default);
// New API routes for Iteration 2
app.use("/api/providers", providers_1.default);
app.use("/api/bookings", bookings_1.default);
app.use("/api/reviews", reviews_1.default);
// --- ADMIN ROUTES ---
app.get("/api/users", middleware_1.authenticateToken, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
    }
    const users = await prisma_1.prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
        },
    });
    res.json(users);
});
// Notification routes
app.get("/api/notifications/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        res.json({ success: true, notifications });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to get notifications" });
    }
});
app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma_1.prisma.notification.update({
            where: { id: parseInt(id) },
            data: { isRead: true },
        });
        res.json({ success: true, notification });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update notification" });
    }
});
// Message routes
app.get("/api/messages/booking/:bookingId", async (req, res) => {
    try {
        const { bookingId } = req.params;
        const messages = await prisma_1.prisma.message.findMany({
            where: { bookingId: parseInt(bookingId) },
            include: {
                sender: { select: { id: true, name: true, profileImage: true } },
                receiver: { select: { id: true, name: true, profileImage: true } },
            },
            orderBy: { createdAt: "asc" },
        });
        res.json({ success: true, messages });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to get messages" });
    }
});
app.post("/api/messages", async (req, res) => {
    try {
        const { bookingId, senderId, receiverId, content } = req.body;
        const message = await prisma_1.prisma.message.create({
            data: { bookingId, senderId, receiverId, content },
            include: {
                sender: { select: { id: true, name: true, profileImage: true } },
            },
        });
        // Create notification for receiver
        await prisma_1.prisma.notification.create({
            data: {
                userId: receiverId,
                type: "NEW_MESSAGE",
                title: "New Message",
                message: `${message.sender.name} sent you a message`,
                link: `/my-bookings`,
            },
        });
        res.status(201).json({ success: true, message });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to send message" });
    }
});
const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 MyClean Backend API running on port ${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Health check: http://localhost:${port}/api/health`);
});
//# sourceMappingURL=index.js.map