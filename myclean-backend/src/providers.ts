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

// Create or update provider profile
router.post("/profile", async (req, res) => {
  try {
    console.log("=== RECEIVED PROFILE DATA ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("=== END RECEIVED DATA ===");
    
    const profileSchema = z.object({
      userId: z.number(),
      basicInfo: z.object({
        fullName: z.string().min(1),
        phone: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zipCode: z.string().min(1),
        bio: z.string().min(1),
      }),
      professional: z.object({
        yearsExperience: z.string().min(1),
        hasInsurance: z.boolean(),
        insuranceProvider: z.string().optional(),
        hasVehicle: z.boolean(),
        hasEquipment: z.boolean(),
        certifications: z.string().optional(),
      }),
      services: z.array(z.object({
        name: z.string(),
        rate: z.string(),
        selected: z.boolean(),
      })),
      availability: z.array(z.object({
        day: z.string(),
        enabled: z.boolean(),
        startTime: z.string(),
        endTime: z.string(),
      })),
      settings: z.object({
        maxBookingsPerDay: z.string(),
        advanceBookingDays: z.string(),
      }),
    });

    const validatedData = profileSchema.parse(req.body);

    // Update user's name and phone
    await prisma.user.update({
      where: { id: validatedData.userId },
      data: {
        name: validatedData.basicInfo.fullName,
        phone: validatedData.basicInfo.phone,
      },
    });

    // Create or update provider profile
    const profile = await prisma.providerProfile.upsert({
      where: { userId: validatedData.userId },
      create: {
        userId: validatedData.userId,
        bio: validatedData.basicInfo.bio,
        address: validatedData.basicInfo.address,
        city: validatedData.basicInfo.city,
        state: validatedData.basicInfo.state,
        zipCode: validatedData.basicInfo.zipCode,
        yearsExperience: validatedData.professional.yearsExperience,
        hasInsurance: validatedData.professional.hasInsurance,
        insuranceProvider: validatedData.professional.insuranceProvider || null,
        hasVehicle: validatedData.professional.hasVehicle,
        hasEquipment: validatedData.professional.hasEquipment,
        certifications: validatedData.professional.certifications || null,
        profileComplete: true,
        isActive: true,  // Provider is active immediately
        isVerified: true,  // Auto-verify for demo (in production, admin would verify)
      },
      update: {
        bio: validatedData.basicInfo.bio,
        address: validatedData.basicInfo.address,
        city: validatedData.basicInfo.city,
        state: validatedData.basicInfo.state,
        zipCode: validatedData.basicInfo.zipCode,
        yearsExperience: validatedData.professional.yearsExperience,
        hasInsurance: validatedData.professional.hasInsurance,
        insuranceProvider: validatedData.professional.insuranceProvider || null,
        hasVehicle: validatedData.professional.hasVehicle,
        hasEquipment: validatedData.professional.hasEquipment,
        certifications: validatedData.professional.certifications || null,
        profileComplete: true,
        isActive: true,  // Ensure provider stays active on update
        updatedAt: new Date(),
      },
    });

    // Delete existing services and availability to replace with new ones
    await prisma.providerService.deleteMany({
      where: { providerId: profile.id },
    });

    await prisma.providerAvailability.deleteMany({
      where: { providerId: profile.id },
    });

    // Create services
    const selectedServices = validatedData.services.filter(s => s.selected && s.rate);
    if (selectedServices.length > 0) {
      await prisma.providerService.createMany({
        data: selectedServices.map(service => ({
          providerId: profile.id,
          serviceName: service.name,
          pricePerHour: Math.round(parseFloat(service.rate) * 100), // Convert to cents
          durationMin: 60, // Default 1 hour minimum
          isActive: true,
        })),
      });
    }

    // Create availability
    const enabledDays = validatedData.availability.filter(a => a.enabled);
    if (enabledDays.length > 0) {
      await prisma.providerAvailability.createMany({
        data: enabledDays.map(avail => ({
          providerId: profile.id,
          dayOfWeek: avail.day.toUpperCase(),
          startTime: avail.startTime,
          endTime: avail.endTime,
          isAvailable: true,
        })),
      });
    }

    // Fetch complete profile with relations
    const completeProfile = await prisma.providerProfile.findUnique({
      where: { id: profile.id },
      include: {
        services: true,
        availability: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Profile created successfully!",
      profile: completeProfile,
    });
  } catch (error) {
    console.error("Profile creation error:", error);
    if (error instanceof z.ZodError) {
      console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ 
        error: "Invalid data", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create provider profile" });
  }
});

// Get provider's own profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        services: true,
        availability: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

export default router;
