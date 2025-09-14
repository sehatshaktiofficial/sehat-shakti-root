// Prescription Writer - Digital prescription creation for doctors
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'
import * as Crypto from 'expo-crypto'

interface Medicine {
  id: string
  genericName: string
  brandNames: string[]
  composition: string
  therapeuticClass: string
  indications: string
  adultDose: string
  pediatricDose: string
  contraindications: string
  sideEffects: string
  drugInteractions: string[]
}

interface PrescriptionMedicine {
  id: string
  genericName: string
  brandName?: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  quantity: number
}

const PrescriptionWriter: React.FC = () => {
  const [patientId, setPatientId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([])
  const [generalInstructions, setGeneralInstructions] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [isMedicineModalVisible, setIsMedicineModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 7)
    setValidUntil(tomorrow.toISOString().split('T')[0])
  }, [])

  const searchMedicines = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const results = await database.collections
        .get('medicines')
        .query(
          Q.where('generic_name', Q.like(`%${query}%`))
        )
        .fetch()

      setSearchResults(results as Medicine[])
    } catch (error) {
      console.error('Error searching medicines:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const addMedicine = (medicine: Medicine) => {
    const newMedicine: PrescriptionMedicine = {
      id: Date.now().toString(),
      genericName: medicine.genericName,
      brandName: medicine.brandNames[0],
      dosage: medicine.adultDose || 'As prescribed',
      frequency: 'TID',
      duration: '7 days',
      instructions: 'Take after meals',
      quantity: 1,
    }

    setMedicines([...medicines, newMedicine])
    setIsMedicineModalVisible(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const removeMedicine = (medicineId: string) => {
    setMedicines(medicines.filter(med => med.id !== medicineId))
  }

  const updateMedicine = (medicineId: string, field: keyof PrescriptionMedicine, value: any) => {
    setMedicines(medicines.map(med => 
      med.id === medicineId ? { ...med, [field]: value } : med
    ))
  }

  const generatePrescription = async () => {
    if (!patientId || medicines.length === 0) {
      Alert.alert('Error', 'Please select a patient and add at least one medicine')
      return
    }

    try {
      // Generate prescription ID
      const prescriptionId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${patientId}-${Date.now()}`,
        { encoding: Crypto.CryptoEncoding.HEX }
      )

      // Generate digital signature
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${prescriptionId}-${currentUser?.id}-${Date.now()}`,
        { encoding: Crypto.CryptoEncoding.HEX }
      )

      // Create prescription record
      const prescription = await database.write(async () => {
        return await database.collections.get('prescriptions').create((record: any) => {
          record.id = prescriptionId
          record.patientId = patientId
          record.doctorId = currentUser?.id
          record.medicines = medicines
          record.instructions = generalInstructions
          record.validUntil = new Date(validUntil)
          record.digitalSignature = signature
          record.needsSync = true
          record.createdOffline = true
        })
      })

      // Create health record
      await database.write(async () => {
        await database.collections.get('health_records').create((record: any) => {
          record.patientId = patientId
          record.recordType = 'prescription'
          record.title = 'Digital Prescription'
          record.content = {
            prescriptionId,
            medicines,
            instructions: generalInstructions,
            validUntil,
            doctorName: currentUser?.name,
            createdAt: new Date(),
          }
          record.doctorId = currentUser?.id
          record.isCritical = false
        })
      })

      Alert.alert(
        'Prescription Generated',
        `Prescription ID: ${prescriptionId.substring(0, 8)}...`,
        [
          { text: 'OK', onPress: () => resetForm() },
          { text: 'View QR', onPress: () => generateQRCode(prescriptionId) }
        ]
      )

    } catch (error) {
      console.error('Error generating prescription:', error)
      Alert.alert('Error', 'Failed to generate prescription')
    }
  }

  const generateQRCode = (prescriptionId: string) => {
    // Navigate to QR code view
    Alert.alert('QR Code', `QR Code for prescription: ${prescriptionId}`)
  }

  const resetForm = () => {
    setPatientId('')
    setPatientName('')
    setPatientPhone('')
    setMedicines([])
    setGeneralInstructions('')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 7)
    setValidUntil(tomorrow.toISOString().split('T')[0])
  }

  const renderMedicineItem = ({ item }: { item: PrescriptionMedicine }) => (
    <View style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        <Text style={styles.medicineName}>{item.genericName}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeMedicine(item.id)}
        >
          <Ionicons name="close" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
      
      {item.brandName && (
        <Text style={styles.brandName}>{item.brandName}</Text>
      )}

      <View style={styles.medicineDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dosage:</Text>
          <TextInput
            style={styles.detailInput}
            value={item.dosage}
            onChangeText={(text) => updateMedicine(item.id, 'dosage', text)}
            placeholder="e.g., 500mg"
          />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Frequency:</Text>
          <TextInput
            style={styles.detailInput}
            value={item.frequency}
            onChangeText={(text) => updateMedicine(item.id, 'frequency', text)}
            placeholder="e.g., TID"
          />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <TextInput
            style={styles.detailInput}
            value={item.duration}
            onChangeText={(text) => updateMedicine(item.id, 'duration', text)}
            placeholder="e.g., 7 days"
          />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <TextInput
            style={styles.detailInput}
            value={item.quantity.toString()}
            onChangeText={(text) => updateMedicine(item.id, 'quantity', parseInt(text) || 1)}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>

        <View style={styles.instructionsRow}>
          <Text style={styles.detailLabel}>Instructions:</Text>
          <TextInput
            style={styles.instructionsInput}
            value={item.instructions}
            onChangeText={(text) => updateMedicine(item.id, 'instructions', text)}
            placeholder="e.g., Take after meals"
            multiline
          />
        </View>
      </View>
    </View>
  )

  const renderSearchResult = ({ item }: { item: Medicine }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => addMedicine(item)}
    >
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultName}>{item.genericName}</Text>
        <Text style={styles.searchResultClass}>{item.therapeuticClass}</Text>
        <Text style={styles.searchResultIndication}>{item.indications}</Text>
      </View>
      <Ionicons name="add" size={24} color="#4CAF50" />
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Patient ID or Phone"
              value={patientId}
              onChangeText={setPatientId}
            />
            <TouchableOpacity style={styles.searchButton}>
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Patient Name"
            value={patientName}
            onChangeText={setPatientName}
          />
          <TextInput
            style={styles.input}
            placeholder="Patient Phone"
            value={patientPhone}
            onChangeText={setPatientPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Medicines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medicines</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsMedicineModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>

          {medicines.length > 0 ? (
            <FlatList
              data={medicines}
              renderItem={renderMedicineItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No medicines added</Text>
            </View>
          )}
        </View>

        {/* General Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Instructions</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter general instructions for the patient..."
            value={generalInstructions}
            onChangeText={setGeneralInstructions}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Validity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prescription Validity</Text>
          <TextInput
            style={styles.input}
            placeholder="Valid Until"
            value={validUntil}
            onChangeText={setValidUntil}
          />
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generatePrescription}
        >
          <Ionicons name="document-text" size={24} color="white" />
          <Text style={styles.generateButtonText}>Generate Prescription</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Medicine Search Modal */}
      <Modal
        visible={isMedicineModalVisible}
        animationType="slide"
        onRequestClose={() => setIsMedicineModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Medicine</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsMedicineModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicine by name..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text)
                searchMedicines(text)
              }}
            />
          </View>

          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.searchResults}
          />
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
  scrollView: {
    flex: 1,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
  },
  medicineCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  brandName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  medicineDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 80,
  },
  detailInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    marginLeft: 8,
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    marginLeft: 8,
    minHeight: 40,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  generateButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
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
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
    padding: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  searchResultClass: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchResultIndication: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
})

export default PrescriptionWriter
