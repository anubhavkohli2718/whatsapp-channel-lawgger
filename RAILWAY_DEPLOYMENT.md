# Railway Deployment Guide

## Common Issues and Fixes

### Issue 1: Port Configuration ✅ Fixed
Railway automatically sets the `PORT` environment variable. The server is already configured to use it.

### Issue 2: Ephemeral File System ⚠️ Important
Railway has an **ephemeral file system** - files are lost when the service restarts. This affects:
- `auth_info_baileys/` folder (authentication data)

**Solutions:**
1. **Use Railway Volumes** (Recommended for production)
2. **Use External Storage** (S3, Google Cloud Storage, etc.)
3. **Re-authenticate after each restart** (Not ideal for production)

### Issue 3: Health Check ✅ Added
Railway needs a health check endpoint. The server already has `/api/health`.

## Railway Configuration

### Option 1: Use Railway Volumes (Recommended)

1. **In Railway Dashboard:**
   - Go to your service
   - Click "New" → "Volume"
   - Mount path: `/app/auth_info_baileys`
   - This persists authentication data

2. **Update Environment Variables:**
   - No changes needed - the code will use the volume automatically

### Option 2: Use External Storage

Update the code to use cloud storage for auth files (S3, GCS, etc.)

### Option 3: Quick Fix - Re-authenticate

If you don't need persistence, users can re-scan QR code after each restart.

## Environment Variables

Railway automatically sets:
- `PORT` - Port number (automatically set by Railway)
- `RAILWAY_ENVIRONMENT` - Environment name

Optional variables you can add:
- `NODE_ENV=production`
- `HOST=0.0.0.0` (already default in code)

## Health Check

Railway will check: `GET /api/health`

This endpoint returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "connection": "disconnected"
}
```

## Troubleshooting

### Check Logs
```bash
# In Railway Dashboard → Deployments → View Logs
```

### Common Errors:

1. **"Cannot find module"**
   - Check that `package.json` has all dependencies
   - Railway should auto-install, but verify build logs

2. **"Port already in use"**
   - Make sure you're using `process.env.PORT`
   - Already fixed in code ✅

3. **"Authentication lost after restart"**
   - This is expected with ephemeral file system
   - Use Railway Volumes to persist auth data

4. **"Connection timeout"**
   - Check Railway service is running
   - Verify health check endpoint works
   - Check Railway logs for errors

## Testing After Deployment

1. **Check Health:**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

2. **Get QR Code:**
   ```bash
   curl https://your-app.railway.app/api/qr
   ```

3. **Check Status:**
   ```bash
   curl https://your-app.railway.app/api/status
   ```

## Next Steps

1. **Add Railway Volume** for persistent auth storage
2. **Set up monitoring** in Railway dashboard
3. **Configure custom domain** (optional)
4. **Set up environment variables** if needed

