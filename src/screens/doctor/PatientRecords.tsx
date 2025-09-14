// Patient Records - Doctor's patient records management
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

interface PatientRecord {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  patientGender: string
  phoneNumber: string
  lastConsultation: Date
  totalConsultations: number
  primaryConditions: string[]
  allergies: string[]
  medications: string[]
  emergencyContact: string
  bloodGroup?: string
  lastUpdated: Date
}

const PatientRecords: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadPatientRecords()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchQuery])

  const loadPatientRecords = async () => {
    try {
      setIsLoading(true)
      
      // Get all patients who have consulted with this doctor
      const consultations = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', Q.eq(currentUser?.id || '')),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch()

      // Get unique patients
      const patientIds = [...new Set(consultations.map(c => (c as any).patientId))]
      
      const patientsData = await database.collections
        .get('users')
        .query(
          Q.where('id', Q.oneOf(patientIds)),
          Q.where('role', Q.eq('patient'))
        )
        .fetch()

      const patientsList: PatientRecord[] = await Promise.all(
        patientsData.map(async (patient) => {
          // Get consultation count for this patient
          const patientConsultations = consultations.filter(
            c => (c as any).patientId === patient.id
          )

          // Get health records for this patient
          const healthRecords = await database.collections
            .get('health_records')
            .query(
              Q.where('patient_id', Q.eq(patient.id)),
              Q.sortBy('created_at', Q.desc)
            )
            .fetch()

          const primaryConditions = healthRecords
            .map(record => (record as any).diagnosis)
            .filter(Boolean)
            .slice(0, 3)

          const allergies = healthRecords
            .map(record => (record as any).allergies)
            .filter(Boolean)
            .flat()
            .slice(0, 5)

          const medications = healthRecords
            .map(record => (record as any).medications)
            .filter(Boolean)
            .flat()
            .slice(0, 5)

          return {
            id: patient.id,
            patientId: patient.id,
            patientName: patient.name,
            patientAge: (patient as any).age || 0,
            patientGender: (patient as any).gender || 'Unknown',
            phoneNumber: (patient as any).phoneNumber || '',
            lastConsultation: patientConsultations.length > 0 
              ? new Date((patientConsultations[0] as any).scheduledAt || patientConsultations[0].createdAt)
              : new Date(),
            totalConsultations: patientConsultations.length,
            primaryConditions,
            allergies,
            medications,
            emergencyContact: (patient as any).emergencyContact || '',
            bloodGroup: (patient as any).bloodGroup,
            lastUpdated: new Date(),
          }
        })
      )

      setPatients(patientsList)
    } catch (error) {
      console.error('Error loading patient records:', error)
      Alert.alert('Error', 'Failed to load patient records')
    } finally {
      setIsLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = patients

    if (searchQuery) {
      filtered = filtered.filter(patient =>
        patient.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phoneNumber.includes(searchQuery) ||
        patient.primaryConditions.some(condition =>
          condition.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }

    setFilteredPatients(filtered)
  }

  const viewPatientDetails = (patient: PatientRecord) => {
    Alert.alert(
      'Patient Details',
      `Name: ${patient.patientName}\nAge: ${patient.patientAge}\nGender: ${patient.patientGender}\nPhone: ${patient.phoneNumber}\nTotal Consultations: ${patient.totalConsultations}`,
      [{ text: 'OK' }]
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    })
  }

  const renderPatientItem = ({ item }: { item: PatientRecord }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => viewPatientDetails(item)}
    >
      <View style={styles.patientHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientDetails}>
            {item.patientAge} years • {item.patientGender}
          </Text>
        </View>
        <View style={styles.consultationBadge}>
          <Text style={styles.consultationCount}>{item.totalConsultations}</Text>
          <Text style={styles.consultationLabel}>visits</Text>
        </View>
      </View>

      <View style={styles.patientDetails}>
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
        <Text style={styles.lastVisit}>
          Last visit: {formatDate(item.lastConsultation)}
        </Text>
      </View>

      {item.primaryConditions.length > 0 && (
        <View style={styles.conditionsContainer}>
          <Text style={styles.conditionsLabel}>Primary Conditions:</Text>
          <View style={styles.conditionsList}>
            {item.primaryConditions.slice(0, 2).map((condition, index) => (
              <View key={index} style={styles.conditionTag}>
                <Text style={styles.conditionText}>{condition}</Text>
              </View>
            ))}
            {item.primaryConditions.length > 2 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreText}>+{item.primaryConditions.length - 2}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {item.allergies.length > 0 && (
        <View style={styles.allergiesContainer}>
          <Text style={styles.allergiesLabel}>Allergies:</Text>
          <Text style={styles.allergiesText}>
            {item.allergies.slice(0, 3).join(', ')}
            {item.allergies.length > 3 && ` +${item.allergies.length - 3} more`}
          </Text>
        </View>
      )}

      <View style={styles.patientFooter}>
        <View style={styles.bloodGroupContainer}>
          {item.bloodGroup && (
            <>
              <Ionicons name="water" size={16} color="#F44336" />
              <Text style={styles.bloodGroupText}>{item.bloodGroup}</Text>
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Records</Text>
        <Text style={styles.subtitle}>Manage your patient database</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients by name, phone, or condition..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{patients.length}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {patients.reduce((sum, p) => sum + p.totalConsultations, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Consultations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {patients.filter(p => p.lastConsultation > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
          </Text>
          <Text style={styles.statLabel}>Active (30 days)</Text>
        </View>
      </View>

      {/* Patients List */}
      <FlatList
        data={filteredPatients}
        renderItem={renderPatientItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadPatientRecords} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Patients Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'No patients match your search criteria'
                : 'No patients have consulted with you yet'
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  patientDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  consultationBadge: {
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  consultationCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  consultationLabel: {
    fontSize: 10,
    color: '#1976D2',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  lastVisit: {
    fontSize: 12,
    color: '#666',
  },
  conditionsContainer: {
    marginTop: 12,
  },
  conditionsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  conditionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  conditionTag: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionText: {
    fontSize: 10,
    color: '#C62828',
  },
  moreTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreText: {
    fontSize: 10,
    color: '#666',
  },
  allergiesContainer: {
    marginTop: 8,
  },
  allergiesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  allergiesText: {
    fontSize: 12,
    color: '#333',
  },
  patientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  bloodGroupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodGroupText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 4,
    fontWeight: 'bold',
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

export default PatientRecords
