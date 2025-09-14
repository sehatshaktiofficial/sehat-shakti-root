// Patient Queue - Doctor's patient management interface
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface PatientQueueItem {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  scheduledAt: Date
  urgencyLevel: number
  chiefComplaint: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  consultationType: 'video' | 'audio' | 'offline' | 'text'
  symptoms: any[]
}

const PatientQueue: React.FC = () => {
  const [patients, setPatients] = useState<PatientQueueItem[]>([])
  const [filteredPatients, setFilteredPatients] = useState<PatientQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'in_progress' | 'urgent'>('all')
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadPatientQueue()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchQuery, filterStatus])

  const loadPatientQueue = async () => {
    try {
      setIsLoading(true)
      
      const consultations = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', currentUser?.id || ''),
          Q.sortBy('scheduled_at', Q.asc)
        )
        .fetch()

      const patientsWithDetails = await Promise.all(
        consultations.map(async (consultation) => {
          const patient = await database.collections
            .get('users')
            .find(consultation.patientId)
          
          return {
            id: consultation.id,
            patientId: consultation.patientId,
            patientName: patient.name,
            patientPhone: patient.phoneNumber,
            scheduledAt: consultation.scheduledAt,
            urgencyLevel: consultation.urgencyLevel,
            chiefComplaint: consultation.chiefComplaint || 'No complaint specified',
            status: consultation.status,
            consultationType: consultation.consultationType,
            symptoms: consultation.symptoms || [],
          }
        })
      )

      setPatients(patientsWithDetails)
    } catch (error) {
      console.error('Error loading patient queue:', error)
      Alert.alert('Error', 'Failed to load patient queue')
    } finally {
      setIsLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = patients

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(patient =>
        patient.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patientPhone.includes(searchQuery) ||
        patient.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus === 'scheduled') {
      filtered = filtered.filter(patient => patient.status === 'scheduled')
    } else if (filterStatus === 'in_progress') {
      filtered = filtered.filter(patient => patient.status === 'in_progress')
    } else if (filterStatus === 'urgent') {
      filtered = filtered.filter(patient => patient.urgencyLevel >= 8)
    }

    setFilteredPatients(filtered)
  }

  const handleStartConsultation = async (patientId: string) => {
    try {
      // Update consultation status to in_progress
      const consultation = await database.collections
        .get('consultations')
        .find(patientId)

      await database.write(async () => {
        await consultation.update((record: any) => {
          record.status = 'in_progress'
          record.startedAt = new Date()
        })
      })

      // Navigate to video consultation
      Alert.alert('Consultation Started', 'Starting consultation with patient...')
      
      // Reload queue
      loadPatientQueue()
    } catch (error) {
      console.error('Error starting consultation:', error)
      Alert.alert('Error', 'Failed to start consultation')
    }
  }

  const handleCompleteConsultation = async (patientId: string) => {
    try {
      const consultation = await database.collections
        .get('consultations')
        .find(patientId)

      await database.write(async () => {
        await consultation.update((record: any) => {
          record.status = 'completed'
          record.endedAt = new Date()
        })
      })

      Alert.alert('Consultation Completed', 'Consultation marked as completed')
      loadPatientQueue()
    } catch (error) {
      console.error('Error completing consultation:', error)
      Alert.alert('Error', 'Failed to complete consultation')
    }
  }

  const handleViewPatient = (patientId: string) => {
    // Navigate to patient detail
    Alert.alert('View Patient', 'Opening patient details...')
  }

  const getUrgencyColor = (urgencyLevel: number) => {
    if (urgencyLevel >= 9) return '#F44336'
    if (urgencyLevel >= 7) return '#FF9800'
    if (urgencyLevel >= 5) return '#FFC107'
    return '#4CAF50'
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

  const renderPatientItem = ({ item }: { item: PatientQueueItem }) => (
    <View style={styles.patientCard}>
      <View style={styles.patientHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientPhone}>{item.patientPhone}</Text>
          <Text style={styles.scheduledTime}>
            {new Date(item.scheduledAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.patientStatus}>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgencyLevel) }]}>
            <Text style={styles.urgencyText}>
              {item.urgencyLevel >= 9 ? 'CRITICAL' : 
               item.urgencyLevel >= 7 ? 'HIGH' : 
               item.urgencyLevel >= 5 ? 'MEDIUM' : 'LOW'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.complaintSection}>
        <Text style={styles.complaintLabel}>Chief Complaint:</Text>
        <Text style={styles.complaintText}>{item.chiefComplaint}</Text>
      </View>

      {item.symptoms.length > 0 && (
        <View style={styles.symptomsSection}>
          <Text style={styles.symptomsLabel}>Symptoms:</Text>
          <View style={styles.symptomsList}>
            {item.symptoms.map((symptom, index) => (
              <View key={index} style={styles.symptomTag}>
                <Text style={styles.symptomText}>{symptom.name || symptom}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleViewPatient(item.patientId)}
        >
          <Ionicons name="eye" size={16} color="#2196F3" />
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>

        {item.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartConsultation(item.id)}
          >
            <Ionicons name="play" size={16} color="white" />
            <Text style={[styles.buttonText, { color: 'white' }]}>Start</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleCompleteConsultation(item.id)}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={[styles.buttonText, { color: 'white' }]}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Patients in Queue</Text>
      <Text style={styles.emptySubtitle}>
        {filterStatus === 'all' 
          ? 'No patients scheduled for consultation'
          : `No patients with ${filterStatus} status`
        }
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {(['all', 'scheduled', 'in_progress', 'urgent'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              filterStatus === filter && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(filter)}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === filter && styles.filterButtonTextActive
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        renderItem={renderPatientItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadPatientQueue} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
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
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  patientCard: {
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
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  patientPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scheduledTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  patientStatus: {
    alignItems: 'flex-end',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  urgencyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
  complaintSection: {
    marginBottom: 12,
  },
  complaintLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  complaintText: {
    fontSize: 14,
    color: '#666',
  },
  symptomsSection: {
    marginBottom: 12,
  },
  symptomsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  symptomTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  symptomText: {
    fontSize: 12,
    color: '#1976D2',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 14,
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

export default PatientQueue
