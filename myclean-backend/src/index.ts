import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import { createServer } from "http";
import { prisma } from "./prisma";
import authRouter from "./auth";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import servicesRoute from "./servicesRoute";
import providersRouter from "./providers";
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
  "https://advanced-software-engineering-orpin.vercel.app",
];

// Allow any Vercel preview/production domain
const isVercelDomain = (origin: string | undefined): boolean => {
  if (!origin) return false;
  return origin.includes(".vercel.app") || allowedOrigins.includes(origin);
};

app.use("/api/services", servicesRoute);

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        console.log("CORS: Allowing request with no origin");
        return callback(null, true);
      }

      // Check if it's localhost or allowed origin
      if (allowedOrigins.includes(origin) || isVercelDomain(origin)) {
        console.log(`CORS: Allowing origin: ${origin}`);
        return callback(null, true);
      }

      console.log(`CORS: Blocked origin: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

// Iteration 2 API routes
app.use("/api/providers", providersRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/reviews", reviewsRouter);

// Example protected route
app.get("/api/users", authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user; // safely cast when you need it
  // TODO: replace with real implementation
  res.json({ message: "Fetched user successfully", user });
});

// Notification routes
app.get("/api/notifications/:userId", async (req: Request, res: Response) => {
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

app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
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
app.get("/api/messages/booking/:bookingId", async (req: Request, res: Response) => {
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

app.patch("/api/messages/booking/:bookingId/read", async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body as { userId?: number };

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const result = await prisma.message.updateMany({
      where: {
        bookingId: parseInt(bookingId),
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ success: true, updated: result.count });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

app.post("/api/messages", async (req: Request, res: Response) => {
  try {
    const { bookingId, senderId, receiverId, content } = req.body as {
      bookingId: number;
      senderId: number;
      receiverId: number;
      content: string;
    };

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customerId: true,
        providerId: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const participants = [booking.customerId, booking.providerId];
    if (!participants.includes(senderId) || !participants.includes(receiverId)) {
      return res.status(403).json({ error: "Users are not part of this booking" });
    }

    const messageRecord = await prisma.message.create({
      data: { bookingId, senderId, receiverId, content },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
        receiver: { select: { id: true, name: true, profileImage: true } },
      },
    });

    const payload: MessagePayload = {
      id: messageRecord.id,
      bookingId: messageRecord.bookingId,
      senderId: messageRecord.senderId,
      receiverId: messageRecord.receiverId,
      content: messageRecord.content,
      isRead: messageRecord.isRead,
      createdAt: messageRecord.createdAt.toISOString(),
      sender: messageRecord.sender,
      receiver: messageRecord.receiver,
    };

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "NEW_MESSAGE",
        title: "New Message",
        message: `${messageRecord.sender.name} sent you a message`,
        link: `/my-bookings`,
      },
    });

    // Emit message to socket room
    io.to(`booking_${bookingId}`).emit("receive_message", {
      id: messageRecord.id,
      bookingId: messageRecord.bookingId,
      senderId: messageRecord.senderId,
      receiverId: messageRecord.receiverId,
      content: messageRecord.content,
      createdAt: messageRecord.createdAt.toISOString(),
      isRead: messageRecord.isRead,
      sender: messageRecord.sender,
    });

    res.status(201).json({ success: true, message: payload });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 MyClean Backend API running on port ${port}`);
  console.log(`🔌 WebSocket server running on same port`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✅ Health check: http://localhost:${port}/api/health`);
});
