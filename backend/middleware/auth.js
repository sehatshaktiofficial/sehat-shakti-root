// Authentication Middleware for SehatShakti
const authService = require('../services/authService');
const logger = require('../services/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Bearer token is required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Token is required'
      });
    }
    
    // Verify the token
    const decoded = authService.verifyJWT(token);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId || decoded.doctorId, // Support both new and legacy
      phone: decoded.phone,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error.message);
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const decoded = authService.verifyJWT(token);
        req.user = {
          userId: decoded.userId || decoded.doctorId, // Support both new and legacy
          phone: decoded.phone,
          role: decoded.role
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole
};
