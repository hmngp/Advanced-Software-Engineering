"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Clear existing data in the correct order
    console.log('Clearing old data...');
    await prisma.message.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.review.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.providerService.deleteMany();
    await prisma.providerAvailability.deleteMany();
    await prisma.providerProfile.deleteMany();
    await prisma.user.deleteMany();
    console.log('Old data cleared.');
    // --- Create Test Users ---
    console.log('Creating test users...');
    const customer1 = await prisma.user.create({
        data: {
            email: 'customer@example.com',
            name: 'Test Customer',
            passwordHash: 'hashed_password_123', // Replace with a real hash if testing login
            role: 'CUSTOMER',
        },
    });
    const provider1 = await prisma.user.create({
        data: {
            email: 'provider@example.com',
            name: 'Test Provider',
            passwordHash: 'hashed_password_456', // Replace with a real hash if testing login
            role: 'PROVIDER',
        },
    });
    // --- Create Provider Profile & Services ---
    console.log('Creating provider profile...');
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
            pricePerHour: 3000, // in cents ($30.00)
            durationMin: 120,
        },
    });
    // --- Create a Booking ---
    console.log('Creating test booking...');
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
            totalPrice: 6000, // in cents ($60.00)
            paymentStatus: 'PAID',
        },
    });
    // --- Create a Notification ---
    console.log('Creating test notification...');
    await prisma.notification.create({
        data: {
            userId: customer1.id,
            type: 'BOOKING_ACCEPTED',
            title: 'Booking Accepted!',
            message: 'Your booking with Test Provider has been accepted.',
        },
    });
    console.log('✅ Database seed complete!');
}
main()
    .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map