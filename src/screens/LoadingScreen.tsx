// Loading Screen for App Initialization
import React, { useEffect } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppActions } from '../store/AppStore'

const LoadingScreen: React.FC = () => {
  const { initializeApp } = useAppActions()

  useEffect(() => {
    initializeApp()
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="medical" size={80} color="#4CAF50" />
        <Text style={styles.title}>Lok Sehat</Text>
        <Text style={styles.subtitle}>लोक स्वास्थ्य</Text>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
        
        <Text style={styles.description}>
          Offline-first healthcare platform{'\n'}
          for rural communities
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
    marginTop: 5,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default LoadingScreen