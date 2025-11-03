import { Router, Request, Response } from 'express';
import { prisma } from './prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const providers = await prisma.providerProfile.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: true,
      },
      orderBy: { averageRating: 'desc' },
    });
    res.json({ success: true, providers });
  } catch {
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const profile = await prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: true,
      },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ success: true, profile });
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
