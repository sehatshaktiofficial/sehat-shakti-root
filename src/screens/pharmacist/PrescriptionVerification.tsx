// Prescription Verification - Pharmacist prescription verification interface
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
  Modal,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'
import * as Crypto from 'expo-crypto'

interface Prescription {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  doctorId: string
  doctorName: string
  medicines: any[]
  instructions: string
  validUntil: Date
  digitalSignature: string
  createdAt: Date
  dispensedAt?: Date
  isVerified: boolean
  verificationNotes?: string
}

const PrescriptionVerification: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'dispensed'>('all')
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [verificationNotes, setVerificationNotes] = useState('')
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadPrescriptions()
  }, [])

  useEffect(() => {
    filterPrescriptions()
  }, [prescriptions, searchQuery, filterStatus])

  const loadPrescriptions = async () => {
    try {
      setIsLoading(true)
      
      const prescriptionsData = await database.collections
        .get('prescriptions')
        .query(
          Q.sortBy('created_at', Q.desc)
        )
        .fetch()

      const prescriptionsWithDetails = await Promise.all(
        prescriptionsData.map(async (prescription) => {
          const patient = await database.collections
            .get('users')
            .find(prescription.patientId)
          const doctor = await database.collections
            .get('users')
            .find(prescription.doctorId)
          
          return {
            id: prescription.id,
            patientId: prescription.patientId,
            patientName: patient.name,
            patientPhone: patient.phoneNumber,
            doctorId: prescription.doctorId,
            doctorName: doctor.name,
            medicines: (prescription as any).medicines || [],
            instructions: (prescription as any).instructions,
            validUntil: prescription.validUntil,
            digitalSignature: (prescription as any).digitalSignature,
            createdAt: prescription.createdAt,
            dispensedAt: (prescription as any).dispensedAt ? new Date((prescription as any).dispensedAt) : undefined,
            isVerified: false, // Would be stored in database
            verificationNotes: '',
          }
        })
      )

      setPrescriptions(prescriptionsWithDetails)
    } catch (error) {
      console.error('Error loading prescriptions:', error)
      Alert.alert('Error', 'Failed to load prescriptions')
    } finally {
      setIsLoading(false)
    }
  }

  const filterPrescriptions = () => {
    let filtered = prescriptions

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(prescription =>
        prescription.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prescription.patientPhone.includes(searchQuery) ||
        prescription.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prescription.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus === 'pending') {
      filtered = filtered.filter(prescription => !prescription.dispensedAt && !prescription.isVerified)
    } else if (filterStatus === 'verified') {
      filtered = filtered.filter(prescription => prescription.isVerified && !prescription.dispensedAt)
    } else if (filterStatus === 'dispensed') {
      filtered = filtered.filter(prescription => prescription.dispensedAt)
    }

    setFilteredPrescriptions(filtered)
  }

  const verifyPrescription = async (prescriptionId: string) => {
    try {
      // Verify digital signature
      const prescription = prescriptions.find(p => p.id === prescriptionId)
      if (!prescription) return

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

      // Check medicine availability
      const availabilityCheck = await checkMedicineAvailability(prescription.medicines)
      if (!availabilityCheck.allAvailable) {
        Alert.alert(
          'Medicine Not Available',
          `The following medicines are not available: ${availabilityCheck.unavailableMedicines.join(', ')}`
        )
        return
      }

      // Update prescription as verified
      const prescriptionRecord = await database.collections
        .get('prescriptions')
        .find(prescriptionId)

      await database.write(async () => {
        await prescriptionRecord.update((record: any) => {
          record.isVerified = true
          record.verificationNotes = verificationNotes
          record.verifiedBy = currentUser?.id
          record.verifiedAt = new Date()
        })
      })

      // Update local state
      setPrescriptions(prev => 
        prev.map(p => 
          p.id === prescriptionId 
            ? { ...p, isVerified: true, verificationNotes }
            : p
        )
      )

      Alert.alert('Prescription Verified', 'Prescription has been successfully verified')
      setIsDetailModalVisible(false)
      setVerificationNotes('')

    } catch (error) {
      console.error('Error verifying prescription:', error)
      Alert.alert('Error', 'Failed to verify prescription')
    }
  }

  const dispensePrescription = async (prescriptionId: string) => {
    try {
      const prescription = prescriptions.find(p => p.id === prescriptionId)
      if (!prescription || !prescription.isVerified) {
        Alert.alert('Error', 'Prescription must be verified before dispensing')
        return
      }

      // Update prescription as dispensed
      const prescriptionRecord = await database.collections
        .get('prescriptions')
        .find(prescriptionId)

      await database.write(async () => {
        await prescriptionRecord.update((record: any) => {
          record.dispensedAt = new Date()
          record.dispensedBy = currentUser?.id
        })
      })

      // Update inventory
      await updateInventory(prescription.medicines)

      // Update local state
      setPrescriptions(prev => 
        prev.map(p => 
          p.id === prescriptionId 
            ? { ...p, dispensedAt: new Date() }
            : p
        )
      )

      Alert.alert('Prescription Dispensed', 'Medicines have been dispensed successfully')

    } catch (error) {
      console.error('Error dispensing prescription:', error)
      Alert.alert('Error', 'Failed to dispense prescription')
    }
  }

  const verifyDigitalSignature = async (prescription: Prescription): Promise<boolean> => {
    try {
      // In a real implementation, this would verify the digital signature
      // For now, we'll simulate verification
      return true
    } catch (error) {
      console.error('Error verifying digital signature:', error)
      return false
    }
  }

  const checkMedicineAvailability = async (medicines: any[]): Promise<{allAvailable: boolean, unavailableMedicines: string[]}> => {
    try {
      const unavailableMedicines: string[] = []
      
      for (const medicine of medicines) {
        const inventoryItem = await database.collections
          .get('pharmacy_inventory')
          .query(
            Q.where('medicine_name', Q.like(`%${medicine.genericName}%`))
          )
          .fetch()

        if (inventoryItem.length === 0 || (inventoryItem[0] as any).stockQuantity < medicine.quantity) {
          unavailableMedicines.push(medicine.genericName)
        }
      }

      return {
        allAvailable: unavailableMedicines.length === 0,
        unavailableMedicines
      }
    } catch (error) {
      console.error('Error checking medicine availability:', error)
      return { allAvailable: false, unavailableMedicines: ['Error checking availability'] }
    }
  }

  const updateInventory = async (medicines: any[]) => {
    try {
      for (const medicine of medicines) {
        const inventoryItem = await database.collections
          .get('pharmacy_inventory')
          .query(
            Q.where('medicine_name', Q.like(`%${medicine.genericName}%`))
          )
          .fetch()

        if (inventoryItem.length > 0) {
          await database.write(async () => {
            await inventoryItem[0].update((record: any) => {
              record.stockQuantity = Math.max(0, record.stockQuantity - medicine.quantity)
              record.lastUpdated = Date.now()
            })
          })
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error)
    }
  }

  const handlePrescriptionPress = (prescription: Prescription) => {
    setSelectedPrescription(prescription)
    setIsDetailModalVisible(true)
  }

  const getStatusColor = (prescription: Prescription) => {
    if (prescription.dispensedAt) return '#4CAF50'
    if (prescription.isVerified) return '#2196F3'
    return '#FF9800'
  }

  const getStatusText = (prescription: Prescription) => {
    if (prescription.dispensedAt) return 'DISPENSED'
    if (prescription.isVerified) return 'VERIFIED'
    return 'PENDING'
  }

  const renderPrescriptionItem = ({ item }: { item: Prescription }) => (
    <TouchableOpacity
      style={styles.prescriptionCard}
      onPress={() => handlePrescriptionPress(item)}
    >
      <View style={styles.prescriptionHeader}>
        <View style={styles.prescriptionInfo}>
          <Text style={styles.prescriptionId}>#{item.id.substring(0, 8)}...</Text>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.doctorName}>Dr. {item.doctorName}</Text>
          <Text style={styles.prescriptionDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.prescriptionStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
            <Text style={styles.statusText}>{getStatusText(item)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </View>

      <View style={styles.medicinesPreview}>
        <Text style={styles.medicinesLabel}>
          {item.medicines.length} medicine{item.medicines.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.medicinesList}>
          {item.medicines.slice(0, 2).map(med => med.genericName).join(', ')}
          {item.medicines.length > 2 && ` +${item.medicines.length - 2} more`}
        </Text>
      </View>

      <View style={styles.prescriptionActions}>
        {!item.isVerified && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => verifyPrescription(item.id)}
          >
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        )}
        
        {item.isVerified && !item.dispensedAt && (
          <TouchableOpacity
            style={styles.dispenseButton}
            onPress={() => dispensePrescription(item.id)}
          >
            <Ionicons name="medical" size={16} color="white" />
            <Text style={styles.buttonText}>Dispense</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderPrescriptionDetail = () => {
    if (!selectedPrescription) return null

    return (
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Prescription Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsDetailModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Prescription ID</Text>
              <Text style={styles.detailText}>{selectedPrescription.id}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Patient Information</Text>
              <Text style={styles.detailText}>
                Name: {selectedPrescription.patientName}
                {'\n'}Phone: {selectedPrescription.patientPhone}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Doctor Information</Text>
              <Text style={styles.detailText}>
                Dr. {selectedPrescription.doctorName}
                {'\n'}Prescribed on: {new Date(selectedPrescription.createdAt).toLocaleString()}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Medicines</Text>
              {selectedPrescription.medicines.map((medicine, index) => (
                <View key={index} style={styles.medicineItem}>
                  <Text style={styles.medicineName}>{medicine.genericName}</Text>
                  <Text style={styles.medicineDetails}>
                    Dosage: {medicine.dosage} | Frequency: {medicine.frequency}
                    {'\n'}Duration: {medicine.duration} | Quantity: {medicine.quantity}
                  </Text>
                  {medicine.instructions && (
                    <Text style={styles.medicineInstructions}>
                      Instructions: {medicine.instructions}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>General Instructions</Text>
              <Text style={styles.detailText}>{selectedPrescription.instructions}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Validity</Text>
              <Text style={styles.detailText}>
                Valid until: {new Date(selectedPrescription.validUntil).toLocaleDateString()}
                {'\n'}Status: {getStatusText(selectedPrescription)}
              </Text>
            </View>

            {!selectedPrescription.isVerified && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Verification Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add verification notes..."
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={styles.actionButtons}>
              {!selectedPrescription.isVerified && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={() => verifyPrescription(selectedPrescription.id)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Verify Prescription</Text>
                </TouchableOpacity>
              )}
              
              {selectedPrescription.isVerified && !selectedPrescription.dispensedAt && (
                <TouchableOpacity
                  style={styles.dispenseButton}
                  onPress={() => dispensePrescription(selectedPrescription.id)}
                >
                  <Ionicons name="medical" size={20} color="white" />
                  <Text style={styles.buttonText}>Dispense Medicines</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search prescriptions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'verified', 'dispensed'] as const).map((filter) => (
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

      {/* Prescription List */}
      <FlatList
        data={filteredPrescriptions}
        renderItem={renderPrescriptionItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadPrescriptions} />
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Prescription Detail Modal */}
      {renderPrescriptionDetail()}
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
    backgroundColor: '#FF9800',
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
  prescriptionCard: {
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
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  doctorName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  prescriptionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  prescriptionStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  medicinesPreview: {
    marginBottom: 12,
  },
  medicinesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  medicinesList: {
    fontSize: 14,
    color: '#333',
  },
  prescriptionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  dispenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
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
  },
  detailSection: {
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  medicineItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  medicineInstructions: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actionButtons: {
    marginTop: 20,
  },
})

export default PrescriptionVerification
