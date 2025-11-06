// Script to remove Test Provider from production database
// Run with: npx ts-node scripts/remove-test-provider.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeTestProvider() {
  try {
    console.log('🔍 Looking for Test Provider...');
    
    // Find the Test Provider user
    const testProvider = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'provider@example.com' },
          { name: 'Test Provider' }
        ]
      },
      include: {
        providerProfile: {
          include: {
            services: true,
            availability: true
          }
        }
      }
    });

    if (!testProvider) {
      console.log('✅ Test Provider not found. Nothing to remove.');
      return;
    }

    console.log(`📋 Found Test Provider: ${testProvider.name} (ID: ${testProvider.id})`);

    // Delete related data first (due to foreign key constraints)
    if (testProvider.providerProfile) {
      const profile = testProvider.providerProfile;
      
      console.log('🗑️  Deleting provider services...');
      await prisma.providerService.deleteMany({
        where: { providerId: profile.id }
      });

      console.log('🗑️  Deleting provider availability...');
      await prisma.providerAvailability.deleteMany({
        where: { providerId: profile.id }
      });

      console.log('🗑️  Deleting provider profile...');
      await prisma.providerProfile.delete({
        where: { id: profile.id }
      });
    }

    // Delete any bookings associated with this provider
    console.log('🗑️  Deleting related bookings...');
    await prisma.booking.deleteMany({
      where: { providerId: testProvider.id }
    });

    // Delete reviews (via bookings)
    console.log('🗑️  Deleting reviews...');
    const bookings = await prisma.booking.findMany({
      where: { providerId: testProvider.id },
      select: { id: true }
    });
    const bookingIds = bookings.map(b => b.id);
    if (bookingIds.length > 0) {
      await prisma.review.deleteMany({
        where: { bookingId: { in: bookingIds } }
      });
    }

    // Finally delete the user
    console.log('🗑️  Deleting Test Provider user...');
    await prisma.user.delete({
      where: { id: testProvider.id }
    });

    console.log('✅ Test Provider removed successfully!');
  } catch (error) {
    console.error('❌ Error removing Test Provider:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeTestProvider()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

