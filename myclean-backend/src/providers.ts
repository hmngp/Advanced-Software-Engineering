// src/providers.ts
import { Router, Request, Response } from "express";
import { prisma } from "./prisma";
import { authenticateToken, AuthRequest } from "./middleware";

const router = Router();

/* ---------- PUBLIC: list providers (you already have this) ---------- */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const providers = await prisma.providerProfile.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: true,
      },
      orderBy: { averageRating: "desc" },
    });
    res.json({ success: true, providers });
  } catch (error) {
    console.error("Error fetching providers:", error);
    res.status(500).json({ error: "Failed to list providers", details: error instanceof Error ? error.message : String(error) });
  }
});

/* ---------- PUBLIC: provider by id (you already have this) ---------- */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const profile = await prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: true,
      },
    });
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching provider by id:", error);
    res.status(500).json({ error: "Failed to fetch profile", details: error instanceof Error ? error.message : String(error) });
  }
});

/* ---------- PRIVATE: get my provider profile (for edit screens) ---------- */
router.get("/me/profile", authenticateToken, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const me = await prisma.providerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, profileImage: true } },
      services: true,
    },
  });

  // if not found, create a basic one now (safety)
  if (!me) {
    const created = await prisma.providerProfile.create({
      data: { userId, isActive: true, isVerified: false, profileComplete: false },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: true,
      },
    });
    return res.json({ success: true, profile: created });
  }

  res.json({ success: true, profile: me });
});

/* ---------- PRIVATE: upsert my provider profile ---------- */
router.post("/me/profile", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const {
      bio,
      yearsExperience,
      hasInsurance,
      insuranceProvider,
      hasVehicle,
      hasEquipment,
      certifications,
      address,
      city,
      state,
      zipCode,
      isActive = true,
      phone, // Optional: update user's phone
      name, // Optional: update user's name
    } = req.body ?? {};

    // Update user's phone and name if provided
    if (phone || name) {
      const userUpdate: any = {};
      if (phone) userUpdate.phone = phone;
      if (name) userUpdate.name = name;
      
      await prisma.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    const upserted = await prisma.providerProfile.upsert({
      where: { userId },
      update: {
        bio,
        yearsExperience,
        hasInsurance: !!hasInsurance,
        insuranceProvider: insuranceProvider || null,
        hasVehicle: !!hasVehicle,
        hasEquipment: !!hasEquipment,
        certifications,
        address,
        city,
        state,
        zipCode,
        isActive: !!isActive,
        profileComplete: true,
      },
      create: {
        userId,
        bio,
        yearsExperience,
        hasInsurance: !!hasInsurance,
        insuranceProvider: insuranceProvider || null,
        hasVehicle: !!hasVehicle,
        hasEquipment: !!hasEquipment,
        certifications,
        address,
        city,
        state,
        zipCode,
        isActive: !!isActive,
        profileComplete: true,
      },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: true,
      },
    });

    res.json({ success: true, profile: upserted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save provider profile" });
  }
});

/* ---------- PRIVATE: replace my services (bulk) ---------- */
router.post("/me/services", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Expect: [{ serviceName, pricePerHour (cents), durationMin, description? }, ...]
    const services = Array.isArray(req.body?.services) ? req.body.services : [];

    const provider = await prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) return res.status(404).json({ error: "Provider profile not found" });

    // clear old
    await prisma.providerService.deleteMany({ where: { providerId: provider.id } });

    // create new
    if (services.length) {
      await prisma.providerService.createMany({
        data: services.map((s: any) => ({
          providerId: provider.id,
          serviceName: s.serviceName,
          description: s.description ?? null,
          pricePerHour: Number(s.pricePerHour) || 0, // cents
          durationMin: Number(s.durationMin) || 60,
          isActive: true,
        })),
      });
    }

    const refreshed = await prisma.providerProfile.findUnique({
      where: { id: provider.id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: true,
      },
    });

    res.json({ success: true, profile: refreshed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save services" });
  }
});

export default router;
