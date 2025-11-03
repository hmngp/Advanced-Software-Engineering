"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("./prisma");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const providers = await prisma_1.prisma.providerProfile.findMany({
            where: { isActive: true },
            include: {
                user: { select: { id: true, name: true, profileImage: true } },
                services: true,
            },
            orderBy: { averageRating: 'desc' },
        });
        res.json({ success: true, providers });
    }
    catch {
        res.status(500).json({ error: 'Failed to list providers' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const profile = await prisma_1.prisma.providerProfile.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, profileImage: true } },
                services: true,
            },
        });
        if (!profile)
            return res.status(404).json({ error: 'Profile not found' });
        res.json({ success: true, profile });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
exports.default = router;
