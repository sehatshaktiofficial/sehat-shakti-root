// Authentication Screen for Lok Sehat
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthActions, useIsLoading } from '../store/AppStore'
import { DatabaseService } from '../database'

interface AuthFormData {
  phoneNumber: string
  pin: string
  name: string
  role: 'patient' | 'doctor' | 'pharmacist'
  village: string
  preferredLanguage: string
  // Doctor-specific fields
  registrationNo: string
  speciality: string
  hospital: string
  address: string
  smcId: string | null
}

interface SMC {
  value: number
  label: string
  code: string
  state: string
}

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState<AuthFormData>({
    phoneNumber: '',
    pin: '',
    name: '',
    role: 'patient',
    village: '',
    preferredLanguage: 'hindi',
    registrationNo: '',
    speciality: '',
    hospital: '',
    address: '',
    smcId: null
  })
  
  const [smcs, setSmcs] = useState<SMC[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  
  const { login, register } = useAuthActions()
  const isLoading = useIsLoading()

  useEffect(() => {
    // Initialize database when auth screen loads
    initializeDatabase()
    // Load SMCs for doctor registration
    loadSMCs()
  }, [])

  const initializeDatabase = async () => {
    try {
      await DatabaseService.initializeDatabase()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Database initialization failed:', error)
    }
  }

  const loadSMCs = async () => {
    try {
      const { authService } = await import('../services/AuthService')
      const result = await authService.getAvailableSMCs()
      
      if (result.success && result.smcs) {
        setSmcs(result.smcs)
      }
    } catch (error) {
      console.error('Failed to load SMCs:', error)
    }
  }

  const verifyDoctorRegistration = async () => {
    if (!formData.registrationNo || !formData.smcId) {
      Alert.alert('Error', 'Please fill in registration number and select SMC')
      return
    }

    setIsVerifying(true)
    try {
      const { authService } = await import('../services/AuthService')
      
      const result = await authService.verifyDoctorRegistration({
        registrationNo: formData.registrationNo,
        smcId: parseInt(formData.smcId!),
        doctorName: formData.name
      })

      if (result.success) {
        Alert.alert(
          'Verification Started', 
          'Doctor verification has been initiated. Please wait for results.',
          [
            { text: 'OK', onPress: () => checkVerificationResult(result.requestId!) }
          ]
        )
      } else {
        Alert.alert('Verification Failed', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Doctor verification error:', error)
      Alert.alert('Error', 'Failed to start verification')
    } finally {
      setIsVerifying(false)
    }
  }

  const checkVerificationResult = async (requestId: string) => {
    try {
      const { authService } = await import('../services/AuthService')
      
      const result = await authService.getDoctorVerificationResult(requestId)
      
      if (result.success && result.result) {
        setVerificationResult(result.result)
        
        if (result.result.isPending) {
          Alert.alert(
            'Verification Pending', 
            'Verification is still in progress. Please check again in a few minutes.',
            [
              { text: 'Check Again', onPress: () => checkVerificationResult(requestId) },
              { text: 'Cancel' }
            ]
          )
        } else if (result.result.isValid) {
          Alert.alert(
            'Verification Successful', 
            'Your registration has been verified with the government database.',
            [{ text: 'Continue Registration' }]
          )
        } else {
          Alert.alert(
            'Verification Failed', 
            result.result.message || 'Registration could not be verified.',
            [{ text: 'Try Again' }]
          )
        }
      }
    } catch (error) {
      console.error('Check verification result error:', error)
      Alert.alert('Error', 'Failed to check verification status')
    }
  }

  const handleSubmit = async () => {
    if (!formData.phoneNumber || !formData.pin) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    if (formData.phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number')
      return
    }

    if (formData.pin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits')
      return
    }

    try {
      let success = false

      if (isLogin) {
        success = await login(formData.phoneNumber, formData.pin)
        if (!success) {
          Alert.alert('Login Failed', 'Invalid phone number or PIN')
        }
      } else {
        if (!formData.name) {
          Alert.alert('Error', 'Please enter your name')
          return
        }
        
        success = await register(formData)
        if (!success) {
          Alert.alert('Registration Failed', 'Please try again')
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    }
  }

  const updateFormData = (field: keyof AuthFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="medical" size={60} color="#4CAF50" />
          <Text style={styles.title}>Lok Sehat</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Welcome Back' : 'Join Us'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(text) => updateFormData('phoneNumber', text)}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="PIN (4-6 digits)"
              value={formData.pin}
              onChangeText={(text) => updateFormData('pin', text)}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          {!isLogin && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="location" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Village/City"
                  value={formData.village}
                  onChangeText={(text) => updateFormData('village', text)}
                />
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Role:</Text>
                <View style={styles.roleSelector}>
                  {(['patient', 'doctor', 'pharmacist'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        formData.role === role && styles.roleButtonActive
                      ]}
                      onPress={() => updateFormData('role', role)}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        formData.role === role && styles.roleButtonTextActive
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Preferred Language:</Text>
                <View style={styles.roleSelector}>
                  {(['hindi', 'punjabi', 'english'] as const).map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.roleButton,
                        formData.preferredLanguage === lang && styles.roleButtonActive
                      ]}
                      onPress={() => updateFormData('preferredLanguage', lang)}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        formData.preferredLanguage === lang && styles.roleButtonTextActive
                      ]}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Doctor-specific fields */}
              {formData.role === 'doctor' && (
                <>
                  <View style={styles.inputContainer}>
                    <Ionicons name="card" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Medical Registration Number"
                      value={formData.registrationNo}
                      onChangeText={(text) => updateFormData('registrationNo', text)}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="business" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Speciality (e.g., General Medicine)"
                      value={formData.speciality}
                      onChangeText={(text) => updateFormData('speciality', text)}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="business" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Hospital/Clinic Name"
                      value={formData.hospital}
                      onChangeText={(text) => updateFormData('hospital', text)}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="location" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Practice Address"
                      value={formData.address}
                      onChangeText={(text) => updateFormData('address', text)}
                    />
                  </View>

                  <View style={styles.pickerContainer}>
                    <Text style={styles.label}>State Medical Council:</Text>
                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => {
                          // Simple picker for now - in production, use a proper picker component
                          Alert.alert(
                            'Select SMC',
                            'Choose your State Medical Council',
                            smcs.map(smc => ({
                              text: smc.label,
                              onPress: () => updateFormData('smcId', smc.value.toString())
                            })).concat([{ text: 'Cancel', onPress: () => {} }])
                          )
                        }}
                      >
                        <Text style={[
                          styles.dropdownText,
                          !formData.smcId && styles.dropdownPlaceholder
                        ]}>
                          {formData.smcId 
                            ? smcs.find(smc => smc.value.toString() === formData.smcId)?.label || 'Select SMC'
                            : 'Select State Medical Council'
                          }
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {formData.registrationNo && formData.smcId && (
                    <TouchableOpacity
                      style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
                      onPress={verifyDoctorRegistration}
                      disabled={isVerifying}
                    >
                      <Ionicons 
                        name={isVerifying ? "hourglass" : "checkmark-circle"} 
                        size={20} 
                        color="#fff" 
                        style={styles.verifyButtonIcon}
                      />
                      <Text style={styles.verifyButtonText}>
                        {isVerifying ? 'Verifying...' : 'Verify Registration'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {verificationResult && (
                    <View style={[
                      styles.verificationResult,
                      verificationResult.isValid ? styles.verificationSuccess : styles.verificationError
                    ]}>
                      <Ionicons 
                        name={verificationResult.isValid ? "checkmark-circle" : "close-circle"} 
                        size={20} 
                        color={verificationResult.isValid ? "#4CAF50" : "#f44336"} 
                      />
                      <Text style={styles.verificationText}>
                        {verificationResult.isValid 
                          ? 'Registration verified successfully!' 
                          : verificationResult.message || 'Verification failed'
                        }
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchButtonText}>
              {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🌿 Offline-first healthcare for rural communities
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Doctor verification styles
  dropdownContainer: {
    marginTop: 5,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  verifyButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonIcon: {
    marginRight: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  verificationSuccess: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  verificationError: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  verificationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
})

export default AuthScreen