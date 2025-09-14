// Doctor Navigator - Complete Doctor Interface
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { useSettings } from '../store/AppStore'

// Doctor Screens
import DoctorDashboard from '../screens/doctor/DoctorDashboard'
import PatientQueue from '../screens/doctor/PatientQueue'
import ConsultationsList from '../screens/doctor/ConsultationsList'
import PrescriptionWriter from '../screens/doctor/PrescriptionWriter'
import PatientRecords from '../screens/doctor/PatientRecords'
import ProfileScreen from '../screens/common/ProfileScreen'

// Additional Doctor Screens
import VideoConsultation from '../screens/doctor/VideoConsultation'
import PatientDetail from '../screens/doctor/PatientDetail'
import ConsultationNotes from '../screens/doctor/ConsultationNotes'
import MedicineDatabase from '../screens/doctor/MedicineDatabase'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

// Main Doctor Tabs
const DoctorTabs: React.FC = () => {
  const settings = useSettings()

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Queue') {
            iconName = focused ? 'people' : 'people-outline'
          } else if (route.name === 'Consultations') {
            iconName = focused ? 'videocam' : 'videocam-outline'
          } else if (route.name === 'Prescriptions') {
            iconName = focused ? 'medical' : 'medical-outline'
          } else if (route.name === 'Records') {
            iconName = focused ? 'folder' : 'folder-outline'
          } else {
            iconName = 'ellipse'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: settings.theme === 'dark' ? '#1a1a1a' : '#ffffff',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DoctorDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Queue" 
        component={PatientQueue}
        options={{ title: 'Patient Queue' }}
      />
      <Tab.Screen 
        name="Consultations" 
        component={ConsultationsList}
        options={{ title: 'Consultations' }}
      />
      <Tab.Screen 
        name="Prescriptions" 
        component={PrescriptionWriter}
        options={{ title: 'Prescriptions' }}
      />
      <Tab.Screen 
        name="Records" 
        component={PatientRecords}
        options={{ title: 'Records' }}
      />
    </Tab.Navigator>
  )
}

// Doctor Stack Navigator
const DoctorNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="DoctorTabs" 
        component={DoctorTabs}
        options={{ headerShown: false }}
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
        name="PatientDetail" 
        component={PatientDetail}
        options={{ title: 'Patient Details' }}
      />
      <Stack.Screen 
        name="ConsultationNotes" 
        component={ConsultationNotes}
        options={{ title: 'Consultation Notes' }}
      />
      <Stack.Screen 
        name="MedicineDatabase" 
        component={MedicineDatabase}
        options={{ title: 'Medicine Database' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  )
}

export default DoctorNavigator