// Consultations List - Doctor's consultation history and management
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface Consultation {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  patientGender: string
  symptoms: string[]
  diagnosis: string
  prescriptionId?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  scheduledAt: Date
  startedAt?: Date
  completedAt?: Date
  notes: string
  followUpRequired: boolean
  followUpDate?: Date
}

const ConsultationsList: React.FC = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all')
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadConsultations()
  }, [])

  useEffect(() => {
    filterConsultations()
  }, [consultations, selectedStatus])

  const loadConsultations = async () => {
    try {
      setIsLoading(true)
      
      const consultationsData = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', Q.eq(currentUser?.id || '')),
          Q.sortBy('scheduled_at', Q.desc)
        )
        .fetch()

      const consultationsList: Consultation[] = consultationsData.map(consultation => ({
        id: consultation.id,
        patientId: (consultation as any).patientId,
        patientName: (consultation as any).patientName || 'Unknown Patient',
        patientAge: (consultation as any).patientAge || 0,
        patientGender: (consultation as any).patientGender || 'Unknown',
        symptoms: (consultation as any).symptoms || [],
        diagnosis: (consultation as any).diagnosis || '',
        prescriptionId: (consultation as any).prescriptionId,
        status: (consultation as any).status || 'scheduled',
        scheduledAt: new Date((consultation as any).scheduledAt || consultation.createdAt),
        startedAt: (consultation as any).startedAt ? new Date((consultation as any).startedAt) : undefined,
        completedAt: (consultation as any).completedAt ? new Date((consultation as any).completedAt) : undefined,
        notes: (consultation as any).notes || '',
        followUpRequired: (consultation as any).followUpRequired || false,
        followUpDate: (consultation as any).followUpDate ? new Date((consultation as any).followUpDate) : undefined,
      }))

      setConsultations(consultationsList)
    } catch (error) {
      console.error('Error loading consultations:', error)
      Alert.alert('Error', 'Failed to load consultations')
    } finally {
      setIsLoading(false)
    }
  }

  const filterConsultations = () => {
    let filtered = consultations

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(consultation => consultation.status === selectedStatus)
    }

    setFilteredConsultations(filtered)
  }

  const startConsultation = async (consultationId: string) => {
    try {
      const consultationRecord = await database.collections
        .get('consultations')
        .find(consultationId)

      await database.write(async () => {
        await consultationRecord.update((record: any) => {
          record.status = 'in_progress'
          record.startedAt = Date.now()
        })
      })

      // Update local state
      setConsultations(prev => 
        prev.map(consultation => 
          consultation.id === consultationId 
            ? { 
                ...consultation, 
                status: 'in_progress' as const,
                startedAt: new Date()
              }
            : consultation
        )
      )

      Alert.alert('Consultation Started', 'You can now begin the consultation')
    } catch (error) {
      console.error('Error starting consultation:', error)
      Alert.alert('Error', 'Failed to start consultation')
    }
  }

  const completeConsultation = async (consultationId: string) => {
    try {
      const consultationRecord = await database.collections
        .get('consultations')
        .find(consultationId)

      await database.write(async () => {
        await consultationRecord.update((record: any) => {
          record.status = 'completed'
          record.completedAt = Date.now()
        })
      })

      // Update local state
      setConsultations(prev => 
        prev.map(consultation => 
          consultation.id === consultationId 
            ? { 
                ...consultation, 
                status: 'completed' as const,
                completedAt: new Date()
              }
            : consultation
        )
      )

      Alert.alert('Consultation Completed', 'Consultation has been completed successfully')
    } catch (error) {
      console.error('Error completing consultation:', error)
      Alert.alert('Error', 'Failed to complete consultation')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#2196F3'
      case 'in_progress': return '#FF9800'
      case 'completed': return '#4CAF50'
      case 'cancelled': return '#F44336'
      default: return '#666'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'SCHEDULED'
      case 'in_progress': return 'IN PROGRESS'
      case 'completed': return 'COMPLETED'
      case 'cancelled': return 'CANCELLED'
      default: return 'UNKNOWN'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderConsultationItem = ({ item }: { item: Consultation }) => (
    <TouchableOpacity style={styles.consultationCard}>
      <View style={styles.consultationHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientDetails}>
            {item.patientAge} years • {item.patientGender}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.consultationDetails}>
        <Text style={styles.scheduledTime}>
          Scheduled: {formatDate(item.scheduledAt)}
        </Text>
        
        {item.symptoms.length > 0 && (
          <View style={styles.symptomsContainer}>
            <Text style={styles.symptomsLabel}>Symptoms:</Text>
            <Text style={styles.symptomsText}>
              {item.symptoms.slice(0, 3).join(', ')}
              {item.symptoms.length > 3 && ` +${item.symptoms.length - 3} more`}
            </Text>
          </View>
        )}

        {item.diagnosis && (
          <Text style={styles.diagnosis}>
            Diagnosis: {item.diagnosis}
          </Text>
        )}

        {item.followUpRequired && item.followUpDate && (
          <View style={styles.followUpContainer}>
            <Ionicons name="calendar" size={16} color="#FF9800" />
            <Text style={styles.followUpText}>
              Follow-up: {formatDate(item.followUpDate)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        {item.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => startConsultation(item.id)}
          >
            <Ionicons name="play" size={16} color="white" />
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => completeConsultation(item.id)}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.buttonText}>Complete</Text>
          </TouchableOpacity>
        )}

        {item.prescriptionId && (
          <TouchableOpacity style={styles.prescriptionButton}>
            <Ionicons name="document-text" size={16} color="#2196F3" />
            <Text style={styles.prescriptionButtonText}>View Prescription</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Consultations</Text>
        <Text style={styles.subtitle}>Manage your patient consultations</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {(['all', 'scheduled', 'in_progress', 'completed'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              selectedStatus === status && styles.filterButtonActive
            ]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedStatus === status && styles.filterButtonTextActive
            ]}>
              {status.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Consultations List */}
      <FlatList
        data={filteredConsultations}
        renderItem={renderConsultationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadConsultations} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="medical" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Consultations Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedStatus === 'all' 
                ? 'No consultations scheduled yet'
                : `No ${selectedStatus} consultations found`
              }
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  consultationCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  patientDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  consultationDetails: {
    marginBottom: 12,
  },
  scheduledTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  symptomsContainer: {
    marginBottom: 8,
  },
  symptomsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  symptomsText: {
    fontSize: 14,
    color: '#333',
  },
  diagnosis: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  followUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  followUpText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  prescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prescriptionButtonText: {
    color: '#2196F3',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
})

export default ConsultationsList
