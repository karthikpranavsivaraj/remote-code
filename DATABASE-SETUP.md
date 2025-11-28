# Database Setup for Production

## MongoDB Atlas Setup

1. **Create Account**: Go to https://cloud.mongodb.com
2. **Create Cluster**: Choose free tier (M0)
3. **Create Database User**:
   - Username: `codecollab`
   - Password: Generate strong password
4. **Network Access**: Add IP `0.0.0.0/0` (allow all) for Vercel
5. **Get Connection String**: 
   ```
   mongodb+srv://codecollab:<password>@cluster0.mongodb.net/codecollab?retryWrites=true&w=majority
   ```

## Required Collections

The app will auto-create these collections:
- `users` - User accounts
- `projects` - Project data  
- `project_members` - Team memberships
- `project_files` - Code files
- `tasks` - Project tasks
- `chat_history` - Chat messages
- `code_reviews` - Code review requests
- `notifications` - User notifications
- `standups` - Daily standup updates

## Environment Variables for Vercel

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```
MONGODB_URI=mongodb+srv://codecollab:YOUR_PASSWORD@cluster0.mongodb.net/codecollab?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
NODE_ENV=production
```

## MySQL (Alternative)

If using MySQL instead of MongoDB:
1. Use PlanetScale, Railway, or similar
2. Update connection in `Backend/database/db.js`
3. Run schema from `Backend/database/schema.sql`