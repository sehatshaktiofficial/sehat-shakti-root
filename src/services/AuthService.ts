// Authentication Service for SehatShakti - Real Backend Integration
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import axios from 'axios'

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://api.sehatshakti.com/api')

// User interface matching backend
export interface User {
  id: string
  name: string
  phone: string
  role: 'patient' | 'doctor' | 'pharmacist'
  email?: string
  isVerified?: boolean
  isActive: boolean
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  role: 'patient' | 'doctor' | 'pharmacist' | null
}

export interface LoginCredentials {
  phoneNumber: string
  pin?: string
  biometric?: boolean
}

export interface RegisterData {
  phoneNumber: string
  name: string
  role: 'patient' | 'doctor' | 'pharmacist'
  email?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  village?: string
  preferredLanguage: string
  pin: string
  // Doctor-specific fields
  registrationNo?: string
  speciality?: string
  hospital?: string
  address?: string
  smcId?: number
}

export interface SMC {
  value: number
  label: string
  code: string
  state: string
}

export interface DoctorVerificationRequest {
  registrationNo: string
  smcId: number
  doctorName: string
}

export interface DoctorVerificationResult {
  isPending: boolean
  isValid?: boolean
  error?: string
  message?: string
  doctorDetails?: {
    registrationNumber: string
    registrationYear: string
    doctorName: string
    fatherName: string
    council: string
    governmentId: string
  }
  validation?: {
    registrationNumberMatch: boolean
    nameMatch: boolean
  }
  verifiedAt?: string
}

class AuthenticationService {
  private currentUser: User | null = null
  private authToken: string | null = null
  private isOfflineMode: boolean = false

  // Initialize authentication service
  async initialize(): Promise<AuthState> {
    try {
      // Check for stored authentication
      const storedToken = await SecureStore.getItemAsync('auth_token')
      const storedUser = await SecureStore.getItemAsync('user_data')

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser)
        this.currentUser = user
        this.authToken = storedToken

        // Verify token is still valid by making a profile request
        try {
          const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          })
          
          if (response.data.success) {
            return {
              isAuthenticated: true,
              user: user,
              token: storedToken,
              role: user.role
            }
          }
        } catch (error) {
          // Token is invalid, clear stored data
          await this.logout()
        }
      }

      return {
        isAuthenticated: false,
        user: null,
        token: null,
        role: null
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      return {
        isAuthenticated: false,
        user: null,
        token: null,
        role: null
      }
    }
  }

  // Send OTP for login
  async sendOTP(phone: string, purpose: 'login' | 'register'): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        phone,
        purpose
      })
      
      return { success: response.data.success }
    } catch (error: any) {
      console.error('Send OTP failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to send OTP' 
      }
    }
  }

  // Verify OTP and login
  async verifyOTP(phone: string, otp: string, purpose: 'login' | 'register'): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        phone,
        otp,
        purpose
      })
      
      if (response.data.success && response.data.token) {
        const user = response.data.user
        this.currentUser = user
        this.authToken = response.data.token

        // Store credentials
        await SecureStore.setItemAsync('auth_token', this.authToken)
        await SecureStore.setItemAsync('user_data', JSON.stringify(user))

        return { success: true, user, token: this.authToken }
      }
      
      return { success: false, error: response.data.message || 'OTP verification failed' }
    } catch (error: any) {
      console.error('Verify OTP failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'OTP verification failed' 
      }
    }
  }

  // Login with credentials
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        phoneNumber: credentials.phoneNumber,
        pin: credentials.pin
      })
      
      if (response.data.success && response.data.token) {
        const user = response.data.user
        this.currentUser = user
        this.authToken = response.data.token

        // Store credentials
        await SecureStore.setItemAsync('auth_token', this.authToken)
        await SecureStore.setItemAsync('user_data', JSON.stringify(user))

        return { success: true, user }
      }
      
      return { success: false, error: response.data.message || 'Login failed' }
    } catch (error: any) {
      console.error('Login failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  // Register new user
  async register(userData: RegisterData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData)
      
      if (response.data.success && response.data.token) {
        const user = response.data.user
        this.currentUser = user
        this.authToken = response.data.token

        // Store credentials
        await SecureStore.setItemAsync('auth_token', this.authToken)
        await SecureStore.setItemAsync('user_data', JSON.stringify(user))

        return { success: true, user }
      }
      
      return { success: false, error: response.data.message || 'Registration failed' }
    } catch (error: any) {
      console.error('Registration failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      }
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      this.currentUser = null
      this.authToken = null
      
      await SecureStore.deleteItemAsync('auth_token')
      await SecureStore.deleteItemAsync('user_data')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Doctor verification methods
  async getAvailableSMCs(): Promise<{ success: boolean; smcs?: SMC[]; error?: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/smcs`)
      
      if (response.data.success) {
        return { success: true, smcs: response.data.smcs }
      }
      
      return { success: false, error: response.data.message || 'Failed to get SMC list' }
    } catch (error: any) {
      console.error('Get SMCs failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to get SMC list' 
      }
    }
  }

  async getSMCById(smcId: number): Promise<{ success: boolean; smc?: any; error?: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/smcs/${smcId}`)
      
      if (response.data.success) {
        return { success: true, smc: response.data.smc }
      }
      
      return { success: false, error: response.data.message || 'Failed to get SMC details' }
    } catch (error: any) {
      console.error('Get SMC details failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to get SMC details' 
      }
    }
  }

  async verifyDoctorRegistration(request: DoctorVerificationRequest): Promise<{ 
    success: boolean; 
    jobId?: string; 
    requestId?: string; 
    message?: string; 
    error?: string 
  }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-doctor`, request)
      
      if (response.data.success) {
        return { 
          success: true, 
          jobId: response.data.jobId,
          requestId: response.data.requestId,
          message: response.data.message
        }
      }
      
      return { success: false, error: response.data.message || 'Verification failed' }
    } catch (error: any) {
      console.error('Doctor verification failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Verification failed' 
      }
    }
  }

  async getDoctorVerificationResult(requestId: string): Promise<{ 
    success: boolean; 
    result?: DoctorVerificationResult; 
    error?: string 
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/verify-doctor/${requestId}`)
      
      if (response.data.success) {
        return { success: true, result: response.data }
      }
      
      return { success: false, error: response.data.message || 'Failed to get verification result' }
    } catch (error: any) {
      console.error('Get verification result failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to get verification result' 
      }
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser
  }

  // Get authentication token
  getAuthToken(): string | null {
    return this.authToken
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.authToken !== null
  }

  // Get user role
  getUserRole(): 'patient' | 'doctor' | 'pharmacist' | null {
    return this.currentUser?.role || null
  }
}

// Singleton instance
export const authService = new AuthenticationService()

// Export the class and instance
export default AuthenticationService
export { AuthenticationService }