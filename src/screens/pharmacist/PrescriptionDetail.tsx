// Prescription Detail - Detailed view of prescription for pharmacist
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

interface PrescriptionDetail {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  patientGender: string
  doctorId: string
  doctorName: string
  doctorLicense: string
  medicines: Array<{
    id: string
    genericName: string
    brandName: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
    quantity: number
  }>
  diagnosis: string
  symptoms: string[]
  instructions: string
  followUpDate?: Date
  validUntil: Date
  digitalSignature: string
  isVerified: boolean
  verifiedBy?: string
  verifiedAt?: Date
  createdAt: Date
  qrCode: string
}

const PrescriptionDetail: React.FC = () => {
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadPrescriptionDetails()
  }, [])

  const loadPrescriptionDetails = async () => {
    try {
      setIsLoading(true)
      
      // In a real app, this would get the prescription ID from navigation params
      // For now, we'll simulate loading a prescription
      const mockPrescription: PrescriptionDetail = {
        id: 'PRES-12345678',
        patientId: 'PAT-001',
        patientName: 'Rajesh Kumar',
        patientAge: 45,
        patientGender: 'Male',
        doctorId: 'DOC-001',
        doctorName: 'Dr. Priya Sharma',
        doctorLicense: 'DL-12345',
        medicines: [
          {
            id: 'MED-001',
            genericName: 'Paracetamol',
            brandName: 'Crocin',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '5 days',
            instructions: 'Take after meals',
            quantity: 10
          },
          {
            id: 'MED-002',
            genericName: 'Amoxicillin',
            brandName: 'Amoxil',
            dosage: '250mg',
            frequency: 'Thrice daily',
            duration: '7 days',
            instructions: 'Take with plenty of water',
            quantity: 21
          }
        ],
        diagnosis: 'Upper Respiratory Tract Infection',
        symptoms: ['Fever', 'Cough', 'Sore throat', 'Body ache'],
        instructions: 'Take rest, drink plenty of fluids, avoid cold foods',
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        digitalSignature: 'SIGNATURE_HASH_12345',
        isVerified: false,
        createdAt: new Date(),
        qrCode: 'QR_CODE_DATA_12345'
      }

      setPrescription(mockPrescription)
    } catch (error) {
      console.error('Error loading prescription details:', error)
      Alert.alert('Error', 'Failed to load prescription details')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyPrescription = async () => {
    if (!prescription) return

    try {
      // Verify digital signature
      const isValidSignature = await verifyDigitalSignature(prescription)
      
      if (!isValidSignature) {
        Alert.alert('Verification Failed', 'Digital signature verification failed')
        return
      }

      // Check if prescription is still valid
      if (prescription.validUntil < new Date()) {
        Alert.alert('Prescription Expired', 'This prescription has expired')
        return
      }

      // Update prescription as verified
      const prescriptionRecord = await database.collections
        .get('prescriptions')
        .find(prescription.id)

      await database.write(async () => {
        await prescriptionRecord.update((record: any) => {
          record.isVerified = true
          record.verifiedBy = currentUser?.id
          record.verifiedAt = new Date()
        })
      })

      // Update local state
      setPrescription(prev => prev ? {
        ...prev,
        isVerified: true,
        verifiedBy: currentUser?.id,
        verifiedAt: new Date()
      } : null)

      Alert.alert('Prescription Verified', 'Prescription has been successfully verified')
      setShowVerificationModal(false)

    } catch (error) {
      console.error('Error verifying prescription:', error)
      Alert.alert('Error', 'Failed to verify prescription')
    }
  }

  const verifyDigitalSignature = async (prescription: PrescriptionDetail): Promise<boolean> => {
    try {
      // In a real implementation, this would verify the digital signature
      // For now, we'll simulate verification
      return true
    } catch (error) {
      console.error('Error verifying digital signature:', error)
      return false
    }
  }

  const dispenseMedicines = () => {
    Alert.alert(
      'Dispense Medicines',
      'Are you sure you want to dispense all medicines for this prescription?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Dispense', 
          onPress: () => {
            Alert.alert('Success', 'Medicines dispensed successfully')
          }
        }
      ]
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const getValidityStatus = () => {
    if (!prescription) return { status: 'Unknown', color: '#666' }
    
    const now = new Date()
    const validUntil = new Date(prescription.validUntil)
    
    if (validUntil < now) {
      return { status: 'Expired', color: '#F44336' }
    } else if (validUntil.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return { status: 'Expiring Soon', color: '#FF9800' }
    } else {
      return { status: 'Valid', color: '#4CAF50' }
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="document-text" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Loading prescription details...</Text>
      </View>
    )
  }

  if (!prescription) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Prescription not found</Text>
      </View>
    )
  }

  const validityStatus = getValidityStatus()

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.prescriptionId}>#{prescription.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: validityStatus.color }]}>
              <Text style={styles.statusText}>{validityStatus.status}</Text>
            </View>
          </View>
          <Text style={styles.prescriptionDate}>
            Prescribed on {formatDate(prescription.createdAt)}
          </Text>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{prescription.patientName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{prescription.patientAge} years</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender:</Text>
            <Text style={styles.infoValue}>{prescription.patientGender}</Text>
          </View>
        </View>

        {/* Doctor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>Dr. {prescription.doctorName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>License:</Text>
            <Text style={styles.infoValue}>{prescription.doctorLicense}</Text>
          </View>
        </View>

        {/* Diagnosis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
          
          <Text style={styles.symptomsTitle}>Symptoms:</Text>
          <View style={styles.symptomsContainer}>
            {prescription.symptoms.map((symptom, index) => (
              <View key={index} style={styles.symptomTag}>
                <Text style={styles.symptomText}>{symptom}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Medicines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prescribed Medicines ({prescription.medicines.length})</Text>
          {prescription.medicines.map((medicine, index) => (
            <View key={index} style={styles.medicineCard}>
              <View style={styles.medicineHeader}>
                <Text style={styles.medicineName}>{medicine.genericName}</Text>
                <Text style={styles.medicineBrand}>({medicine.brandName})</Text>
              </View>
              
              <View style={styles.medicineDetails}>
                <View style={styles.medicineRow}>
                  <Text style={styles.medicineLabel}>Dosage:</Text>
                  <Text style={styles.medicineValue}>{medicine.dosage}</Text>
                </View>
                <View style={styles.medicineRow}>
                  <Text style={styles.medicineLabel}>Frequency:</Text>
                  <Text style={styles.medicineValue}>{medicine.frequency}</Text>
                </View>
                <View style={styles.medicineRow}>
                  <Text style={styles.medicineLabel}>Duration:</Text>
                  <Text style={styles.medicineValue}>{medicine.duration}</Text>
                </View>
                <View style={styles.medicineRow}>
                  <Text style={styles.medicineLabel}>Quantity:</Text>
                  <Text style={styles.medicineValue}>{medicine.quantity} units</Text>
                </View>
                {medicine.instructions && (
                  <View style={styles.medicineRow}>
                    <Text style={styles.medicineLabel}>Instructions:</Text>
                    <Text style={styles.medicineValue}>{medicine.instructions}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Instructions</Text>
          <Text style={styles.instructionsText}>{prescription.instructions}</Text>
        </View>

        {/* Validity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prescription Validity</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valid Until:</Text>
            <Text style={styles.infoValue}>{formatDate(prescription.validUntil)}</Text>
          </View>
          {prescription.followUpDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Follow-up Date:</Text>
              <Text style={styles.infoValue}>{formatDate(prescription.followUpDate)}</Text>
            </View>
          )}
        </View>

        {/* Verification Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, { color: prescription.isVerified ? '#4CAF50' : '#FF9800' }]}>
              {prescription.isVerified ? 'Verified' : 'Pending Verification'}
            </Text>
          </View>
          {prescription.verifiedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verified At:</Text>
              <Text style={styles.infoValue}>{formatDate(prescription.verifiedAt)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setShowQRModal(true)}
        >
          <Ionicons name="qr-code" size={20} color="white" />
          <Text style={styles.buttonText}>View QR Code</Text>
        </TouchableOpacity>

        {!prescription.isVerified && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => setShowVerificationModal(true)}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        )}

        {prescription.isVerified && (
          <TouchableOpacity
            style={styles.dispenseButton}
            onPress={dispenseMedicines}
          >
            <Ionicons name="medical" size={20} color="white" />
            <Text style={styles.buttonText}>Dispense</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Prescription QR Code</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQRModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.qrContainer}>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code" size={120} color="#333" />
              <Text style={styles.qrText}>QR Code</Text>
              <Text style={styles.qrSubtext}>{prescription.id}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="slide"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verify Prescription</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowVerificationModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.verificationText}>
              Are you sure you want to verify this prescription? This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={verifyPrescription}
            >
              <Text style={styles.confirmButtonText}>Verify Prescription</Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prescriptionId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  prescriptionDate: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
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
  diagnosisText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  symptomsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  symptomText: {
    fontSize: 12,
    color: '#1976D2',
  },
  medicineCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineBrand: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  medicineDetails: {
    gap: 4,
  },
  medicineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medicineLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  medicineValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  qrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
  },
  verifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
  },
  dispenseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
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
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  qrPlaceholder: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  qrSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  verificationText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default PrescriptionDetail
