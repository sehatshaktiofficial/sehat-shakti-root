// Doctor Dashboard - Main interface for doctors
import React, { useState, useEffect } from 'react'
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
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface DashboardStats {
  totalPatients: number
  todayConsultations: number
  pendingConsultations: number
  completedConsultations: number
  urgentCases: number
}

const DoctorDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayConsultations: 0,
    pendingConsultations: 0,
    completedConsultations: 0,
    urgentCases: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentPatients, setRecentPatients] = useState<any[]>([])
  
  const currentUser = useCurrentUser()
  const isOnline = useIsOnline()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load patient statistics
      const totalPatients = await database.collections
        .get('users')
        .query(Q.where('role', 'patient'))
        .fetchCount()

      // Load today's consultations
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayConsultations = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', currentUser?.id || ''),
          Q.where('scheduled_at', Q.gte(today.getTime())),
          Q.where('scheduled_at', Q.lt(tomorrow.getTime()))
        )
        .fetchCount()

      // Load pending consultations
      const pendingConsultations = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', currentUser?.id || ''),
          Q.where('status', 'scheduled')
        )
        .fetchCount()

      // Load completed consultations
      const completedConsultations = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', currentUser?.id || ''),
          Q.where('status', 'completed')
        )
        .fetchCount()

      // Load urgent cases
      const urgentCases = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', currentUser?.id || ''),
          Q.where('urgency_level', Q.gte(8))
        )
        .fetchCount()

      // Load recent patients
      const recentPatientsData = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', currentUser?.id || ''),
          Q.sortBy('created_at', Q.desc),
          Q.take(5)
        )
        .fetch()

      const patientsWithDetails = await Promise.all(
        recentPatientsData.map(async (consultation) => {
          const patient = await database.collections
            .get('users')
            .find(consultation.patientId)
          return {
            ...consultation,
            patientName: patient.name,
            patientPhone: patient.phoneNumber,
          }
        })
      )

      setStats({
        totalPatients,
        todayConsultations,
        pendingConsultations,
        completedConsultations,
        urgentCases,
      })
      
      setRecentPatients(patientsWithDetails)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Error', 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartConsultation = (consultationId: string) => {
    // Navigate to video consultation
    Alert.alert('Start Consultation', 'Starting consultation...')
  }

  const handleViewPatient = (patientId: string) => {
    // Navigate to patient detail
    Alert.alert('View Patient', 'Opening patient details...')
  }

  const renderStatCard = (title: string, value: number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <Ionicons name={icon as any} size={24} color={color} />
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    </View>
  )

  const renderRecentPatient = (consultation: any) => (
    <TouchableOpacity
      key={consultation.id}
      style={styles.patientCard}
      onPress={() => handleViewPatient(consultation.patientId)}
    >
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{consultation.patientName}</Text>
        <Text style={styles.patientPhone}>{consultation.patientPhone}</Text>
        <Text style={styles.consultationTime}>
          {new Date(consultation.scheduledAt).toLocaleString()}
        </Text>
      </View>
      <View style={styles.patientActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            consultation.status === 'scheduled' ? styles.startButton : styles.viewButton
          ]}
          onPress={() => handleStartConsultation(consultation.id)}
        >
          <Ionicons
            name={consultation.status === 'scheduled' ? 'play' : 'eye'}
            size={16}
            color="white"
          />
        </TouchableOpacity>
        {consultation.urgencyLevel >= 8 && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadDashboardData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, Dr. {currentUser?.name}
        </Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#FF9800' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline Mode'}
          </Text>
        </View>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        {renderStatCard('Total Patients', stats.totalPatients, 'people', '#2196F3')}
        {renderStatCard('Today\'s Consultations', stats.todayConsultations, 'calendar', '#4CAF50')}
        {renderStatCard('Pending', stats.pendingConsultations, 'time', '#FF9800')}
        {renderStatCard('Completed', stats.completedConsultations, 'checkmark-circle', '#4CAF50')}
        {renderStatCard('Urgent Cases', stats.urgentCases, 'warning', '#F44336')}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="add" size={24} color="#2196F3" />
            <Text style={styles.quickActionText}>New Consultation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="search" size={24} color="#4CAF50" />
            <Text style={styles.quickActionText}>Search Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="medical" size={24} color="#FF9800" />
            <Text style={styles.quickActionText}>Write Prescription</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="library" size={24} color="#9C27B0" />
            <Text style={styles.quickActionText}>Medicine Database</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Patients */}
      <View style={styles.recentPatients}>
        <Text style={styles.sectionTitle}>Recent Patients</Text>
        {recentPatients.length > 0 ? (
          recentPatients.map(renderRecentPatient)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No recent patients</Text>
          </View>
        )}
      </View>

      {/* Emergency Protocol */}
      <View style={styles.emergencySection}>
        <TouchableOpacity style={styles.emergencyButton}>
          <Ionicons name="warning" size={24} color="white" />
          <Text style={styles.emergencyText}>Emergency Protocol</Text>
        </TouchableOpacity>
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
    borderBottomColor: '#eee',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  recentPatients: {
    padding: 20,
  },
  patientCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  patientPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  consultationTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  patientActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  viewButton: {
    backgroundColor: '#2196F3',
  },
  urgentBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  urgentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emergencySection: {
    padding: 20,
  },
  emergencyButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
})

export default DoctorDashboard
