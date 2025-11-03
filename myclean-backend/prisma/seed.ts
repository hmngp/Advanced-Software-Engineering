/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.providerService.deleteMany();
  await prisma.providerAvailability.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();

  const password1 = await bcrypt.hash('customer123', 10);
  const password2 = await bcrypt.hash('provider123', 10);

  const customer = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      name: 'Test Customer',
      passwordHash: password1,
      role: 'CUSTOMER',
    },
  });

  const providerUser = await prisma.user.create({
    data: {
      email: 'provider@example.com',
      name: 'Test Provider',
      passwordHash: password2,
      role: 'PROVIDER',
    },
  });

  const profile = await prisma.providerProfile.create({
    data: {
      userId: providerUser.id,
      bio: 'Experienced cleaner available.',
      yearsExperience: '5',
      isVerified: true,
      isActive: true,
      averageRating: 4.5,
      totalReviews: 1
      // visibility: 'ALL' // if you keep the enum
    },
  });

  await prisma.providerService.create({
    data: {
      providerId: profile.id,
      serviceName: 'Standard Home Cleaning',
      pricePerHour: 3000,
      durationMin: 120,
    },
  });

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
