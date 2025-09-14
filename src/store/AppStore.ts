// Global State Management for Lok Sehat using Zustand
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
// import { User } from '../database/models' // Temporarily commented out
import { authService, AuthState } from '../services/AuthService'

// Import User interface from AuthService
import { User } from '../services/AuthService'

// App State Interface
interface AppState {
  // Authentication
  auth: AuthState
  setAuth: (auth: AuthState) => void
  
  // User Profile
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  
  // UI State
  isLoading: boolean
  setLoading: (loading: boolean) => void
  
  // Network State
  isOnline: boolean
  setOnlineStatus: (online: boolean) => void
  
  // App Settings
  settings: {
    language: string
    theme: 'light' | 'dark'
    offlineMode: boolean
    notificationsEnabled: boolean
  }
  updateSettings: (settings: Partial<AppState['settings']>) => void
  
  // Medical AI State
  aiState: {
    isInitialized: boolean
    modelVersion: string
    lastUpdate: number
  }
  setAIState: (aiState: Partial<AppState['aiState']>) => void
  
  // Sync State
  syncState: {
    isPending: boolean
    lastSync: number
    failedOperations: number
  }
  setSyncState: (syncState: Partial<AppState['syncState']>) => void
  
  // Actions
  login: (phoneNumber: string, pin?: string, biometric?: boolean) => Promise<boolean>
  logout: () => Promise<void>
  register: (userData: any) => Promise<boolean>
  initializeApp: () => Promise<void>
}

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial Authentication State
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        role: null,
      },
      setAuth: (auth) => set({ auth }),
      
      // Current User
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // UI State
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
      
      // Network State
      isOnline: false,
      setOnlineStatus: (online) => set({ isOnline: online }),
      
      // App Settings
      settings: {
        language: 'hindi',
        theme: 'light',
        offlineMode: true,
        notificationsEnabled: true,
      },
      updateSettings: (newSettings) => 
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      
      // Medical AI State
      aiState: {
        isInitialized: false,
        modelVersion: '1.0.0',
        lastUpdate: 0,
      },
      setAIState: (aiState) =>
        set((state) => ({
          aiState: { ...state.aiState, ...aiState }
        })),
      
      // Sync State
      syncState: {
        isPending: false,
        lastSync: 0,
        failedOperations: 0,
      },
      setSyncState: (syncState) =>
        set((state) => ({
          syncState: { ...state.syncState, ...syncState }
        })),
      
      // Actions
      login: async (phoneNumber: string, pin?: string, biometric?: boolean) => {
        set({ isLoading: true })
        try {
          const result = await authService.login({ phoneNumber, pin, biometric })
          
          if (result.success && result.user) {
            const authState = {
              isAuthenticated: true,
              user: result.user,
              token: authService.getAuthToken(),
              role: result.user.role,
            }
            
            set({ 
              auth: authState,
              currentUser: result.user,
              isLoading: false
            })
            
            return true
          } else {
            set({ isLoading: false })
            console.error('Login failed:', result.error)
            return false
          }
        } catch (error) {
          set({ isLoading: false })
          console.error('Login error:', error)
          return false
        }
      },
      
      logout: async () => {
        set({ isLoading: true })
        try {
          await authService.logout()
          
          set({
            auth: {
              isAuthenticated: false,
              user: null,
              token: null,
              role: null,
            },
            currentUser: null,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          console.error('Logout error:', error)
        }
      },
      
      register: async (userData: any) => {
        set({ isLoading: true })
        try {
          const result = await authService.register(userData)
          
          if (result.success && result.user) {
            const authState = {
              isAuthenticated: true,
              user: result.user,
              token: authService.getAuthToken(),
              role: result.user.role,
            }
            
            set({
              auth: authState,
              currentUser: result.user,
              isLoading: false
            })
            
            return true
          } else {
            set({ isLoading: false })
            console.error('Registration failed:', result.error)
            return false
          }
        } catch (error) {
          set({ isLoading: false })
          console.error('Registration error:', error)
          return false
        }
      },
      
      initializeApp: async () => {
        set({ isLoading: true })
        try {
          // Initialize authentication
          const authState = await authService.initialize()
          
          set({
            auth: authState,
            currentUser: authState.user,
            isLoading: false
          })
          
          console.log('App initialized successfully')
        } catch (error) {
          set({ isLoading: false })
          console.error('App initialization failed:', error)
        }
      },
    }),
    {
      name: 'loksehat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist certain parts of the state
      partialize: (state) => ({
        settings: state.settings,
        aiState: state.aiState,
        syncState: state.syncState,
      }),
    }
  )
)

// Selectors for common use cases
export const useAuth = () => useAppStore((state) => state.auth)
export const useCurrentUser = () => useAppStore((state) => state.currentUser)
export const useSettings = () => useAppStore((state) => state.settings)
export const useIsLoading = () => useAppStore((state) => state.isLoading)
export const useIsOnline = () => useAppStore((state) => state.isOnline)
export const useAIState = () => useAppStore((state) => state.aiState)
export const useSyncState = () => useAppStore((state) => state.syncState)

// Auth actions
export const useAuthActions = () => useAppStore((state) => ({
  login: state.login,
  logout: state.logout,
  register: state.register,
  setAuth: state.setAuth,
}))

// App actions
export const useAppActions = () => useAppStore((state) => ({
  initializeApp: state.initializeApp,
  setLoading: state.setLoading,
  setOnlineStatus: state.setOnlineStatus,
  updateSettings: state.updateSettings,
  setAIState: state.setAIState,
  setSyncState: state.setSyncState,
}))

export default useAppStore