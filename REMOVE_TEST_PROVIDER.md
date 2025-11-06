# 🗑️ Remove Test Provider from Database

The "Test Provider" has been removed from the seed file, so it won't be created again when seeding. However, if it already exists in your production database, you need to delete it manually.

## Option 1: Using the Script (Recommended)

If you have access to run scripts on your backend:

```bash
cd myclean-backend
npm run remove-test-provider
```

This will:
- Find the Test Provider user (by email `provider@example.com` or name `Test Provider`)
- Delete all related data (services, availability, bookings, reviews)
- Delete the provider profile
- Delete the user

## Option 2: Using Railway/Render Shell

If your backend is deployed on Railway or Render:

1. Go to your backend service dashboard
2. Open the **Shell** tab
3. Run:
   ```bash
   cd /app  # or your app directory
   npm run remove-test-provider
   ```

## Option 3: Direct SQL Query

If you have direct database access, you can run this SQL:

```sql
-- Find the Test Provider user ID first
SELECT id, email, name FROM "User" WHERE email = 'provider@example.com' OR name = 'Test Provider';

-- Then delete in this order (replace USER_ID with the actual ID):
-- 1. Delete provider services
DELETE FROM "ProviderService" WHERE "providerId" IN (
  SELECT id FROM "ProviderProfile" WHERE "userId" = USER_ID
);

-- 2. Delete provider availability
DELETE FROM "ProviderAvailability" WHERE "providerId" IN (
  SELECT id FROM "ProviderProfile" WHERE "userId" = USER_ID
);

-- 3. Delete bookings
DELETE FROM "Booking" WHERE "providerId" = USER_ID;

-- 4. Delete reviews
DELETE FROM "Review" WHERE "bookingId" IN (
  SELECT id FROM "Booking" WHERE "providerId" = USER_ID
);

-- 5. Delete provider profile
DELETE FROM "ProviderProfile" WHERE "userId" = USER_ID;

-- 6. Finally delete the user
DELETE FROM "User" WHERE id = USER_ID;
```

## Option 4: Using Prisma Studio

1. Open Prisma Studio:
   ```bash
   cd myclean-backend
   npx prisma studio
   ```
2. Navigate to **User** table
3. Find the user with email `provider@example.com` or name `Test Provider`
4. Delete the user (this should cascade delete related records)

## Verify Removal

After deletion, check that it's gone:

```bash
# Using the script
npm run remove-test-provider  # Should say "Test Provider not found"

# Or check via API
curl https://your-backend-url/api/providers
# Should not include "Test Provider" in the results
```

## ✅ What's Changed

- ✅ **Seed file updated**: Test Provider won't be created when seeding
- ✅ **Removal script added**: Easy way to delete from production
- ✅ **Future seeds**: Will only create real data, no test providers

---

**Note**: After removing the Test Provider, it will disappear from the "Find Cleaners" page immediately (or within 10 seconds due to polling).

