import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./prisma"; 
import authRouter from "./auth";
import providersRouter from "./providers";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import { authenticateToken, AuthRequest } from "./middleware";
import { initializeSocket } from "./socket";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);
console.log("🔌 Socket.IO initialized");

app.use(helmet());

// CORS configuration - accept multiple origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://myclean-project.vercel.app",
  "https://advanced-software-engineering-orpin.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow any Vercel deployment URL
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Check specific allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

// New API routes for Iteration 2
app.use("/api/providers", providersRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/reviews", reviewsRouter);

// --- ADMIN ROUTES ---

app.get("/api/users", authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const users = await prisma.user.findMany({
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
    const notifications = await prisma.notification.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Message routes
app.get("/api/messages/booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const messages = await prisma.message.findMany({
      where: { bookingId: parseInt(bookingId) },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
        receiver: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: "Failed to get messages" });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { bookingId, senderId, receiverId, content } = req.body;
    const message = await prisma.message.create({
      data: { bookingId, senderId, receiverId, content },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
      },
    });
    
    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "NEW_MESSAGE",
        title: "New Message",
        message: `${message.sender.name} sent you a message`,
        link: `/my-bookings`,
      },
    });
    
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`🚀 MyClean Backend API running on port ${port}`);
  console.log(`🔌 WebSocket server running on same port`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${port}/api/health`);
});