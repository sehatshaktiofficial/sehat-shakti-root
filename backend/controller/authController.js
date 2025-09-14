// Authentication Controller for SehatShakti
const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const authMiddleware = require('../middleware/auth');
const logger = require('../services/logger');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Send OTP for login/registration
router.post('/send-otp', [
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('purpose').isIn(['login', 'register']).withMessage('Purpose must be login or register')
], validateRequest, async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    
    await authService.sendAuthOTP(phone, purpose);
    
    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(400).json({
      error: 'Failed to send OTP',
      message: error.message
    });
  }
});

// Verify OTP and login/register
router.post('/verify-otp', [
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP required'),
  body('purpose').isIn(['login', 'register']).withMessage('Purpose must be login or register')
], validateRequest, async (req, res) => {
  try {
    const { phone, otp, purpose } = req.body;
    
    await authService.verifyOTP(phone, otp, purpose);
    
    if (purpose === 'login') {
      // For login, we need to find the user and generate token
      const user = await authService.authenticateUser(phone, 'otp_verified');
      const token = authService.generateJWT({
        userId: user.id,
        phone: user.phone,
        role: user.role
      });
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isVerified: user.is_verified,
          isActive: user.is_active
        }
      });
    } else {
      // For registration, OTP is verified, ready for account creation
      res.json({
        success: true,
        message: 'OTP verified. Proceed with registration.'
      });
    }
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(400).json({
      error: 'OTP verification failed',
      message: error.message
    });
  }
});

// Register new user (patient, doctor, or pharmacist)
router.post('/register', [
  body('phoneNumber').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('role').isIn(['patient', 'doctor', 'pharmacist']).withMessage('Role must be patient, doctor, or pharmacist'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('village').optional().notEmpty().withMessage('Village cannot be empty'),
  body('preferredLanguage').optional().isIn(['hindi', 'punjabi', 'english']).withMessage('Language must be hindi, punjabi, or english'),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4-6 digits'),
  // Doctor-specific fields
  body('registrationNo').optional().notEmpty().withMessage('Registration number required for doctors'),
  body('speciality').optional().notEmpty().withMessage('Speciality required for doctors'),
  body('hospital').optional().notEmpty().withMessage('Hospital name required for doctors'),
  body('address').optional().notEmpty().withMessage('Address required for doctors')
], validateRequest, async (req, res) => {
  try {
    const userData = req.body;
    
    // Check if user already exists
    const { exists } = await authService.userExists(userData.phoneNumber);
    if (exists) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this phone number already exists'
      });
    }
    
    // Create user account
    const newUser = await authService.createUser(userData);
    
    // Generate JWT token
    const token = authService.generateJWT({
      userId: newUser.id,
      phone: newUser.phone,
      role: newUser.role
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        isVerified: newUser.is_verified,
        isActive: newUser.is_active
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login with credentials
router.post('/login', [
  body('phoneNumber').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4-6 digits')
], validateRequest, async (req, res) => {
  try {
    const { phoneNumber, pin } = req.body;
    
    const user = await authService.authenticateUser(phoneNumber, pin);
    const token = authService.generateJWT({
      userId: user.id,
      phone: user.phone,
      role: user.role
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.is_verified,
        isActive: user.is_active
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.userId);
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(404).json({
      error: 'Profile not found',
      message: error.message
    });
  }
});

// Update profile
router.put('/profile', authMiddleware, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('village').optional().notEmpty().withMessage('Village cannot be empty'),
  body('preferredLanguage').optional().isIn(['hindi', 'punjabi', 'english']).withMessage('Language must be hindi, punjabi, or english'),
  // Doctor-specific fields
  body('speciality').optional().notEmpty().withMessage('Speciality cannot be empty'),
  body('hospital').optional().notEmpty().withMessage('Hospital cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty')
], validateRequest, async (req, res) => {
  try {
    const updatedUser = await authService.updateUserProfile(req.user.userId, req.body);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(400).json({
      error: 'Profile update failed',
      message: error.message
    });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      authService.invalidateToken(token);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
});

// Medical verification endpoints
router.post('/verify-medical', authMiddleware, [
  body('registrationNo').notEmpty().withMessage('Registration number required'),
  body('smcId').notEmpty().withMessage('SMC ID required'),
  body('doctorName').notEmpty().withMessage('Doctor name required')
], validateRequest, async (req, res) => {
  try {
    const { registrationNo, smcId, doctorName } = req.body;
    
    const result = await authService.initiateMedicalVerification(
      registrationNo, smcId, doctorName
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Medical verification error:', error);
    res.status(400).json({
      error: 'Medical verification failed',
      message: error.message
    });
  }
});

router.get('/verify-medical/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await authService.getMedicalVerificationResult(requestId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Get verification result error:', error);
    res.status(400).json({
      error: 'Failed to get verification result',
      message: error.message
    });
  }
});

// Doctor verification endpoints
router.post('/verify-doctor', [
  body('registrationNo').notEmpty().withMessage('Registration number required'),
  body('smcId').isInt().withMessage('Valid SMC ID required'),
  body('doctorName').notEmpty().withMessage('Doctor name required')
], validateRequest, async (req, res) => {
  try {
    const { registrationNo, smcId, doctorName } = req.body;
    
    const result = await authService.verifyDoctorRegistration(
      registrationNo, smcId, doctorName
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Doctor verification error:', error);
    res.status(400).json({
      error: 'Doctor verification failed',
      message: error.message
    });
  }
});

router.get('/verify-doctor/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await authService.getDoctorVerificationResult(requestId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Get doctor verification result error:', error);
    res.status(400).json({
      error: 'Failed to get verification result',
      message: error.message
    });
  }
});

// SMC endpoints
router.get('/smcs', async (req, res) => {
  try {
    const smcs = await authService.getAvailableSMCs();
    
    res.json({
      success: true,
      smcs
    });
  } catch (error) {
    logger.error('Get SMCs error:', error);
    res.status(400).json({
      error: 'Failed to get SMC list',
      message: error.message
    });
  }
});

router.get('/smcs/:smcId', async (req, res) => {
  try {
    const { smcId } = req.params;
    const smc = await authService.getSMCById(parseInt(smcId));
    
    res.json({
      success: true,
      smc
    });
  } catch (error) {
    logger.error('Get SMC details error:', error);
    res.status(400).json({
      error: 'Failed to get SMC details',
      message: error.message
    });
  }
});

// Service health check
router.get('/health', async (req, res) => {
  try {
    const stats = await authService.getStats();
    res.json({
      success: true,
      service: 'SehatShakti Auth Service',
      ...stats
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      error: 'Service unhealthy',
      message: error.message
    });
  }
});

module.exports = router;
