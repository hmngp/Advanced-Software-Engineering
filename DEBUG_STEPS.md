# 🔍 Debug Steps for "Failed to load providers"

## Step 1: Check Browser Console

1. Open your Vercel app: `https://myclean-project.vercel.app` (or your domain)
2. Open **Browser DevTools** (F12 or Right-click → Inspect)
3. Go to **Console** tab
4. Navigate to the "Find Your Perfect Cleaner" page
5. Look for these log messages:

### What to check:

**✅ Good signs:**
```
🌐 API Base URL: https://your-backend-url.onrender.com
🔍 Fetching providers...
✅ Providers fetched: X providers
```

**❌ Bad signs:**
```
🌐 API Base URL: http://localhost:4000  ← Still using localhost!
⚠️ REACT_APP_API_URL is not set!
❌ Error loading providers: ...
```

## Step 2: Check Network Tab

1. In DevTools, go to **Network** tab
2. Refresh the page
3. Look for requests to `/api/providers`
4. Click on the request and check:
   - **Status**: Should be `200` (not `404`, `500`, or `CORS error`)
   - **Request URL**: Should show your backend URL (not localhost)
   - **Response**: Should show JSON with providers array

### Common Errors:

| Status | Meaning | Fix |
|--------|---------|-----|
| `0` or `Failed` | Network error / CORS | Check backend is running & CORS config |
| `404` | Backend URL wrong | Check `REACT_APP_API_URL` value |
| `500` | Backend error | Check backend logs |
| `CORS error` | CORS blocked | Add your Vercel domain to backend CORS |

## Step 3: Verify Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your project
3. Go to **Settings** → **Environment Variables**
4. Check:
   - ✅ `REACT_APP_API_URL` exists
   - ✅ Value is correct (starts with `https://`)
   - ✅ Environment includes **Production**
   - ✅ **No trailing slash** in URL

## Step 4: Test Backend Directly

Test if your backend is accessible:

```bash
# Replace with your actual backend URL
curl https://your-backend-url.onrender.com/api/health
```

**Should return:**
```json
{"ok":true}
```

**If it fails:**
- Backend might be sleeping (Render free tier)
- Backend might be down
- URL might be wrong

## Step 5: Check Backend Logs

1. Go to your backend hosting (Render/Railway/etc.)
2. Check logs for:
   - CORS errors
   - Database connection errors
   - `/api/providers` endpoint errors

## Step 6: Verify CORS Configuration

Your backend should allow your Vercel domain. Check `myclean-backend/src/index.ts`:

```typescript
const allowedOrigins = [
  "http://localhost:3000",
  "https://myclean-project.vercel.app",  // ← Your Vercel domain
  // ... other domains
];
```

**If your Vercel domain is different**, add it to the list and redeploy backend.

## Quick Fixes

### Fix 1: Environment Variable Not Set
- **Symptom**: Console shows `API Base URL: http://localhost:4000`
- **Fix**: Set `REACT_APP_API_URL` in Vercel and **redeploy**

### Fix 2: Wrong Backend URL
- **Symptom**: Network tab shows 404 or wrong URL
- **Fix**: Double-check `REACT_APP_API_URL` value in Vercel

### Fix 3: CORS Error
- **Symptom**: Network tab shows CORS error
- **Fix**: Add your Vercel domain to backend CORS allowed origins

### Fix 4: Backend Not Running
- **Symptom**: Network tab shows connection failed
- **Fix**: Check backend is deployed and running (not sleeping)

### Fix 5: Backend Database Error
- **Symptom**: Backend returns 500 error
- **Fix**: Check backend logs, verify `DATABASE_URL` is set correctly

## Still Not Working?

Share these details:
1. What you see in **Browser Console** (the logs)
2. What you see in **Network tab** (the request status)
3. Your **backend URL** (from Vercel env var)
4. Your **Vercel frontend URL**

---

**After making changes, always redeploy!** Environment variables require a redeploy to take effect.

