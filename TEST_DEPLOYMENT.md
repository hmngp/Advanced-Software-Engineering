# 🧪 Deployment Test Checklist

## Backend Tests (Render)

Your backend URL: `https://myclean-backend-ozcg.onrender.com`

### ✅ Test 1: Health Check
```bash
curl https://myclean-backend-ozcg.onrender.com/api/health
```
**Expected:** `{"ok":true}`
**Status:** ✅ PASSED

---

### Test 2: Database Connection

Run in Render Shell:
```bash
npx prisma db push
```

**Expected Output:**
```
✔ Your database is now in sync with your Prisma schema.
✔ Generated Prisma Client
```

**Status:** ⏳ PENDING (Run this now!)

---

### Test 3: Seed Database

Run in Render Shell:
```bash
npm run seed
```

**Expected Output:**
```
✔ Created sample users
✔ Created sample providers
✔ Created sample bookings
✔ Seeded database successfully
```

**Status:** ⏳ PENDING (Run this after Test 2)

---

### Test 4: Registration Endpoint

After database is seeded, test registration:

```bash
curl -X POST https://myclean-backend-ozcg.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123",
    "role": "CUSTOMER"
  }'
```

**Expected:** User object with ID, name, email

**Status:** ⏳ PENDING (Run this after database setup)

---

## Frontend Tests (Vercel)

Your frontend URL: (check Vercel dashboard)

### Test 1: Homepage Loads
- Visit your Vercel URL
- Should see MyClean landing page
- No 404 errors

### Test 2: Environment Variables
Vercel Dashboard → Settings → Environment Variables

**Check:**
- [ ] `REACT_APP_API_URL` exists
- [ ] Value: `https://myclean-backend-ozcg.onrender.com` (no trailing slash)
- [ ] Applied to: Production, Preview, Development

### Test 3: Registration Flow
1. Go to `/register` page
2. Fill out registration form
3. Submit
4. Should redirect to appropriate page (not show error)

### Test 4: Login Flow
1. Go to `/login` page
2. Use seeded credentials:
   - Email: `customer@example.com`
   - Password: `password123`
3. Should login successfully

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot GET /"
**Status:** ✅ This is NORMAL! Backend has no root route.
**Fix:** Use `/api/health` or other API endpoints instead.

---

### Issue: "Registration failed"
**Possible Causes:**
1. Database not initialized
2. Database tables not created
3. Frontend can't reach backend
4. CORS issues

**Fix:**
1. Run `npx prisma db push` in Render Shell
2. Run `npm run seed` in Render Shell
3. Check browser console for actual error
4. Verify Vercel environment variable

---

### Issue: CORS Errors in Browser Console
**Cause:** Backend not allowing frontend origin

**Fix:** Backend already configured for:
```javascript
allowedOrigins = [
  "http://localhost:3000",
  "https://myclean-project.vercel.app",
  "https://advanced-software-engineering-orpin.vercel.app"
]
```

If your Vercel URL is different, we need to update backend CORS.

---

### Issue: "Failed to fetch" or Network Error
**Possible Causes:**
1. Backend is sleeping (free tier)
2. Wrong backend URL in frontend
3. Typo in environment variable

**Fix:**
1. Visit backend health endpoint to wake it up
2. Check Vercel environment variable
3. Redeploy frontend after fixing

---

## 🎯 Step-by-Step Fix Order

### Phase 1: Initialize Database ⏳ DO THIS NOW!

1. **Open Render Shell**
   - https://dashboard.render.com
   - Click your service
   - Shell → Launch Shell

2. **Run Commands:**
   ```bash
   npx prisma db push --accept-data-loss
   npm run seed
   ```

3. **Wait for Success Messages**

---

### Phase 2: Verify Frontend Environment ✅

1. **Check Vercel**
   - https://vercel.com/dashboard
   - Your project → Settings → Environment Variables
   - Confirm: `REACT_APP_API_URL = https://myclean-backend-ozcg.onrender.com`

2. **Redeploy if Needed**
   - If you added/changed the variable
   - Deployments → Redeploy

---

### Phase 3: Test Registration 🧪

1. **Go to Frontend**
2. **Sign Up Page**
3. **Fill Form:**
   - Name: Test User
   - Email: test@test.com
   - Password: test123
   - Role: Customer

4. **Submit → Should Work! ✅**

---

## 📊 Database Schema Check

After running `npx prisma db push`, verify tables exist:

Run in Render Shell:
```bash
# Check if database is accessible
npx prisma db pull
```

Should show your schema is in sync.

---

## 🔍 Debug Commands

### Check Backend Logs (Render)
1. Render Dashboard → Your Service
2. Click **"Logs"** tab
3. Look for errors

### Check Frontend Console (Browser)
1. Open your Vercel app
2. Press F12 (Developer Tools)
3. Go to **Console** tab
4. Try registration
5. Look for red errors

### Check Network Requests (Browser)
1. Developer Tools (F12)
2. **Network** tab
3. Try registration
4. Click on failed request
5. Check:
   - Request URL (should be your Render backend)
   - Status code
   - Response body

---

## ✅ Success Checklist

Everything working when:

- [ ] Backend health check returns `{"ok":true}`
- [ ] Database tables created (`npx prisma db push` success)
- [ ] Database seeded with sample data
- [ ] Vercel environment variable set correctly
- [ ] Frontend loads without errors
- [ ] Registration works
- [ ] Login works
- [ ] Can navigate to all pages
- [ ] No CORS errors in console

---

## 🆘 Still Having Issues?

Share:
1. Screenshot of Render Shell commands output
2. Screenshot of browser console errors
3. Screenshot of Network tab showing failed request
4. Vercel environment variables screenshot

---

## 🎉 Expected Final State

**Backend:**
- ✅ Running on: https://myclean-backend-ozcg.onrender.com
- ✅ Health check: https://myclean-backend-ozcg.onrender.com/api/health
- ✅ Database: Initialized with tables and sample data
- ✅ All API endpoints working

**Frontend:**
- ✅ Deployed on Vercel
- ✅ Environment variable pointing to backend
- ✅ Registration working
- ✅ Login working
- ✅ All pages loading
- ✅ API calls succeeding

---

**Next Action: Open Render Shell and run the database commands!** 🚀

