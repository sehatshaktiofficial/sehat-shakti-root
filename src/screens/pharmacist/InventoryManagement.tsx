// Inventory Management - Pharmacist inventory management interface
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

interface InventoryItem {
  id: string
  medicineId: string
  medicineName: string
  stockQuantity: number
  unitPrice: number
  expiryDate: Date
  batchNumber?: string
  manufacturer?: string
  otpVerified: boolean
  lastUpdated: number
  reliabilityScore: number
}

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'low_stock' | 'expiring' | 'expired'>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false)
  const [isAddModalVisible, setIsAddModalVisible] = useState(false)
  const [updateQuantity, setUpdateQuantity] = useState('')
  const [updatePrice, setUpdatePrice] = useState('')
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadInventory()
  }, [])

  useEffect(() => {
    filterInventory()
  }, [inventory, searchQuery, filterStatus])

  const loadInventory = async () => {
    try {
      setIsLoading(true)
      
      const inventoryData = await database.collections
        .get('pharmacy_inventory')
        .query(
          Q.sortBy('last_updated', Q.desc)
        )
        .fetch()

      const inventoryList = inventoryData.map(item => ({
        id: item.id,
        medicineId: (item as any).medicineId,
        medicineName: (item as any).medicineName,
        stockQuantity: (item as any).stockQuantity,
        unitPrice: (item as any).unitPrice,
        expiryDate: new Date((item as any).expiryDate),
        batchNumber: (item as any).batchNumber || '',
        manufacturer: (item as any).manufacturer || '',
        otpVerified: (item as any).otpVerified || false,
        lastUpdated: (item as any).lastUpdated || Date.now(),
        reliabilityScore: (item as any).reliabilityScore || 0.5,
      }))

      setInventory(inventoryList)
    } catch (error) {
      console.error('Error loading inventory:', error)
      Alert.alert('Error', 'Failed to load inventory')
    } finally {
      setIsLoading(false)
    }
  }

  const filterInventory = () => {
    let filtered = inventory

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    if (filterStatus === 'low_stock') {
      filtered = filtered.filter(item => item.stockQuantity < 10)
    } else if (filterStatus === 'expiring') {
      filtered = filtered.filter(item => 
        item.expiryDate <= thirtyDaysFromNow && item.expiryDate > now
      )
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(item => item.expiryDate <= now)
    }

    setFilteredInventory(filtered)
  }

  const updateStock = async (itemId: string) => {
    try {
      if (!updateQuantity || !updatePrice) {
        Alert.alert('Error', 'Please enter both quantity and price')
        return
      }

      const quantity = parseInt(updateQuantity)
      const price = parseFloat(updatePrice)

      if (isNaN(quantity) || isNaN(price) || quantity < 0 || price < 0) {
        Alert.alert('Error', 'Please enter valid quantity and price')
        return
      }

      const inventoryRecord = await database.collections
        .get('pharmacy_inventory')
        .find(itemId)

      await database.write(async () => {
        await inventoryRecord.update((record: any) => {
          record.stockQuantity = quantity
          record.unitPrice = price
          record.lastUpdated = Date.now()
          record.reliabilityScore = 1.0 // High reliability for manual updates
        })
      })

      // Update local state
      setInventory(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                stockQuantity: quantity, 
                unitPrice: price, 
                lastUpdated: Date.now(),
                reliabilityScore: 1.0
              }
            : item
        )
      )

      Alert.alert('Success', 'Inventory updated successfully')
      setIsUpdateModalVisible(false)
      setUpdateQuantity('')
      setUpdatePrice('')

    } catch (error) {
      console.error('Error updating inventory:', error)
      Alert.alert('Error', 'Failed to update inventory')
    }
  }

  const addNewItem = async () => {
    try {
      if (!selectedItem || !updateQuantity || !updatePrice) {
        Alert.alert('Error', 'Please fill in all required fields')
        return
      }

      const quantity = parseInt(updateQuantity)
      const price = parseFloat(updatePrice)

      if (isNaN(quantity) || isNaN(price) || quantity < 0 || price < 0) {
        Alert.alert('Error', 'Please enter valid quantity and price')
        return
      }

      // Create new inventory item
      await database.write(async () => {
        await database.collections.get('pharmacy_inventory').create((record: any) => {
          record.pharmacyId = currentUser?.id
          record.medicineId = selectedItem.medicineId
          record.medicineName = selectedItem.medicineName
          record.stockQuantity = quantity
          record.unitPrice = price
          record.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          record.batchNumber = `BATCH-${Date.now()}`
          record.manufacturer = 'Generic'
          record.otpVerified = false
          record.lastUpdated = Date.now()
          record.reliabilityScore = 0.8
        })
      })

      Alert.alert('Success', 'New inventory item added successfully')
      setIsAddModalVisible(false)
      setSelectedItem(null)
      setUpdateQuantity('')
      setUpdatePrice('')
      loadInventory()

    } catch (error) {
      console.error('Error adding inventory item:', error)
      Alert.alert('Error', 'Failed to add inventory item')
    }
  }

  const handleUpdatePress = (item: InventoryItem) => {
    setSelectedItem(item)
    setUpdateQuantity(item.stockQuantity.toString())
    setUpdatePrice(item.unitPrice.toString())
    setIsUpdateModalVisible(true)
  }

  const handleAddPress = () => {
    setSelectedItem({
      id: '',
      medicineId: '',
      medicineName: '',
      stockQuantity: 0,
      unitPrice: 0,
      expiryDate: new Date(),
      batchNumber: '',
      manufacturer: '',
      otpVerified: false,
      lastUpdated: Date.now(),
      reliabilityScore: 0.5,
    })
    setUpdateQuantity('')
    setUpdatePrice('')
    setIsAddModalVisible(true)
  }

  const getStatusColor = (item: InventoryItem) => {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    if (item.expiryDate <= now) return '#F44336' // Expired
    if (item.expiryDate <= thirtyDaysFromNow) return '#FF9800' // Expiring soon
    if (item.stockQuantity < 10) return '#FF5722' // Low stock
    return '#4CAF50' // Good
  }

  const getStatusText = (item: InventoryItem) => {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    if (item.expiryDate <= now) return 'EXPIRED'
    if (item.expiryDate <= thirtyDaysFromNow) return 'EXPIRING SOON'
    if (item.stockQuantity < 10) return 'LOW STOCK'
    return 'IN STOCK'
  }

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={styles.inventoryCard}
      onPress={() => handleUpdatePress(item)}
    >
      <View style={styles.inventoryHeader}>
        <View style={styles.inventoryInfo}>
          <Text style={styles.medicineName}>{item.medicineName}</Text>
          <Text style={styles.batchNumber}>
            Batch: {item.batchNumber || 'N/A'}
          </Text>
          <Text style={styles.manufacturer}>
            {item.manufacturer || 'Generic Manufacturer'}
          </Text>
        </View>
        <View style={styles.inventoryStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
            <Text style={styles.statusText}>{getStatusText(item)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </View>

      <View style={styles.inventoryDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Stock:</Text>
          <Text style={styles.detailValue}>{item.stockQuantity} units</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>₹{item.unitPrice}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expiry:</Text>
          <Text style={styles.detailValue}>
            {item.expiryDate.toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reliability:</Text>
          <Text style={styles.detailValue}>
            {Math.round(item.reliabilityScore * 100)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderUpdateModal = () => (
    <Modal
      visible={isUpdateModalVisible}
      animationType="slide"
      onRequestClose={() => setIsUpdateModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Update Inventory</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsUpdateModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Medicine</Text>
            <Text style={styles.detailText}>{selectedItem?.medicineName}</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Stock Quantity</Text>
            <TextInput
              style={styles.input}
              value={updateQuantity}
              onChangeText={setUpdateQuantity}
              placeholder="Enter quantity"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Unit Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={updatePrice}
              onChangeText={setUpdatePrice}
              placeholder="Enter price"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => updateStock(selectedItem?.id || '')}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.buttonText}>Update Inventory</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  const renderAddModal = () => (
    <Modal
      visible={isAddModalVisible}
      animationType="slide"
      onRequestClose={() => setIsAddModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add New Item</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsAddModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Medicine Name</Text>
            <TextInput
              style={styles.input}
              value={selectedItem?.medicineName || ''}
              onChangeText={(text) => setSelectedItem(prev => prev ? {...prev, medicineName: text} : null)}
              placeholder="Enter medicine name"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Stock Quantity</Text>
            <TextInput
              style={styles.input}
              value={updateQuantity}
              onChangeText={setUpdateQuantity}
              placeholder="Enter quantity"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Unit Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={updatePrice}
              onChangeText={setUpdatePrice}
              placeholder="Enter price"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={addNewItem}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.buttonText}>Add to Inventory</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPress}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {(['all', 'low_stock', 'expiring', 'expired'] as const).map((filter) => (
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
              {filter.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredInventory}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadInventory} />
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Update Modal */}
      {renderUpdateModal()}

      {/* Add Modal */}
      {renderAddModal()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  inventoryCard: {
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
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  inventoryInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  batchNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  manufacturer: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  inventoryStatus: {
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
  inventoryDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
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
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
})

export default InventoryManagement
