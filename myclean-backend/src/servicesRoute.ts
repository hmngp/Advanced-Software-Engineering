// src/servicesRoute.ts
import { Router, Request, Response } from "express";
import { prisma } from "./prisma";

const router = Router();

/**
 * GET /api/services
 * Returns all active provider services with minimal provider info.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.providerService.findMany({
      where: { isActive: true },
      select: {
        id: true,
        serviceName: true,
        description: true,
        pricePerHour: true,
        durationMin: true,
        provider: {
          select: {
            id: true,
            user: { select: { id: true, name: true, profileImage: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    // Optionally flatten provider info for frontend convenience
    const services = rows.map((s) => ({
      id: s.id,
      serviceName: s.serviceName,
      description: s.description,
      pricePerHour: s.pricePerHour,
      durationMin: s.durationMin,
      provider: {
        profileId: s.provider.id,
        userId: s.provider.user.id,
        name: s.provider.user.name,
        profileImage: s.provider.user.profileImage,
      },
    }));

    res.json({ success: true, services });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch services" });
  }
});

export default router;
