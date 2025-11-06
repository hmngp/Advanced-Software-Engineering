import { Router } from "express";
import { prisma } from "./prisma";
import { z } from "zod";

const router = Router();

// Search providers with filters
router.get("/search", async (req, res) => {
  try {
    const { city, state, zipCode, service, minRating, maxPrice, date } = req.query;

    // Build where clause dynamically
    const where: any = {
      role: "PROVIDER",
      providerProfile: {
        isActive: true,
        isVerified: true,
      },
    };

    if (city) {
      where.providerProfile.city = { contains: city as string, mode: "insensitive" };
    }

    if (state) {
      where.providerProfile.state = state;
    }

    if (zipCode) {
      where.providerProfile.zipCode = zipCode;
    }

    if (minRating) {
      where.providerProfile.averageRating = { gte: parseFloat(minRating as string) };
    }

    // Get providers with their profiles and services
    const providers = await prisma.user.findMany({
      where,
      include: {
        providerProfile: {
          include: {
            services: {
              where: {
                isActive: true,
                ...(service && { serviceName: { contains: service as string, mode: "insensitive" } }),
                ...(maxPrice && { pricePerHour: { lte: parseInt(maxPrice as string) * 100 } }),
              },
            },
            availability: true,
          },
        },
      },
    });

    // Filter out providers without any matching services
    const filteredProviders = providers.filter(p => 
      p.providerProfile?.services && p.providerProfile.services.length > 0
    );

    // Format response
    const formattedProviders = filteredProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      profileImage: provider.profileImage,
      profile: {
        bio: provider.providerProfile?.bio,
        yearsExperience: provider.providerProfile?.yearsExperience,
        city: provider.providerProfile?.city,
        state: provider.providerProfile?.state,
        zipCode: provider.providerProfile?.zipCode,
        averageRating: provider.providerProfile?.averageRating,
        totalReviews: provider.providerProfile?.totalReviews,
        totalBookings: provider.providerProfile?.totalBookings,
        hasInsurance: provider.providerProfile?.hasInsurance,
        hasVehicle: provider.providerProfile?.hasVehicle,
        hasEquipment: provider.providerProfile?.hasEquipment,
      },
      services: provider.providerProfile?.services.map(s => ({
        id: s.id,
        name: s.serviceName,
        description: s.description,
        pricePerHour: s.pricePerHour / 100, // Convert cents to dollars
        durationMin: s.durationMin,
      })),
      availability: provider.providerProfile?.availability,
    }));

    res.json({
      success: true,
      count: formattedProviders.length,
      providers: formattedProviders,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to search providers" });
  }
});

// Get single provider details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await prisma.user.findUnique({
      where: { id: parseInt(id), role: "PROVIDER" },
      include: {
        providerProfile: {
          include: {
            services: {
              where: { isActive: true },
            },
            availability: true,
          },
        },
        providerBookings: {
          where: { status: "COMPLETED" },
          include: {
            review: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!provider || !provider.providerProfile) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Calculate review statistics
    const reviews = provider.providerBookings
      .filter(b => b.review)
      .map(b => ({
        id: b.review!.id,
        rating: b.review!.rating,
        comment: b.review!.comment,
        photos: b.review!.photos,
        customerName: b.customer.name,
        createdAt: b.review!.createdAt,
      }));

    const formattedProvider = {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      profileImage: provider.profileImage,
      profile: {
        bio: provider.providerProfile.bio,
        yearsExperience: provider.providerProfile.yearsExperience,
        city: provider.providerProfile.city,
        state: provider.providerProfile.state,
        zipCode: provider.providerProfile.zipCode,
        address: provider.providerProfile.address,
        averageRating: provider.providerProfile.averageRating,
        totalReviews: provider.providerProfile.totalReviews,
        totalBookings: provider.providerProfile.totalBookings,
        hasInsurance: provider.providerProfile.hasInsurance,
        insuranceProvider: provider.providerProfile.insuranceProvider,
        hasVehicle: provider.providerProfile.hasVehicle,
        hasEquipment: provider.providerProfile.hasEquipment,
        certifications: provider.providerProfile.certifications,
      },
      services: provider.providerProfile.services.map(s => ({
        id: s.id,
        name: s.serviceName,
        description: s.description,
        pricePerHour: s.pricePerHour / 100,
        durationMin: s.durationMin,
      })),
      availability: provider.providerProfile.availability,
      reviews,
    };

    res.json({
      success: true,
      provider: formattedProvider,
    });
  } catch (error) {
    console.error("Get provider error:", error);
    res.status(500).json({ error: "Failed to get provider details" });
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

