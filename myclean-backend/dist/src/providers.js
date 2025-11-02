"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("./prisma");
const router = (0, express_1.Router)();
// Search providers with filters
router.get("/search", async (req, res) => {
    try {
        const { city, state, zipCode, service, minRating, maxPrice, date } = req.query;
        // Build where clause dynamically
        const where = {
            role: "PROVIDER",
            providerProfile: {
                isActive: true,
                isVerified: true,
            },
        };
        if (city) {
            where.providerProfile.city = { contains: city, mode: "insensitive" };
        }
        if (state) {
            where.providerProfile.state = state;
        }
        if (zipCode) {
            where.providerProfile.zipCode = zipCode;
        }
        if (minRating) {
            where.providerProfile.averageRating = { gte: parseFloat(minRating) };
        }
        // Get providers with their profiles and services
        const providers = await prisma_1.prisma.user.findMany({
            where,
            include: {
                providerProfile: {
                    include: {
                        services: {
                            where: {
                                isActive: true,
                                ...(service && { serviceName: { contains: service, mode: "insensitive" } }),
                                ...(maxPrice && { pricePerHour: { lte: parseInt(maxPrice) * 100 } }),
                            },
                        },
                        availability: true,
                    },
                },
            },
        });
        // Filter out providers without any matching services
        const filteredProviders = providers.filter(p => p.providerProfile?.services && p.providerProfile.services.length > 0);
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
    }
    catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Failed to search providers" });
    }
});
// Get single provider details
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const provider = await prisma_1.prisma.user.findUnique({
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
            id: b.review.id,
            rating: b.review.rating,
            comment: b.review.comment,
            photos: b.review.photos,
            customerName: b.customer.name,
            createdAt: b.review.createdAt,
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
    }
    catch (error) {
        console.error("Get provider error:", error);
        res.status(500).json({ error: "Failed to get provider details" });
    }
});
exports.default = router;
//# sourceMappingURL=providers.js.map