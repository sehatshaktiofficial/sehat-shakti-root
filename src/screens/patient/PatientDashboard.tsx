// Patient Dashboard - Main screen for patients
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser, useIsOnline } from '../../store/AppStore'
import { offlineAIService } from '../../services/OfflineAI'
import { groqMedicalService } from '../../services/GroqService'
import { DatabaseService } from '../../database'

interface DashboardCard {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  onPress: () => void
  status?: string
}

const PatientDashboard: React.FC = ({ navigation }: any) => {
  const currentUser = useCurrentUser()
  const isOnline = useIsOnline()
  const [refreshing, setRefreshing] = useState(false)
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [dbStats, setDbStats] = useState<any>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get AI service status
      const aiStatusData = offlineAIService.getStatus()
      setAiStatus(aiStatusData)

      // Get database statistics
      const stats = await DatabaseService.getDatabaseStats()
      setDbStats(stats)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const handleEmergency = () => {
    Alert.alert(
      'Emergency',
      'Are you experiencing a medical emergency?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes - Emergency', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement emergency protocol
            Alert.alert(
              'Emergency Protocol Activated',
              'Emergency contacts have been notified.\nCall 108 for immediate medical assistance.'
            )
          }
        }
      ]
    )
  }

  const dashboardCards: DashboardCard[] = [
    {
      title: 'Symptom Checker',
      icon: 'medical',
      color: '#FF9800',
      onPress: () => navigation.navigate('Symptoms'),
      status: aiStatus?.isInitialized ? 'AI Ready' : 'Loading...'
    },
    {
      title: 'Video Consultation',
      icon: 'videocam',
      color: '#2196F3',
      onPress: () => navigation.navigate('BookConsultation'),
      status: isOnline ? 'Online' : 'Offline Mode'
    },
    {
      title: 'Health Records',
      icon: 'folder',
      color: '#9C27B0',
      onPress: () => navigation.navigate('Records'),
      status: dbStats ? `${dbStats.healthRecords} records` : 'Loading...'
    },
    {
      title: 'Medicine Search',
      icon: 'search',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Medicines'),
      status: dbStats ? `${dbStats.medicines} medicines` : 'Loading...'
    },
    {
      title: 'My Consultations',
      icon: 'calendar',
      color: '#607D8B',
      onPress: () => navigation.navigate('Consultations'),
      status: dbStats ? `${dbStats.consultations} total` : 'Loading...'
    },
    {
      title: 'Profile',
      icon: 'person',
      color: '#795548',
      onPress: () => navigation.navigate('Profile')
    }
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            {getGreeting()}, {currentUser?.name || 'User'}
          </Text>
          <Text style={styles.subtitle}>How can we help you today?</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#FF9800' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline Mode'}
          </Text>
        </View>
      </View>

      {/* Emergency Button */}
      <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
        <Ionicons name="warning" size={24} color="white" />
        <Text style={styles.emergencyButtonText}>Emergency</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.cardGrid}>
          {dashboardCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={card.onPress}
            >
              <View style={[styles.cardIcon, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={28} color="white" />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              {card.status && (
                <Text style={styles.cardStatus}>{card.status}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Health Tips */}
      <View style={styles.healthTips}>
        <Text style={styles.sectionTitle}>Today's Health Tip</Text>
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color="#FF9800" />
          <Text style={styles.tipText}>
            Drink at least 8 glasses of water daily to stay hydrated and maintain good health.
          </Text>
        </View>
      </View>

      {/* System Status */}
      <View style={styles.systemStatus}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="hardware-chip" size={20} color="#4CAF50" />
            <Text style={styles.statusLabel}>AI System</Text>
            <Text style={[styles.statusValue, { color: aiStatus?.isInitialized ? '#4CAF50' : '#FF9800' }]}>
              {aiStatus?.isInitialized ? 'Ready' : 'Initializing'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="server" size={20} color="#4CAF50" />
            <Text style={styles.statusLabel}>Database</Text>
            <Text style={[styles.statusValue, { color: '#4CAF50' }]}>
              {dbStats ? 'Active' : 'Loading'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="cloud" size={20} color={isOnline ? '#4CAF50' : '#FF9800'} />
            <Text style={styles.statusLabel}>Network</Text>
            <Text style={[styles.statusValue, { color: isOnline ? '#4CAF50' : '#FF9800' }]}>
              {isOnline ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  healthTips: {
    padding: 20,
    paddingTop: 0,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 1,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  systemStatus: {
    padding: 20,
    paddingTop: 0,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    elevation: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
})

export default PatientDashboard