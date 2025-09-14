// Medicine Search - Pharmacist medicine search and information
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useIsOnline } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface Medicine {
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
  lastUpdated: number
}

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
  lastUpdated: number
}

const MedicineSearch: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineDetail | null>(null)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  const isOnline = useIsOnline()

  useEffect(() => {
    loadMedicines()
  }, [])

  useEffect(() => {
    filterMedicines()
  }, [medicines, searchQuery, selectedCategory])

  useEffect(() => {
    if (searchQuery.length > 2) {
      generateSuggestions()
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchQuery])

  const loadMedicines = async () => {
    try {
      setIsLoading(true)
      
      const medicinesData = await database.collections
        .get('medicines')
        .query()
        .fetch()

      const medicinesList = medicinesData.map(medicine => ({
        id: medicine.id,
        genericName: (medicine as any).genericName,
        brandNames: (medicine as any).brandNames || [],
        composition: (medicine as any).composition,
        therapeuticClass: (medicine as any).therapeuticClass,
        indications: (medicine as any).indications,
        contraindications: (medicine as any).contraindications,
        sideEffects: (medicine as any).sideEffects,
        drugInteractions: (medicine as any).drugInteractions || [],
        pediatricDose: (medicine as any).pediatricDose || '',
        adultDose: (medicine as any).adultDose || '',
        pregnancyCategory: (medicine as any).pregnancyCategory || '',
        lastUpdated: (medicine as any).lastUpdated || Date.now(),
      }))

      setMedicines(medicinesList)
      console.log(`Loaded ${medicinesList.length} medicines from offline database`)
    } catch (error) {
      console.error('Error loading medicines:', error)
      Alert.alert('Error', 'Failed to load medicines')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSuggestions = () => {
    const query = searchQuery.toLowerCase()
    const medicineNames = medicines.map(med => med.genericName.toLowerCase())
    const brandNames = medicines.flatMap(med => med.brandNames.map(brand => brand.toLowerCase()))
    
    const allNames = [...medicineNames, ...brandNames]
    const filtered = allNames
      .filter(name => name.includes(query))
      .slice(0, 5)
      .map(name => name.charAt(0).toUpperCase() + name.slice(1))
    
    setSuggestions(filtered)
    setShowSuggestions(true)
  }

  const filterMedicines = () => {
    let filtered = medicines

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(medicine =>
        medicine.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.brandNames.some(brand => 
          brand.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        medicine.therapeuticClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.indications.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.composition.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(medicine =>
        medicine.therapeuticClass.toLowerCase().includes(selectedCategory.toLowerCase())
      )
    }

    // Sort by relevance and name
    filtered.sort((a, b) => {
      if (searchQuery) {
        const aRelevance = a.genericName.toLowerCase().startsWith(searchQuery.toLowerCase()) ? 1 : 0
        const bRelevance = b.genericName.toLowerCase().startsWith(searchQuery.toLowerCase()) ? 1 : 0
        if (aRelevance !== bRelevance) return bRelevance - aRelevance
      }
      return a.genericName.localeCompare(b.genericName)
    })

    setFilteredMedicines(filtered)
  }

  const handleMedicinePress = async (medicine: Medicine) => {
    try {
      // Load detailed medicine information
      const detailedMedicine: MedicineDetail = {
        ...medicine,
        dosageForms: ['Tablet', 'Capsule', 'Syrup', 'Injection'], // Would come from database
      }
      
      setSelectedMedicine(detailedMedicine)
      setIsDetailModalVisible(true)
    } catch (error) {
      console.error('Error loading medicine details:', error)
      Alert.alert('Error', 'Failed to load medicine details')
    }
  }

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
  }

  const handleSearchSubmit = () => {
    setShowSuggestions(false)
  }

  const renderMedicineItem = ({ item }: { item: Medicine }) => (
    <TouchableOpacity
      style={styles.medicineCard}
      onPress={() => handleMedicinePress(item)}
    >
      <View style={styles.medicineHeader}>
        <Text style={styles.medicineName}>{item.genericName}</Text>
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#4CAF50" />
        </View>
      </View>
      
      {item.brandNames.length > 0 && (
        <Text style={styles.brandNames}>
          Brands: {item.brandNames.slice(0, 3).join(', ')}
          {item.brandNames.length > 3 && ` +${item.brandNames.length - 3} more`}
        </Text>
      )}
      
      <Text style={styles.therapeuticClass}>{item.therapeuticClass}</Text>
      <Text style={styles.indications} numberOfLines={2}>
        {item.indications}
      </Text>
      
      <View style={styles.medicineFooter}>
        <Text style={styles.dosage}>{item.adultDose}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  )

  const renderSuggestionItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Ionicons name="search" size={16} color="#666" />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="medical-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Medicines Found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search terms or category filter
      </Text>
    </View>
  )

  const renderMedicineDetail = () => {
    if (!selectedMedicine) return null

    return (
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedMedicine.genericName}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsDetailModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Brand Names</Text>
              <Text style={styles.detailText}>
                {selectedMedicine.brandNames.join(', ')}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Composition</Text>
              <Text style={styles.detailText}>{selectedMedicine.composition}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Therapeutic Class</Text>
              <Text style={styles.detailText}>{selectedMedicine.therapeuticClass}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Indications</Text>
              <Text style={styles.detailText}>{selectedMedicine.indications}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Dosage</Text>
              <Text style={styles.detailText}>
                Adult: {selectedMedicine.adultDose}
                {selectedMedicine.pediatricDose && `\nPediatric: ${selectedMedicine.pediatricDose}`}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Side Effects</Text>
              <Text style={styles.detailText}>{selectedMedicine.sideEffects}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Contraindications</Text>
              <Text style={styles.detailText}>{selectedMedicine.contraindications}</Text>
            </View>

            {selectedMedicine.drugInteractions.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Drug Interactions</Text>
                <Text style={styles.detailText}>
                  {selectedMedicine.drugInteractions.join(', ')}
                </Text>
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Pregnancy Category</Text>
              <Text style={styles.detailText}>{selectedMedicine.pregnancyCategory}</Text>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                This information is for professional reference only. Always verify with current medical literature and guidelines.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  const categories = [
    'all',
    'analgesic',
    'antibiotic',
    'antihypertensive',
    'antidiabetic',
    'anti-inflammatory',
    'antacid',
    'vitamin',
    'cough',
    'fever',
    'cardiac',
    'respiratory',
    'gastrointestinal',
    'neurological',
    'dermatological'
  ]

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines by name, brand, or condition..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            onFocus={() => setShowSuggestions(searchQuery.length > 2)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item}
              style={styles.suggestionsList}
            />
          </View>
        )}
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === item && styles.categoryButtonTextActive
              ]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Ionicons name="medical" size={16} color="#4CAF50" />
          <Text style={styles.statusText}>
            {filteredMedicines.length} of {medicines.length} medicines
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name={isOnline ? 'cloud' : 'cloud-offline'} size={16} color={isOnline ? '#2196F3' : '#FF9800'} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline Mode'}
          </Text>
        </View>
      </View>

      {/* Medicine List */}
      <FlatList
        data={filteredMedicines}
        renderItem={renderMedicineItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadMedicines} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Medicine Detail Modal */}
      {renderMedicineDetail()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 72,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  categoryContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryButtonActive: {
    backgroundColor: '#FF9800',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  medicineCard: {
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
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  offlineIndicator: {
    marginLeft: 8,
  },
  brandNames: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  therapeuticClass: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 8,
  },
  indications: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  medicineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dosage: {
    fontSize: 12,
    color: '#666',
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
    flex: 1,
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
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
})

export default MedicineSearch
