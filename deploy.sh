#!/bin/bash

echo "🚀 Starting Vercel Deployment..."

# Deploy Backend
echo "📦 Deploying Backend..."
cd Backend
vercel --prod --yes
BACKEND_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^[:space:]]*')
echo "✅ Backend deployed to: $BACKEND_URL"

# Update Frontend API URL
echo "🔧 Updating Frontend API URL..."
cd ../Client
echo "REACT_APP_API_URL=$BACKEND_URL" > .env.production
echo "REACT_APP_API_KEY=333316f2efmsh6629711b3708849p1799c0jsn0e230f08834f" >> .env.production

# Deploy Frontend
echo "📦 Deploying Frontend..."
vercel --prod --yes
FRONTEND_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^[:space:]]*')
echo "✅ Frontend deployed to: $FRONTEND_URL"

echo "🎉 Deployment Complete!"
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""
echo "⚠️  IMPORTANT: Set these environment variables in Vercel Dashboard:"
echo "MONGODB_URI=mongodb+srv://codecollab:PASSWORD@cluster.mongodb.net/codecollab"
echo "JWT_SECRET=your_super_secret_jwt_key_here"
echo "NODE_ENV=production"
echo ""
echo "📖 See DATABASE-SETUP.md for detailed database configuration"