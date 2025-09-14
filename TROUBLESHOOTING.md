# 🔧 Troubleshooting Guide - SehatShakti

This guide helps you resolve common issues when setting up and running the SehatShakti telemedicine platform.

## 🚨 Common Issues and Solutions

### 1. **Environment Setup Issues**

#### Problem: "Module not found" errors
**Solution:**
```bash
# Clean install all dependencies
npm run reset
# or
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
npm run install:all
```

#### Problem: Environment variables not loading
**Solution:**
1. Ensure `.env` files exist in both root and `backend/` directories
2. Copy from `.env.example` files if missing
3. Restart the development servers after changing environment variables

### 2. **Backend Issues**

#### Problem: "Database connection failed"
**Solution:**
1. Check your Supabase credentials in `backend/.env`
2. Ensure your Supabase project is active
3. Verify the database schema is created (run `backend/database/schema.sql`)

#### Problem: "JWT_SECRET not defined"
**Solution:**
1. Set a strong JWT secret in `backend/.env`
2. Generate a secure secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

#### Problem: Backend won't start
**Solution:**
```bash
# Check if port 3000 is available
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process using port 3000 if needed
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### 3. **Frontend Issues**

#### Problem: Metro bundler cache issues
**Solution:**
```bash
npm run clean
# or
expo r -c
```

#### Problem: "Unable to resolve module" errors
**Solution:**
```bash
# Clear all caches and reinstall
npm run reset
# or manually:
rm -rf node_modules
npm install
expo r -c
```

#### Problem: App crashes on startup
**Solution:**
1. Check for TypeScript errors: `npx tsc --noEmit`
2. Check for linting errors: `npm run lint`
3. Ensure all required environment variables are set

### 4. **Database Issues**

#### Problem: "Table doesn't exist" errors
**Solution:**
1. Run the database schema: `backend/database/schema.sql`
2. Check if your Supabase project has the correct tables
3. Verify RLS (Row Level Security) policies if using Supabase

#### Problem: "Permission denied" errors
**Solution:**
1. Check your Supabase service role key
2. Ensure RLS policies allow the operations you're trying to perform
3. Verify your database user has the correct permissions

### 5. **API Connectivity Issues**

#### Problem: Frontend can't connect to backend
**Solution:**
1. Check if backend is running on port 3000
2. Verify `EXPO_PUBLIC_API_URL` in `.env` file
3. Check CORS settings in backend
4. Ensure both frontend and backend are on the same network

#### Problem: "Network request failed" errors
**Solution:**
1. Check your internet connection
2. Verify API endpoints are correct
3. Check if backend is responding: `curl http://localhost:3000/health`

### 6. **Authentication Issues**

#### Problem: Login/Register not working
**Solution:**
1. Check if backend authentication endpoints are working
2. Verify JWT secret is set correctly
3. Check database for user records
4. Ensure OTP service is configured (if using OTP)

#### Problem: "Token invalid" errors
**Solution:**
1. Clear app storage and try again
2. Check if JWT secret matches between frontend and backend
3. Verify token expiration settings

### 7. **Development Environment Issues**

#### Problem: Hot reload not working
**Solution:**
```bash
# Restart with clean cache
expo start --clear
# or
npm run clean && npm start
```

#### Problem: TypeScript errors
**Solution:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix common issues:
# 1. Update tsconfig.json if needed
# 2. Install missing type definitions
# 3. Check import/export statements
```

### 8. **Platform-Specific Issues**

#### Android Issues
```bash
# Clear Android build cache
cd android && ./gradlew clean && cd ..
expo run:android
```

#### iOS Issues
```bash
# Clear iOS build cache
cd ios && xcodebuild clean && cd ..
expo run:ios
```

#### Web Issues
```bash
# Clear web cache
expo start --web --clear
```

## 🔍 Debugging Steps

### 1. **Check Logs**
```bash
# Backend logs
cd backend && npm run dev

# Frontend logs
expo start --verbose
```

### 2. **Verify Environment**
```bash
# Check Node.js version
node --version  # Should be >= 16

# Check npm version
npm --version

# Check Expo CLI
expo --version
```

### 3. **Test API Endpoints**
```bash
# Health check
curl http://localhost:3000/health

# Auth health check
curl http://localhost:3000/api/auth/health
```

### 4. **Database Verification**
1. Check Supabase dashboard for active connections
2. Verify tables exist in your database
3. Test database queries directly

## 🆘 Getting Help

### 1. **Check Documentation**
- README.md for setup instructions
- API documentation in backend/controller/
- Database schema in backend/database/

### 2. **Common Commands**
```bash
# Full reset
npm run reset

# Setup from scratch
npm run setup

# Run both frontend and backend
npm run dev

# Check for issues
npm run lint
npm test
```

### 3. **Log Files**
- Backend logs: `backend/logs/`
- Expo logs: Check terminal output
- System logs: Check your OS logs

## 📋 Pre-Flight Checklist

Before reporting issues, ensure:

- [ ] Node.js version >= 16
- [ ] All dependencies installed (`npm run install:all`)
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] No TypeScript or linting errors
- [ ] Network connectivity between frontend and backend

## 🐛 Reporting Issues

When reporting issues, include:

1. **Environment Details:**
   - OS and version
   - Node.js version
   - npm version
   - Expo CLI version

2. **Error Messages:**
   - Full error stack trace
   - Console output
   - Screenshots if applicable

3. **Steps to Reproduce:**
   - What you were doing
   - What you expected to happen
   - What actually happened

4. **Additional Context:**
   - Any custom configurations
   - Recent changes made
   - Whether it worked before

---

**Remember:** Most issues can be resolved by cleaning caches and reinstalling dependencies! 🧹
