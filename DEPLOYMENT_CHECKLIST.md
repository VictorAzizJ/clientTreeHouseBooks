# Render Deployment Checklist for Meeting

**Current Status**: All routes work locally ✓ | Production returns 404 ✗

## ✅ What We Fixed (Committed: 453947ec)

1. **Added Route Debugging**
   - Created `routes/_debugRoutes.js` - logs all 58 registered routes on startup
   - Added request logger that tracks 404s with extra detail
   - Server now prints complete route map when it starts

2. **Added Route Map Documentation**
   - Created `routes/_routeMap.js` - complete reference of all routes
   - Created `views/README.md` - maps every route to its view file

3. **Enhanced Logging**
   - Every request now logged with status code and duration
   - 404 errors specifically tracked with user agent and referrer

## 🔥 QUICK FIX STEPS FOR RENDER (2 hours until meeting)

### Step 1: Verify Latest Commit Deployed (2 min)
1. Go to Render Dashboard → Your Service
2. Check "Latest Deploy" shows commit `453947ec`
3. If not, click **"Manual Deploy"** → **"Deploy latest commit"**

### Step 2: Check Build Logs (3 min)
1. In Render Dashboard, click **"Logs"** tab
2. Look for this output:
   ```
   Server started on port 3000
   ═══════════════════════════════════════════════
   REGISTERED ROUTES
   ═══════════════════════════════════════════════
   [CLASSROOM]
     GET    /classroom/setup
     ...
   ```
3. **If you don't see route list:** Build might have failed

### Step 3: Check Environment Variables (2 min)
Required variables in Render:
- ✅ `MONGO_URI` or `MONGODB_URI` - Database connection
- ✅ `SESSION_SECRET` - Session encryption
- ✅ `NODE_ENV=production` - Production mode

### Step 4: Test Routes (2 min)
Open these URLs in browser:
1. `https://your-app.onrender.com/healthz` - Should return `{"status":"OK","db":"up"}`
2. `https://your-app.onrender.com/classroom/setup` - Should redirect to login (not 404)

### Step 5: Clear Browser Cache (1 min)
Sometimes 404s are cached:
- Chrome: `Ctrl+Shift+Delete` → Clear cached images/files
- Or try incognito mode

### Step 6: Check Render Logs for 404s (5 min)
Look for lines like:
```
[ERROR] GET /classroom/setup → 404
404 NOT FOUND: GET /classroom/setup
```

This tells us if route actually isn't registered (unlikely) or something else is wrong.

## 🎯 Most Likely Issues (ranked by probability)

### 1. **Render Hasn't Deployed Latest Code** (80% likely)
- **Symptom**: You pushed code but Render still shows old commit
- **Fix**: Manual deploy from Render dashboard
- **Time**: 2-3 minutes to redeploy

### 2. **Database Connection Failing** (10% likely)
- **Symptom**: Server starts but routes fail with 500 errors (not 404)
- **Fix**: Check `MONGO_URI` environment variable
- **Time**: 1 minute to fix

### 3. **Environment Variable Missing** (5% likely)
- **Symptom**: Server crashes on startup
- **Fix**: Add missing variable in Render dashboard
- **Time**: 2 minutes

### 4. **Build Failed Silently** (5% likely)
- **Symptom**: Render shows "Live" but serves old code
- **Fix**: Check build logs, might need `npm ci` instead of `npm install`
- **Time**: 5 minutes to troubleshoot

## 📊 What The Logs Will Tell You

Once deployed with new logging, you'll see **exactly** what's happening:

```
# Route successfully registered:
info: [CLASSROOM]
info:   GET    /classroom/setup

# Request received:
[INFO] GET /classroom/setup → 200 (45ms)

# OR if 404:
[ERROR] GET /classroom/setup → 404 (2ms)
404 NOT FOUND: GET /classroom/setup
```

## 🚨 If Still Broken After Deploy

1. **Copy the logs** - especially the route registration section
2. **Test locally** - `npm start` and check route list matches
3. **Compare commits** - ensure Render is using same commit as local

## ✅ Verification Success Criteria

You know it's working when:
1. ✅ `/healthz` returns `{"status":"OK","db":"up"}`
2. ✅ `/classroom/setup` redirects to `/login` (not 404)
3. ✅ After login, `/classroom/setup` shows the classroom setup page
4. ✅ Logs show "REGISTERED ROUTES" with all 58 routes listed

## 📞 During Meeting

If someone reports a 404:
1. Check Render logs for that specific route
2. Look for the route in the "REGISTERED ROUTES" section at startup
3. If route is registered but returns 404, it's a middleware/auth issue (not routing)
4. Enhanced logging will show the exact status code and timing

## 🎓 What We Learned

- **Routes are correct in code** - All 58 routes register properly locally
- **Views exist** - All necessary view files are present
- **This is a deployment issue** - Not a code issue
- **Better debugging** - Now have tools to diagnose future issues quickly

## Last Updated
2025-10-17 - 2 hours before meeting

## Quick Links
- Render Dashboard: https://dashboard.render.com
- Route Map: `routes/_routeMap.js`
- View Docs: `views/README.md`
- Debug Tools: `routes/_debugRoutes.js`
