# 🏥 SehatShakti - Unified Telemedicine Platform

A comprehensive telemedicine platform designed for rural healthcare delivery with offline-first capabilities and multi-role support.

## 🚀 Features

- **Multi-Role Support**: Patients, Doctors, and Pharmacists
- **Offline-First Design**: Works without internet connectivity
- **AI-Powered Symptom Checker**: Local medical analysis
- **Video Consultations**: Remote doctor-patient interactions
- **Medicine Database**: Offline medicine search and dosage information
- **Health Records**: Digital health record management
- **Multi-Language Support**: Hindi, Punjabi, and English
- **Government API Integration**: Medical verification and compliance

## 📁 Project Structure

```
sehat-shakti-app/
├── src/                          # Frontend React Native source code
│   ├── navigation/               # Navigation components
│   ├── screens/                  # Screen components
│   │   ├── patient/             # Patient-specific screens
│   │   ├── doctor/              # Doctor-specific screens
│   │   ├── pharmacist/          # Pharmacist-specific screens
│   │   └── common/              # Shared screens
│   ├── services/                # API and business logic services
│   ├── store/                   # State management (Zustand)
│   └── database/                # Local database models
├── backend/                     # Backend Node.js/Express API
│   ├── controller/              # API route controllers
│   ├── middleware/              # Express middleware
│   ├── services/                # Business logic services
│   └── config/                  # Configuration files
├── assets/                      # Static assets (images, icons)
├── App.tsx                      # Main app entry point
└── package.json                 # Frontend dependencies
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (>= 16.0.0)
- npm (>= 8.0.0)
- Expo CLI
- PostgreSQL (for backend)
- Redis (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sehat-shakti-app
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp backend/.env.example backend/.env
   
   # Edit the environment variables
   # Update database credentials, JWT secret, etc.
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb sehatshakti
   
   # Run database migrations (if available)
   cd backend && npm run migrate
   ```

### Running the Application

#### Development Mode (Both Frontend and Backend)
```bash
npm run dev
```

#### Frontend Only
```bash
npm start
# or
npm run android
npm run ios
npm run web
```

#### Backend Only
```bash
npm run backend:dev
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP for verification
- `POST /api/auth/verify-otp` - Verify OTP and login/register
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout user

### Health Check
- `GET /health` - Backend health check
- `GET /api/auth/health` - Auth service health check

## 👥 User Roles

### Patient
- View health records
- Book consultations
- Use AI symptom checker
- Search medicines
- Video consultations

### Doctor
- Manage patient queue
- Write prescriptions
- View patient records
- Video consultations
- Medical verification

### Pharmacist
- Manage inventory
- Verify prescriptions
- Process sales
- QR code scanning
- Stock management

## 🔒 Security Features

- JWT-based authentication
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers
- Secure token storage

## 📱 Offline Capabilities

- Local SQLite database
- Offline AI symptom checker
- Cached medicine database
- Sync when online
- Offline-first architecture

## 🌐 Multi-Language Support

- Hindi (हिंदी)
- Punjabi (ਪੰਜਾਬੀ)
- English

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
npm run test:backend
```

## 📦 Building for Production

```bash
# Build the app
npm run build
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npm run clean
   ```

2. **Backend connection issues**
   - Check if backend is running on port 3000
   - Verify environment variables
   - Check database connection

3. **Authentication issues**
   - Clear app storage
   - Check JWT secret configuration
   - Verify API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Recent Updates

### Version 2.0.0
- ✅ Unified backend-frontend architecture
- ✅ Multi-role authentication system
- ✅ Improved API consistency
- ✅ Better error handling
- ✅ Enhanced security measures
- ✅ Streamlined project structure

---

**Built with ❤️ for rural healthcare communities**
