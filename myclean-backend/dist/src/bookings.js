"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("./prisma");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const createBookingSchema = zod_1.z.object({
    customerId: zod_1.z.number(),
    providerId: zod_1.z.number(),
    serviceId: zod_1.z.number(),
    bookingDate: zod_1.z.string(),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    address: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    zipCode: zod_1.z.string().min(1),
    specialInstructions: zod_1.z.string().optional(),
    totalPrice: zod_1.z.number().positive(),
});
// Create a new booking
router.post("/", async (req, res) => {
    try {
        const parsed = createBookingSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.format() });
        }
        const data = parsed.data;
        // Verify the service exists and belongs to the provider
        const service = await prisma_1.prisma.providerService.findFirst({
            where: {
                id: data.serviceId,
                provider: {
                    userId: data.providerId,
                },
                isActive: true,
            },
        });
        if (!service) {
            return res.status(404).json({ error: "Service not found or not available" });
        }
        // Create the booking
        const booking = await prisma_1.prisma.booking.create({
            data: {
                customerId: data.customerId,
                providerId: data.providerId,
                serviceId: data.serviceId,
                bookingDate: new Date(data.bookingDate),
                startTime: data.startTime,
                endTime: data.endTime,
                address: data.address,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                specialInstructions: data.specialInstructions,
                totalPrice: Math.round(data.totalPrice * 100), // Convert to cents
                status: "PENDING",
                paymentStatus: "PENDING",
            },
            include: {
                customer: {
                    select: { name: true, email: true, phone: true },
                },
                provider: {
                    select: { name: true, email: true, phone: true },
                },
                service: true,
            },
        });
        // Create notification for provider
        await prisma_1.prisma.notification.create({
            data: {
                userId: data.providerId,
                type: "BOOKING_REQUEST",
                title: "New Booking Request",
                message: `${booking.customer.name} has requested ${service.serviceName} for ${data.bookingDate}`,
                link: "/provider/dashboard",
            },
        });
        // Create notification for customer
        await prisma_1.prisma.notification.create({
            data: {
                userId: data.customerId,
                type: "BOOKING_PENDING",
                title: "Booking Request Sent",
                message: `Your booking request with ${booking.provider.name} is pending approval`,
                link: "/my-bookings",
            },
        });
        res.status(201).json({
            success: true,
            booking: {
                id: booking.id,
                bookingDate: booking.bookingDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                totalPrice: booking.totalPrice / 100,
                customer: booking.customer,
                provider: booking.provider,
                service: {
                    name: booking.service.serviceName,
                    description: booking.service.description,
                },
            },
        });
    }
    catch (error) {
        console.error("Create booking error:", error);
        res.status(500).json({ error: "Failed to create booking" });
    }
});
// Get bookings for a user (customer or provider)
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, status } = req.query;
        const where = {};
        if (role === "CUSTOMER") {
            where.customerId = parseInt(userId);
        }
        else if (role === "PROVIDER") {
            where.providerId = parseInt(userId);
        }
        else {
            // Get both
            where.OR = [
                { customerId: parseInt(userId) },
                { providerId: parseInt(userId) },
            ];
        }
        if (status) {
            where.status = status;
        }
        const bookings = await prisma_1.prisma.booking.findMany({
            where,
            include: {
                customer: {
                    select: { id: true, name: true, email: true, phone: true, profileImage: true },
                },
                provider: {
                    select: { id: true, name: true, email: true, phone: true, profileImage: true },
                },
                service: true,
                review: true,
            },
            orderBy: { bookingDate: "desc" },
        });
        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            address: booking.address,
            city: booking.city,
            state: booking.state,
            zipCode: booking.zipCode,
            specialInstructions: booking.specialInstructions,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            totalPrice: booking.totalPrice / 100,
            createdAt: booking.createdAt,
            customer: booking.customer,
            provider: booking.provider,
            service: {
                id: booking.service.id,
                name: booking.service.serviceName,
                description: booking.service.description,
                pricePerHour: booking.service.pricePerHour / 100,
            },
            review: booking.review,
        }));
        res.json({
            success: true,
            count: formattedBookings.length,
            bookings: formattedBookings,
        });
    }
    catch (error) {
        console.error("Get bookings error:", error);
        res.status(500).json({ error: "Failed to get bookings" });
    }
});
// Get single booking details
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: {
                customer: {
                    select: { id: true, name: true, email: true, phone: true, profileImage: true },
                },
                provider: {
                    select: { id: true, name: true, email: true, phone: true, profileImage: true },
                },
                service: true,
                review: true,
                messages: {
                    include: {
                        sender: {
                            select: { id: true, name: true, profileImage: true },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        res.json({
            success: true,
            booking: {
                id: booking.id,
                bookingDate: booking.bookingDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                address: booking.address,
                city: booking.city,
                state: booking.state,
                zipCode: booking.zipCode,
                specialInstructions: booking.specialInstructions,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                totalPrice: booking.totalPrice / 100,
                createdAt: booking.createdAt,
                customer: booking.customer,
                provider: booking.provider,
                service: {
                    id: booking.service.id,
                    name: booking.service.serviceName,
                    description: booking.service.description,
                    pricePerHour: booking.service.pricePerHour / 100,
                },
                review: booking.review,
                messages: booking.messages,
            },
        });
    }
    catch (error) {
        console.error("Get booking error:", error);
        res.status(500).json({ error: "Failed to get booking" });
    }
});
// Update booking status (accept/decline by provider, cancel by customer)
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body;
        if (!["ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: {
                customer: { select: { id: true, name: true } },
                provider: { select: { id: true, name: true } },
                service: { select: { serviceName: true } },
            },
        });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        // Verify user has permission
        if (status === "ACCEPTED" || status === "DECLINED") {
            if (booking.providerId !== userId) {
                return res.status(403).json({ error: "Only the provider can accept/decline bookings" });
            }
        }
        else if (status === "CANCELLED") {
            if (booking.customerId !== userId && booking.providerId !== userId) {
                return res.status(403).json({ error: "Unauthorized to cancel this booking" });
            }
        }
        // Update booking
        const updatedBooking = await prisma_1.prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status },
        });
        // Create notifications
        if (status === "ACCEPTED") {
            await prisma_1.prisma.notification.create({
                data: {
                    userId: booking.customerId,
                    type: "BOOKING_ACCEPTED",
                    title: "Booking Confirmed!",
                    message: `${booking.provider.name} has accepted your booking for ${booking.service.serviceName}`,
                    link: "/my-bookings",
                },
            });
        }
        else if (status === "DECLINED") {
            await prisma_1.prisma.notification.create({
                data: {
                    userId: booking.customerId,
                    type: "BOOKING_DECLINED",
                    title: "Booking Declined",
                    message: `${booking.provider.name} has declined your booking request`,
                    link: "/my-bookings",
                },
            });
        }
        else if (status === "CANCELLED") {
            const notifyUserId = userId === booking.customerId ? booking.providerId : booking.customerId;
            const notifyName = userId === booking.customerId ? booking.customer.name : booking.provider.name;
            await prisma_1.prisma.notification.create({
                data: {
                    userId: notifyUserId,
                    type: "BOOKING_CANCELLED",
                    title: "Booking Cancelled",
                    message: `${notifyName} has cancelled the booking for ${booking.service.serviceName}`,
                    link: userId === booking.customerId ? "/provider/dashboard" : "/my-bookings",
                },
            });
        }
        res.json({
            success: true,
            booking: {
                id: updatedBooking.id,
                status: updatedBooking.status,
            },
        });
    }
    catch (error) {
        console.error("Update booking status error:", error);
        res.status(500).json({ error: "Failed to update booking status" });
    }
});
// Delete/Cancel booking
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: parseInt(id) },
        });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        // Only customer can delete their own bookings and only if pending
        if (booking.customerId !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        if (booking.status !== "PENDING") {
            return res.status(400).json({ error: "Can only delete pending bookings" });
        }
        await prisma_1.prisma.booking.delete({
            where: { id: parseInt(id) },
        });
        res.json({
            success: true,
            message: "Booking deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete booking error:", error);
        res.status(500).json({ error: "Failed to delete booking" });
    }
});
exports.default = router;
//# sourceMappingURL=bookings.js.map