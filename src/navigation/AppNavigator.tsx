// Role-Based Navigation for Lok Sehat
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

// Import screens
import AuthScreen from '../screens/AuthScreen'
import PatientNavigator from './PatientNavigator'
import DoctorNavigator from './DoctorNavigator'
import PharmacistNavigator from './PharmacistNavigator'
import LoadingScreen from '../screens/LoadingScreen'

// Import hooks
import { useAuth, useIsLoading } from '../store/AppStore'

const Stack = createStackNavigator()

// Main App Navigator with Role-Based Routing
const AppNavigator: React.FC = () => {
  const auth = useAuth()
  const isLoading = useIsLoading()

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {!auth.isAuthenticated ? (
          // Authentication Flow
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Role-Based Navigation
          <>
            {auth.role === 'patient' && (
              <Stack.Screen name="PatientApp" component={PatientNavigator} />
            )}
            {auth.role === 'doctor' && (
              <Stack.Screen name="DoctorApp" component={DoctorNavigator} />
            )}
            {auth.role === 'pharmacist' && (
              <Stack.Screen name="PharmacistApp" component={PharmacistNavigator} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default AppNavigator