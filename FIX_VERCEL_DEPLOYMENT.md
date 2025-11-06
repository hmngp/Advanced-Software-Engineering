# 🔧 Fix Vercel Deployment - "Failed to load providers" Error

## Problem
Your frontend on Vercel is trying to call `http://localhost:4000` because `REACT_APP_API_URL` is not configured.

## Solution: Set Environment Variable in Vercel

### Step 1: Get Your Backend URL
First, you need to know where your backend is deployed. It's likely one of:
- **Render.com**: `https://myclean-backend-xxxx.onrender.com`
- **Railway.app**: Your Railway backend URL
- **Other**: Your backend deployment URL

### Step 2: Add Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (`myclean-project` or similar)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add this variable:
   - **Name**: `REACT_APP_API_URL`
   - **Value**: Your backend URL (e.g., `https://myclean-backend-xxxx.onrender.com`)
   - **Environment**: Select **Production**, **Preview**, and **Development** (or just **Production** if you only want it in production)
6. Click **Save**

### Step 3: Redeploy Your Frontend

After adding the environment variable:

1. Go to **Deployments** tab in Vercel
2. Click the **three dots** (•••) next to your latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (2-3 minutes)

### Step 4: Verify

1. Visit your Vercel frontend URL
2. Open browser DevTools (F12) → Console tab
3. Navigate to the "Find Your Perfect Cleaner" page
4. Check the console:
   - ✅ **Success**: Should see API calls to your backend URL
   - ❌ **Still failing**: Check that the backend URL is correct and accessible

### Test Backend Health

Before setting the env var, test your backend is working:
```bash
curl https://your-backend-url.onrender.com/api/health
```

Should return: `{"ok":true}`

---

## Troubleshooting

### Backend Not Accessible?
- Check if backend is deployed and running
- Check backend logs for errors
- Verify DATABASE_URL is set in backend environment variables

### CORS Errors?
- Make sure your Vercel frontend URL is in the backend's CORS allowed origins
- Check `myclean-backend/src/index.ts` - it should include your Vercel domain

### Still Getting "Failed to load providers"?
1. Check browser console for the exact error message
2. Check Network tab to see what URL is being called
3. Verify `REACT_APP_API_URL` is set correctly in Vercel (case-sensitive!)
4. Make sure you **redeployed** after adding the env var

---

## Quick Checklist

- [ ] Backend is deployed and accessible
- [ ] Backend health endpoint returns `{"ok":true}`
- [ ] `REACT_APP_API_URL` is set in Vercel environment variables
- [ ] Frontend has been **redeployed** after adding env var
- [ ] Vercel frontend URL is in backend CORS allowed origins
- [ ] Test in browser - providers should load

---

**After fixing, your providers should load immediately!** ✅

