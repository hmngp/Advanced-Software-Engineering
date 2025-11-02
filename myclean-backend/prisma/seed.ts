/// <reference types="node" />

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.review.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.providerService.deleteMany(),
    prisma.providerAvailability.deleteMany(),
    prisma.providerProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('✅ Old data cleared.');

  const customerPasswordHash = await bcrypt.hash('Customer@123', 10);
  const providerPasswordHash = await bcrypt.hash('Provider@123', 10);

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      name: 'Test Customer',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
    },
  });

  const provider1 = await prisma.user.create({
    data: {
      email: 'provider@example.com',
      name: 'Test Provider',
      passwordHash: providerPasswordHash,
      role: 'PROVIDER',
    },
  });

  const profile1 = await prisma.providerProfile.create({
    data: {
      userId: provider1.id,
      bio: 'Experienced cleaner available for all your needs.',
      yearsExperience: '5',
      isVerified: true,
      isActive: true,
      averageRating: 4.5,
      totalReviews: 1,
    },
  });

  const service1 = await prisma.providerService.create({
    data: {
      providerId: profile1.id,
      serviceName: 'Standard Home Cleaning',
      pricePerHour: 3000,
      durationMin: 120,
    },
  });

  const booking1 = await prisma.booking.create({
    data: {
      customerId: customer1.id,
      providerId: provider1.id,
      serviceId: service1.id,
      bookingDate: new Date(),
      startTime: '10:00',
      endTime: '12:00',
      address: '123 Main St',
      city: 'Testville',
      state: 'TS',
      zipCode: '12345',
      status: 'ACCEPTED',
      totalPrice: 6000,
      paymentStatus: 'PAID',
    },
  });

  await prisma.notification.create({
    data: {
      userId: customer1.id,
      type: 'BOOKING_ACCEPTED',
      title: 'Booking Accepted!',
      message: `Your booking #${booking1.id} with Test Provider has been accepted.`,
    },
  });

  console.log('✅ Database seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exitCode = 1; // ✅ safe exit
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
