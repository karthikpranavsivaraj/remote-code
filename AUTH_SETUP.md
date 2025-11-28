# Authentication Setup Guide

## Overview
This authentication system provides secure login and signup functionality for the Remote Code Collaboration Tool.

## Features
- User registration and login
- JWT-based authentication
- Protected routes
- Dashboard for authenticated users
- Session management with Zustand

## Setup Instructions

### 1. Backend Setup

1. **Install Dependencies**
   ```bash
   cd Backend
   npm install
   ```

2. **Database Setup**
   - Install MySQL/MariaDB
   - Create database using the provided SQL script:
   ```bash
   mysql -u root -p < database/setup.sql
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update database credentials and JWT secret:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=livedevhub
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

4. **Start Backend Server**
   ```bash
   npm start
   ```

### 2. Frontend Setup

1. **Install Dependencies** (if not already done)
   ```bash
   cd Client
   npm install
   ```

2. **Start Frontend**
   ```bash
   npm start
   ```

## Usage

### Authentication Flow
1. **New Users**: Visit `/register` to create an account
2. **Existing Users**: Visit `/login` to sign in
3. **Dashboard**: After login, users are redirected to `/dashboard`
4. **Protected Routes**: All collaboration features require authentication

### Available Routes
- `/login` - User login
- `/register` - User registration  
- `/dashboard` - Main dashboard (protected)
- `/home` - Room joining interface (protected)
- `/editor/:id` - Code collaboration room (protected)

### API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

## Security Features
- Password hashing with bcrypt
- JWT token authentication
- Protected route middleware
- Automatic token refresh handling
- Secure session storage

## Troubleshooting

### Common Issues
1. **Database Connection Error**: Check MySQL service and credentials
2. **JWT Token Issues**: Verify JWT_SECRET is set in .env
3. **CORS Errors**: Ensure frontend URL is configured correctly

### Development Notes
- Tokens expire in 1 hour by default
- User sessions persist in localStorage
- All API calls include authentication headers automatically