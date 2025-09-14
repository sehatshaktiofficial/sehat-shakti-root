// Patient Detail - Detailed patient information for doctors
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface PatientDetail {
  id: string
  name: string
  age: number
  gender: string
  phoneNumber: string
  email?: string
  address?: string
  bloodGroup?: string
  emergencyContact?: string
  allergies: string[]
  chronicConditions: string[]
  currentMedications: string[]
  lastConsultation: Date
  totalConsultations: number
  consultationHistory: Array<{
    id: string
    date: Date
    diagnosis: string
    symptoms: string[]
    prescriptionId?: string
  }>
  healthRecords: Array<{
    id: string
    type: string
    value: string
    unit: string
    date: Date
    notes?: string
  }>
}

const PatientDetail: React.FC = () => {
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'records'>('overview')
  const [showAddRecordModal, setShowAddRecordModal] = useState(false)
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadPatientDetails()
  }, [])

  const loadPatientDetails = async () => {
    try {
      setIsLoading(true)
      
      // In a real app, this would get the patient ID from navigation params
      // For now, we'll simulate loading a patient
      const mockPatient: PatientDetail = {
        id: 'PAT-001',
        name: 'Rajesh Kumar',
        age: 45,
        gender: 'Male',
        phoneNumber: '+91 98765 43210',
        email: 'rajesh.kumar@email.com',
        address: '123 Main Street, Delhi, India',
        bloodGroup: 'O+',
        emergencyContact: '+91 98765 43211',
        allergies: ['Penicillin', 'Shellfish', 'Dust'],
        chronicConditions: ['Hypertension', 'Diabetes Type 2'],
        currentMedications: ['Metformin 500mg', 'Amlodipine 5mg', 'Lisinopril 10mg'],
        lastConsultation: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        totalConsultations: 12,
        consultationHistory: [
          {
            id: 'CONS-001',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            diagnosis: 'Upper Respiratory Tract Infection',
            symptoms: ['Fever', 'Cough', 'Sore throat'],
            prescriptionId: 'PRES-001'
          },
          {
            id: 'CONS-002',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            diagnosis: 'Hypertension Check-up',
            symptoms: ['High blood pressure'],
            prescriptionId: 'PRES-002'
          }
        ],
        healthRecords: [
          {
            id: 'HR-001',
            type: 'Blood Pressure',
            value: '140/90',
            unit: 'mmHg',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            notes: 'Elevated, needs monitoring'
          },
          {
            id: 'HR-002',
            type: 'Blood Sugar',
            value: '120',
            unit: 'mg/dL',
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            notes: 'Fasting glucose'
          }
        ]
      }

      setPatient(mockPatient)
    } catch (error) {
      console.error('Error loading patient details:', error)
      Alert.alert('Error', 'Failed to load patient details')
    } finally {
      setIsLoading(false)
    }
  }

  const startConsultation = () => {
    Alert.alert(
      'Start Consultation',
      'Start a new consultation with this patient?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          onPress: () => {
            Alert.alert('Success', 'Consultation started')
          }
        }
      ]
    )
  }

  const addHealthRecord = () => {
    setShowAddRecordModal(true)
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

  const renderOverview = () => {
    if (!patient) return null

    return (
      <View style={styles.tabContent}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{patient.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{patient.age} years</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender:</Text>
            <Text style={styles.infoValue}>{patient.gender}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{patient.phoneNumber}</Text>
          </View>
          {patient.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{patient.email}</Text>
            </View>
          )}
          {patient.bloodGroup && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Blood Group:</Text>
              <Text style={styles.infoValue}>{patient.bloodGroup}</Text>
            </View>
          )}
        </View>

        {/* Allergies */}
        {patient.allergies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergies</Text>
            <View style={styles.tagsContainer}>
              {patient.allergies.map((allergy, index) => (
                <View key={index} style={styles.allergyTag}>
                  <Text style={styles.allergyText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Chronic Conditions */}
        {patient.chronicConditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chronic Conditions</Text>
            <View style={styles.tagsContainer}>
              {patient.chronicConditions.map((condition, index) => (
                <View key={index} style={styles.conditionTag}>
                  <Text style={styles.conditionText}>{condition}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Current Medications */}
        {patient.currentMedications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Medications</Text>
            {patient.currentMedications.map((medication, index) => (
              <View key={index} style={styles.medicationItem}>
                <Ionicons name="medical" size={16} color="#4CAF50" />
                <Text style={styles.medicationText}>{medication}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Emergency Contact */}
        {patient.emergencyContact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <View style={styles.emergencyContainer}>
              <Ionicons name="call" size={20} color="#F44336" />
              <Text style={styles.emergencyText}>{patient.emergencyContact}</Text>
            </View>
          </View>
        )}
      </View>
    )
  }

  const renderHistory = () => {
    if (!patient) return null

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Consultation History ({patient.consultationHistory.length})</Text>
        {patient.consultationHistory.map((consultation, index) => (
          <View key={index} style={styles.consultationCard}>
            <View style={styles.consultationHeader}>
              <Text style={styles.consultationDate}>{formatDate(consultation.date)}</Text>
              {consultation.prescriptionId && (
                <View style={styles.prescriptionBadge}>
                  <Ionicons name="document-text" size={12} color="white" />
                  <Text style={styles.prescriptionText}>Prescription</Text>
                </View>
              )}
            </View>
            <Text style={styles.diagnosis}>{consultation.diagnosis}</Text>
            <View style={styles.symptomsContainer}>
              {consultation.symptoms.map((symptom, idx) => (
                <View key={idx} style={styles.symptomTag}>
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    )
  }

  const renderRecords = () => {
    if (!patient) return null

    return (
      <View style={styles.tabContent}>
        <View style={styles.recordsHeader}>
          <Text style={styles.sectionTitle}>Health Records ({patient.healthRecords.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={addHealthRecord}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addButtonText}>Add Record</Text>
          </TouchableOpacity>
        </View>
        {patient.healthRecords.map((record, index) => (
          <View key={index} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordType}>{record.type}</Text>
              <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
            </View>
            <View style={styles.recordValue}>
              <Text style={styles.recordValueText}>{record.value}</Text>
              <Text style={styles.recordUnit}>{record.unit}</Text>
            </View>
            {record.notes && (
              <Text style={styles.recordNotes}>{record.notes}</Text>
            )}
          </View>
        ))}
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Loading patient details...</Text>
      </View>
    )
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Patient not found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.patientDetails}>
          {patient.age} years • {patient.gender} • {patient.totalConsultations} consultations
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['overview', 'history', 'records'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.tabActive
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.tabTextActive
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'history' && renderHistory()}
        {selectedTab === 'records' && renderRecords()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.consultationButton}
          onPress={startConsultation}
        >
          <Ionicons name="medical" size={20} color="white" />
          <Text style={styles.buttonText}>Start Consultation</Text>
        </TouchableOpacity>
      </View>

      {/* Add Record Modal */}
      <Modal
        visible={showAddRecordModal}
        animationType="slide"
        onRequestClose={() => setShowAddRecordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Health Record</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddRecordModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Add new health record functionality would be implemented here.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginTop: 16,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergyTag: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  allergyText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
  },
  conditionTag: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  conditionText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  medicationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  emergencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 8,
    fontWeight: '600',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  consultationDate: {
    fontSize: 12,
    color: '#666',
  },
  prescriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prescriptionText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 4,
  },
  diagnosis: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  symptomTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  symptomText: {
    fontSize: 10,
    color: '#1976D2',
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordDate: {
    fontSize: 12,
    color: '#666',
  },
  recordValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  recordValueText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  recordUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  recordNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  consultationButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
})

export default PatientDetail
