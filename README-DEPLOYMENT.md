# Vercel Deployment Guide

## Backend Deployment

1. **Deploy Backend First:**
   ```bash
   cd Backend
   vercel --prod
   ```

2. **Set Environment Variables in Vercel Dashboard:**
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your JWT secret key
   - `NODE_ENV`: production

## Frontend Deployment

1. **Update API URL:**
   - Edit `Client/.env.production`
   - Replace `your-backend-url.vercel.app` with actual backend URL

2. **Deploy Frontend:**
   ```bash
   cd Client
   vercel --prod
   ```

## Full-Stack Deployment (Alternative)

Deploy both from root directory:
```bash
vercel --prod
```

## Important Notes

- MongoDB Atlas recommended for production database
- Socket.IO may need WebSocket fallback configuration
- Update CORS origins in server.js with production URLs
- Set all environment variables in Vercel dashboard

## Environment Variables Needed

### Backend:
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV=production`

### Frontend:
- `REACT_APP_API_URL`
- `REACT_APP_API_KEY`