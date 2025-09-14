// Medicine Detail - Detailed medicine information for pharmacist
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

interface MedicineDetail {
  id: string
  genericName: string
  brandNames: string[]
  composition: string
  therapeuticClass: string
  indications: string
  contraindications: string
  sideEffects: string
  drugInteractions: string[]
  pediatricDose: string
  adultDose: string
  pregnancyCategory: string
  dosageForms: string[]
  storageConditions: string
  manufacturer: string
  lastUpdated: number
  reliabilityScore: number
}

const MedicineDetail: React.FC = () => {
  const [medicine, setMedicine] = useState<MedicineDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showInteractionsModal, setShowInteractionsModal] = useState(false)
  const [showSideEffectsModal, setShowSideEffectsModal] = useState(false)
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadMedicineDetails()
  }, [])

  const loadMedicineDetails = async () => {
    try {
      setIsLoading(true)
      
      // In a real app, this would get the medicine ID from navigation params
      // For now, we'll simulate loading a medicine
      const mockMedicine: MedicineDetail = {
        id: 'MED-001',
        genericName: 'Paracetamol',
        brandNames: ['Crocin', 'Calpol', 'Tylenol', 'Dolo'],
        composition: 'Paracetamol 500mg',
        therapeuticClass: 'Analgesic & Antipyretic',
        indications: 'Fever, mild to moderate pain, headache, toothache, menstrual cramps',
        contraindications: 'Severe liver disease, known hypersensitivity to paracetamol',
        sideEffects: 'Rare: skin rash, blood disorders, liver damage with overdose',
        drugInteractions: ['Warfarin', 'Isoniazid', 'Phenytoin', 'Carbamazepine'],
        pediatricDose: '10-15 mg/kg every 4-6 hours (max 5 doses/day)',
        adultDose: '500-1000 mg every 4-6 hours (max 4g/day)',
        pregnancyCategory: 'B',
        dosageForms: ['Tablet', 'Syrup', 'Suppository', 'Injection'],
        storageConditions: 'Store below 30°C, protect from moisture',
        manufacturer: 'Generic Pharmaceuticals',
        lastUpdated: Date.now(),
        reliabilityScore: 0.95
      }

      setMedicine(mockMedicine)
    } catch (error) {
      console.error('Error loading medicine details:', error)
      Alert.alert('Error', 'Failed to load medicine details')
    } finally {
      setIsLoading(false)
    }
  }

  const addToInventory = () => {
    Alert.alert(
      'Add to Inventory',
      'Add this medicine to your inventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: () => {
            Alert.alert('Success', 'Medicine added to inventory')
          }
        }
      ]
    )
  }

  const checkAvailability = () => {
    Alert.alert(
      'Check Availability',
      'Checking medicine availability in nearby pharmacies...',
      [{ text: 'OK' }]
    )
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const getReliabilityColor = (score: number) => {
    if (score >= 0.8) return '#4CAF50'
    if (score >= 0.6) return '#FF9800'
    return '#F44336'
  }

  const getReliabilityText = (score: number) => {
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="medical" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Loading medicine details...</Text>
      </View>
    )
  }

  if (!medicine) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Medicine not found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.medicineName}>{medicine.genericName}</Text>
          <View style={styles.reliabilityBadge}>
            <Ionicons 
              name="shield-checkmark" 
              size={16} 
              color={getReliabilityColor(medicine.reliabilityScore)} 
            />
            <Text style={[styles.reliabilityText, { color: getReliabilityColor(medicine.reliabilityScore) }]}>
              {getReliabilityText(medicine.reliabilityScore)} Reliability
            </Text>
          </View>
        </View>

        {/* Brand Names */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand Names</Text>
          <View style={styles.brandContainer}>
            {medicine.brandNames.map((brand, index) => (
              <View key={index} style={styles.brandTag}>
                <Text style={styles.brandText}>{brand}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Composition:</Text>
            <Text style={styles.infoValue}>{medicine.composition}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Therapeutic Class:</Text>
            <Text style={styles.infoValue}>{medicine.therapeuticClass}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manufacturer:</Text>
            <Text style={styles.infoValue}>{medicine.manufacturer}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>{formatDate(medicine.lastUpdated)}</Text>
          </View>
        </View>

        {/* Indications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indications</Text>
          <Text style={styles.descriptionText}>{medicine.indications}</Text>
        </View>

        {/* Dosage Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dosage Information</Text>
          <View style={styles.dosageCard}>
            <Text style={styles.dosageTitle}>Adult Dose</Text>
            <Text style={styles.dosageText}>{medicine.adultDose}</Text>
          </View>
          <View style={styles.dosageCard}>
            <Text style={styles.dosageTitle}>Pediatric Dose</Text>
            <Text style={styles.dosageText}>{medicine.pediatricDose}</Text>
          </View>
          <View style={styles.dosageCard}>
            <Text style={styles.dosageTitle}>Available Forms</Text>
            <Text style={styles.dosageText}>{medicine.dosageForms.join(', ')}</Text>
          </View>
        </View>

        {/* Contraindications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contraindications</Text>
          <Text style={styles.descriptionText}>{medicine.contraindications}</Text>
        </View>

        {/* Side Effects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Side Effects</Text>
            <TouchableOpacity onPress={() => setShowSideEffectsModal(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.descriptionText} numberOfLines={3}>
            {medicine.sideEffects}
          </Text>
        </View>

        {/* Drug Interactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Drug Interactions</Text>
            <TouchableOpacity onPress={() => setShowInteractionsModal(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.interactionsContainer}>
            {medicine.drugInteractions.slice(0, 3).map((interaction, index) => (
              <View key={index} style={styles.interactionTag}>
                <Text style={styles.interactionText}>{interaction}</Text>
              </View>
            ))}
            {medicine.drugInteractions.length > 3 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreText}>+{medicine.drugInteractions.length - 3} more</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pregnancy Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pregnancy Category</Text>
          <View style={styles.pregnancyCard}>
            <Ionicons name="heart" size={24} color="#FF9800" />
            <Text style={styles.pregnancyText}>Category {medicine.pregnancyCategory}</Text>
          </View>
        </View>

        {/* Storage Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Conditions</Text>
          <View style={styles.storageCard}>
            <Ionicons name="thermometer" size={20} color="#2196F3" />
            <Text style={styles.storageText}>{medicine.storageConditions}</Text>
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#FF9800" />
          <Text style={styles.warningText}>
            This information is for professional reference only. Always verify with current medical literature and guidelines before dispensing.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkAvailability}
        >
          <Ionicons name="search" size={20} color="white" />
          <Text style={styles.buttonText}>Check Availability</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={addToInventory}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.buttonText}>Add to Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Side Effects Modal */}
      <Modal
        visible={showSideEffectsModal}
        animationType="slide"
        onRequestClose={() => setShowSideEffectsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Side Effects</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSideEffectsModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalText}>{medicine.sideEffects}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Drug Interactions Modal */}
      <Modal
        visible={showInteractionsModal}
        animationType="slide"
        onRequestClose={() => setShowInteractionsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Drug Interactions</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInteractionsModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {medicine.drugInteractions.map((interaction, index) => (
              <View key={index} style={styles.interactionItem}>
                <Ionicons name="warning" size={20} color="#F44336" />
                <Text style={styles.interactionItemText}>{interaction}</Text>
              </View>
            ))}
          </ScrollView>
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
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  reliabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reliabilityText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  brandContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  brandText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
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
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  dosageCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dosageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dosageText: {
    fontSize: 14,
    color: '#666',
  },
  interactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interactionTag: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interactionText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
  },
  moreTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreText: {
    fontSize: 12,
    color: '#666',
  },
  pregnancyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
  },
  pregnancyText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
    marginLeft: 8,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  storageText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  checkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  interactionItemText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
})

export default MedicineDetail
