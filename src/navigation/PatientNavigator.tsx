// Patient Navigation Structure
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { useSettings } from '../store/AppStore'

// Patient Screens
import PatientDashboard from '../screens/patient/PatientDashboard'
import SymptomChecker from '../screens/patient/SymptomChecker'
import ConsultationsList from '../screens/patient/ConsultationsList'
import HealthRecords from '../screens/patient/HealthRecords'
import MedicineSearch from '../screens/patient/MedicineSearch'
import ProfileScreen from '../screens/common/ProfileScreen'

// Additional Patient Screens
import BookConsultation from '../screens/patient/BookConsultation'
import VideoConsultation from '../screens/patient/VideoConsultation'
import PrescriptionView from '../screens/patient/PrescriptionView'
import HealthRecordDetail from '../screens/patient/HealthRecordDetail'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

// Main Patient Tabs
const PatientTabs: React.FC = () => {
  const settings = useSettings()

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Symptoms') {
            iconName = focused ? 'medical' : 'medical-outline'
          } else if (route.name === 'Consultations') {
            iconName = focused ? 'videocam' : 'videocam-outline'
          } else if (route.name === 'Records') {
            iconName = focused ? 'folder' : 'folder-outline'
          } else if (route.name === 'Medicines') {
            iconName = focused ? 'medical' : 'medical-outline'
          } else {
            iconName = 'ellipse'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: settings.theme === 'dark' ? '#1a1a1a' : '#ffffff',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={PatientDashboard}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Symptoms" 
        component={SymptomChecker}
        options={{ title: 'Symptom Checker' }}
      />
      <Tab.Screen 
        name="Consultations" 
        component={ConsultationsList}
        options={{ title: 'Consultations' }}
      />
      <Tab.Screen 
        name="Records" 
        component={HealthRecords}
        options={{ title: 'Health Records' }}
      />
      <Tab.Screen 
        name="Medicines" 
        component={MedicineSearch}
        options={{ title: 'Medicines' }}
      />
    </Tab.Navigator>
  )
}

// Patient Stack Navigator
const PatientNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="PatientTabs" 
        component={PatientTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BookConsultation" 
        component={BookConsultation}
        options={{ title: 'Book Consultation' }}
      />
      <Stack.Screen 
        name="VideoConsultation" 
        component={VideoConsultation}
        options={{ 
          title: 'Video Consultation',
          headerLeft: () => null, // Prevent going back during consultation
        }}
      />
      <Stack.Screen 
        name="PrescriptionView" 
        component={PrescriptionView}
        options={{ title: 'Prescription' }}
      />
      <Stack.Screen 
        name="HealthRecordDetail" 
        component={HealthRecordDetail}
        options={{ title: 'Health Record' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  )
}

export default PatientNavigator