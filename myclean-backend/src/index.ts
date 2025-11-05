import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./prisma";
import authRouter from "./auth";
import providersRouter from "./providers";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import { authenticateToken, AuthRequest } from "./middleware";
import servicesRoute from "./servicesRoute";

const app = express();
app.use(helmet());

// CORS configuration - accept multiple origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://myclean-project.vercel.app",
  "https://advanced-software-engineering-orpin.vercel.app",
];
app.use("/api/services", servicesRoute);

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
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

app.post("/api/messages", async (req: Request, res: Response) => {
  try {
    const { bookingId, senderId, receiverId, content } = req.body as {
      bookingId: number;
      senderId: number;
      receiverId: number;
      content: string;
    };

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
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 MyClean Backend API running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✅ Health check: http://localhost:${port}/api/health`);
});
