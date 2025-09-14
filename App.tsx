// SehatShakti - Unified Telemedicine Platform
import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet, Text } from 'react-native'
import AppNavigator from './src/navigation/AppNavigator'
import { useAppActions } from './src/store/AppStore'

export default function App() {
  const { initializeApp } = useAppActions()

  useEffect(() => {
    // Initialize the app when it starts
    initializeApp()
  }, [])

  return (
    <>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <AppNavigator />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
})
