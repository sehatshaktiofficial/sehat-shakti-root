// Pharmacist Navigator - Complete Pharmacist Interface
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { useSettings } from '../store/AppStore'

// Pharmacist Screens
import PharmacistDashboard from '../screens/pharmacist/PharmacistDashboard'
import PrescriptionVerification from '../screens/pharmacist/PrescriptionVerification'
import InventoryManagement from '../screens/pharmacist/InventoryManagement'
import MedicineSearch from '../screens/pharmacist/MedicineSearch'
import SalesReport from '../screens/pharmacist/SalesReport'
import ProfileScreen from '../screens/common/ProfileScreen'

// Additional Pharmacist Screens
import PrescriptionDetail from '../screens/pharmacist/PrescriptionDetail'
import MedicineDetail from '../screens/pharmacist/MedicineDetail'
import StockUpdate from '../screens/pharmacist/StockUpdate'
import QRScanner from '../screens/pharmacist/QRScanner'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

// Main Pharmacist Tabs
const PharmacistTabs: React.FC = () => {
  const settings = useSettings()

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Prescriptions') {
            iconName = focused ? 'document-text' : 'document-text-outline'
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline'
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline'
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline'
          } else {
            iconName = 'ellipse'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#FF9800',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: settings.theme === 'dark' ? '#1a1a1a' : '#ffffff',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={PharmacistDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Prescriptions" 
        component={PrescriptionVerification}
        options={{ title: 'Prescriptions' }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={InventoryManagement}
        options={{ title: 'Inventory' }}
      />
      <Tab.Screen 
        name="Search" 
        component={MedicineSearch}
        options={{ title: 'Search' }}
      />
      <Tab.Screen 
        name="Reports" 
        component={SalesReport}
        options={{ title: 'Reports' }}
      />
    </Tab.Navigator>
  )
}

// Pharmacist Stack Navigator
const PharmacistNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FF9800',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="PharmacistTabs" 
        component={PharmacistTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PrescriptionDetail" 
        component={PrescriptionDetail}
        options={{ title: 'Prescription Details' }}
      />
      <Stack.Screen 
        name="MedicineDetail" 
        component={MedicineDetail}
        options={{ title: 'Medicine Details' }}
      />
      <Stack.Screen 
        name="StockUpdate" 
        component={StockUpdate}
        options={{ title: 'Update Stock' }}
      />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScanner}
        options={{ title: 'Scan QR Code' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  )
}

export default PharmacistNavigator