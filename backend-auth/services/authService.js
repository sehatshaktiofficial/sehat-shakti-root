// services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { supabase } = require('../config/database');
const { cache } = require('./cache');
const logger = require('./logger');
const smsService = require('./smsService');
const govApiQueue = require('./govapiQueue');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiry = process.env.JWT_EXPIRES_IN || '7d';
    this.otpExpiry = 300; // 5 minutes
    this.maxOtpAttempts = 3;
  }

  // Generate secure OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate JWT with secure payload
  generateJWT(payload) {
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      iss: 'telemedicine-nabha',
      aud: 'doctor-app'
    };

    const token = jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      algorithm: 'HS256'
    });

    // Cache token for blacklisting capability
    const tokenKey = `token_${this.getTokenId(token)}`;
    cache.set(tokenKey, { valid: true, doctorId: payload.doctorId }, 
              this.convertExpiryToSeconds(this.jwtExpiry));

    return token;
  }

  // Verify JWT token
  verifyJWT(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const tokenKey = `token_${this.getTokenId(token)}`;
      const tokenCache = cache.get(tokenKey);

      if (!tokenCache || !tokenCache.valid) {
        throw new Error('Token has been invalidated');
      }

      return decoded;
    } catch (error) {
      logger.warn(`Invalid token: ${error.message}`);
      throw new Error('Invalid or expired token');
    }
  }

  // Invalidate JWT token (logout)
  invalidateToken(token) {
    try {
      const tokenKey = `token_${this.getTokenId(token)}`;
      cache.set(tokenKey, { valid: false }, this.convertExpiryToSeconds(this.jwtExpiry));
      return true;
    } catch (error) {
      logger.error('Error invalidating token:', error);
      return false;
    }
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Check if doctor exists
  async doctorExists(phone, username) {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, phone, username')
        .or(`phone.eq.${phone},username.eq.${username}`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ? { exists: true, doctor: data } : { exists: false };
    } catch (error) {
      logger.error('Error checking doctor existence:', error);
      throw new Error('Database error occurred');
    }
  }

  // Send OTP for authentication
  async sendAuthOTP(phone, purpose) {
    const otp = this.generateOTP();
    const otpKey = `otp_${purpose}_${phone}`;

    // Store OTP in cache
    cache.set(otpKey, {
      otp,
      phone,
      attempts: 0,
      generatedAt: new Date().toISOString()
    }, this.otpExpiry);

    // Send SMS
    const smsSent = await smsService.sendOTP(phone, otp, purpose);
    
    if (!smsSent) {
      cache.del(otpKey);
      throw new Error('Failed to send verification code');
    }

    logger.info(`OTP sent successfully for ${purpose} to ${phone}`);
    return true;
  }

  // Verify OTP
  async verifyOTP(phone, otp, purpose) {
    const otpKey = `otp_${purpose}_${phone}`;
    const cachedData = cache.get(otpKey);

    if (!cachedData) {
      throw new Error('Verification code expired or invalid');
    }

    if (cachedData.attempts >= this.maxOtpAttempts) {
      cache.del(otpKey);
      throw new Error('Too many failed attempts');
    }

    if (cachedData.otp !== otp) {
      cachedData.attempts += 1;
      cache.set(otpKey, cachedData, this.otpExpiry);
      throw new Error(`Invalid verification code. ${this.maxOtpAttempts - cachedData.attempts} attempts remaining`);
    }

    // OTP verified, remove from cache
    cache.del(otpKey);
    return true;
  }

  // Initiate medical verification
  async initiateMedicalVerification(registrationNo, smcId, doctorName) {
    try {
      // Check cache first
      const cacheKey = `medid_${registrationNo}_${smcId}`;
      const cachedResult = cache.get(cacheKey);
      
      if (cachedResult) {
        logger.info(`Using cached verification for ${registrationNo}`);
        return cachedResult;
      }

      // Add to queue for verification
      const { jobId, requestId } = await govApiQueue.addVerificationJob(
        registrationNo, smcId, doctorName
      );

      return {
        isPending: true,
        jobId,
        requestId,
        message: 'Medical verification in progress'
      };

    } catch (error) {
      logger.error('Error initiating medical verification:', error);
      throw new Error('Medical verification service unavailable');
    }
  }

  // Get medical verification result
  async getMedicalVerificationResult(requestId) {
    try {
      const result = await govApiQueue.getVerificationResult(requestId);
      
      if (!result) {
        return { isPending: true, message: 'Verification still in progress' };
      }

      return result;
    } catch (error) {
      logger.error('Error getting verification result:', error);
      throw new Error('Unable to retrieve verification result');
    }
  }

  // Create new doctor account
  async createDoctor(doctorData) {
    try {
      const hashedPassword = await this.hashPassword(doctorData.password);
      
      const { data: newDoctor, error } = await supabase
        .from('doctors')
        .insert([{
          phone: doctorData.phone,
          username: doctorData.username,
          password_hash: hashedPassword,
          name: doctorData.name,
          registration_no: doctorData.registrationNo,
          speciality: doctorData.speciality,
          hospital: doctorData.hospital,
          address: doctorData.address,
          is_verified: doctorData.isVerified || false,
          role: 'doctor',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        }])
        .select('id, phone, username, name, registration_no, speciality, hospital, is_verified')
        .single();

      if (error) {
        logger.error('Error creating doctor:', error);
        throw new Error('Failed to create doctor account');
      }

      logger.info(`Doctor account created: ${newDoctor.username}`);
      return newDoctor;

    } catch (error) {
      logger.error('Error in createDoctor:', error);
      throw error;
    }
  }

  // Authenticate doctor login
  async authenticateDoctor(identifier, password) {
    try {
      // identifier can be phone or username
      const query = supabase
        .from('doctors')
        .select('*');

      if (identifier.match(/^\d{10}$/)) {
        query.eq('phone', identifier);
      } else {
        query.eq('username', identifier);
      }

      const { data: doctor, error } = await query.single();

      if (error || !doctor) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await this.verifyPassword(password, doctor.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await supabase
        .from('doctors')
        .update({
          last_login_at: new Date().toISOString(),
          login_count: (doctor.login_count || 0) + 1
        })
        .eq('id', doctor.id);

      // Remove sensitive data
      delete doctor.password_hash;
      
      return doctor;

    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  }

  // Get doctor profile
  async getDoctorProfile(doctorId) {
    try {
      const { data: doctor, error } = await supabase
        .from('doctors')
        .select(`
          id, phone, username, name, registration_no, 
          speciality, hospital, address, is_verified,
          created_at, last_login_at, login_count
        `)
        .eq('id', doctorId)
        .single();

      if (error || !doctor) {
        throw new Error('Doctor profile not found');
      }

      // Mask phone number
      doctor.phone = doctor.phone.replace(/(\d{2})(\d{6})(\d{2})/, '$1******$3');
      
      return doctor;

    } catch (error) {
      logger.error('Error fetching doctor profile:', error);
      throw error;
    }
  }

  // Update doctor profile
  async updateDoctorProfile(doctorId, updateData) {
    try {
      // Remove sensitive fields that shouldn't be updated
      const allowedFields = ['name', 'speciality', 'hospital', 'address'];
      const filteredData = {};
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No valid fields to update');
      }

      filteredData.updated_at = new Date().toISOString();

      const { data: updatedDoctor, error } = await supabase
        .from('doctors')
        .update(filteredData)
        .eq('id', doctorId)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update profile');
      }

      logger.info(`Doctor profile updated: ${doctorId}`);
      return updatedDoctor;

    } catch (error) {
      logger.error('Error updating doctor profile:', error);
      throw error;
    }
  }

  // Utility functions
  getTokenId(token) {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  convertExpiryToSeconds(expiry) {
    if (typeof expiry === 'number') return expiry;
    
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60;
      case 'h': return value * 60 * 60;
      case 'm': return value * 60;
      case 's': return value;
      default: return 604800; // 7 days default
    }
  }

  // Get auth service statistics
  async getStats() {
    const queueStatus = await govApiQueue.getQueueStatus();
    const cacheStats = cache.getStats();
    
    return {
      queue: queueStatus,
      cache: cacheStats,
      service: 'healthy'
    };
  }
}

module.exports = new AuthService();