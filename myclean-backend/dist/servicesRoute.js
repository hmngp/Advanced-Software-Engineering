"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/servicesRoute.ts
const express_1 = require("express");
const prisma_1 = require("./prisma");
const router = (0, express_1.Router)();
/**
 * GET /api/services
 * Returns all active provider services with minimal provider info.
 */
router.get("/", async (_req, res) => {
    try {
        const rows = await prisma_1.prisma.providerService.findMany({
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
    }
    catch (e) {
        res.status(500).json({ success: false, error: "Failed to fetch services" });
    }
});
exports.default = router;
