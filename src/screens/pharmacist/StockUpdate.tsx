// Stock Update - Update medicine stock levels
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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface StockItem {
  id: string
  medicineId: string
  medicineName: string
  currentStock: number
  unitPrice: number
  expiryDate: Date
  batchNumber: string
  manufacturer: string
  lastUpdated: number
}

interface StockUpdate {
  id: string
  medicineId: string
  medicineName: string
  previousStock: number
  newStock: number
  unitPrice: number
  batchNumber: string
  expiryDate: Date
  reason: string
  updatedBy: string
  updatedAt: number
}

const StockUpdate: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false)
  const [isAddModalVisible, setIsAddModalVisible] = useState(false)
  const [newStock, setNewStock] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadStockItems()
  }, [])

  useEffect(() => {
    filterItems()
  }, [stockItems, searchQuery])

  const loadStockItems = async () => {
    try {
      setIsLoading(true)
      
      const inventoryData = await database.collections
        .get('pharmacy_inventory')
        .query(
          Q.where('pharmacy_id', Q.eq(currentUser?.id || '')),
          Q.sortBy('last_updated', Q.desc)
        )
        .fetch()

      const items: StockItem[] = inventoryData.map(item => ({
        id: item.id,
        medicineId: (item as any).medicineId,
        medicineName: (item as any).medicineName,
        currentStock: (item as any).stockQuantity,
        unitPrice: (item as any).unitPrice,
        expiryDate: new Date((item as any).expiryDate),
        batchNumber: (item as any).batchNumber || '',
        manufacturer: (item as any).manufacturer || '',
        lastUpdated: (item as any).lastUpdated || Date.now(),
      }))

      setStockItems(items)
    } catch (error) {
      console.error('Error loading stock items:', error)
      Alert.alert('Error', 'Failed to load stock items')
    } finally {
      setIsLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = stockItems

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredItems(filtered)
  }

  const handleUpdatePress = (item: StockItem) => {
    setSelectedItem(item)
    setNewStock(item.currentStock.toString())
    setNewPrice(item.unitPrice.toString())
    setBatchNumber(item.batchNumber)
    setExpiryDate(item.expiryDate.toISOString().split('T')[0])
    setReason('')
    setIsUpdateModalVisible(true)
  }

  const handleAddPress = () => {
    setSelectedItem({
      id: '',
      medicineId: '',
      medicineName: '',
      currentStock: 0,
      unitPrice: 0,
      expiryDate: new Date(),
      batchNumber: '',
      manufacturer: '',
      lastUpdated: Date.now(),
    })
    setNewStock('')
    setNewPrice('')
    setBatchNumber('')
    setExpiryDate('')
    setReason('')
    setIsAddModalVisible(true)
  }

  const updateStock = async () => {
    try {
      if (!selectedItem || !newStock || !newPrice) {
        Alert.alert('Error', 'Please fill in all required fields')
        return
      }

      const stock = parseInt(newStock)
      const price = parseFloat(newPrice)

      if (isNaN(stock) || isNaN(price) || stock < 0 || price < 0) {
        Alert.alert('Error', 'Please enter valid stock and price values')
        return
      }

      if (selectedItem.id) {
        // Update existing item
        const inventoryRecord = await database.collections
          .get('pharmacy_inventory')
          .find(selectedItem.id)

        await database.write(async () => {
          await inventoryRecord.update((record: any) => {
            record.stockQuantity = stock
            record.unitPrice = price
            record.batchNumber = batchNumber
            record.expiryDate = new Date(expiryDate).getTime()
            record.lastUpdated = Date.now()
            record.reliabilityScore = 1.0
          })
        })

        // Log stock update
        await logStockUpdate({
          id: `UPDATE-${Date.now()}`,
          medicineId: selectedItem.medicineId,
          medicineName: selectedItem.medicineName,
          previousStock: selectedItem.currentStock,
          newStock: stock,
          unitPrice: price,
          batchNumber,
          expiryDate: new Date(expiryDate),
          reason: reason || 'Manual update',
          updatedBy: currentUser?.id || '',
          updatedAt: Date.now(),
        })

        Alert.alert('Success', 'Stock updated successfully')
      } else {
        // Add new item
        await database.write(async () => {
          await database.collections.get('pharmacy_inventory').create((record: any) => {
            record.pharmacyId = currentUser?.id
            record.medicineId = selectedItem.medicineId
            record.medicineName = selectedItem.medicineName
            record.stockQuantity = stock
            record.unitPrice = price
            record.batchNumber = batchNumber
            record.expiryDate = new Date(expiryDate).getTime()
            record.manufacturer = selectedItem.manufacturer
            record.otpVerified = false
            record.lastUpdated = Date.now()
            record.reliabilityScore = 0.8
          })
        })

        Alert.alert('Success', 'New stock item added successfully')
      }

      setIsUpdateModalVisible(false)
      setIsAddModalVisible(false)
      loadStockItems()

    } catch (error) {
      console.error('Error updating stock:', error)
      Alert.alert('Error', 'Failed to update stock')
    }
  }

  const logStockUpdate = async (update: StockUpdate) => {
    try {
      // In a real app, this would log to a stock_updates table
      console.log('Stock update logged:', update)
    } catch (error) {
      console.error('Error logging stock update:', error)
    }
  }

  const getStockStatus = (item: StockItem) => {
    if (item.currentStock === 0) return { status: 'Out of Stock', color: '#F44336' }
    if (item.currentStock < 10) return { status: 'Low Stock', color: '#FF9800' }
    if (item.currentStock < 50) return { status: 'Medium Stock', color: '#FFC107' }
    return { status: 'In Stock', color: '#4CAF50' }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const renderStockItem = ({ item }: { item: StockItem }) => {
    const stockStatus = getStockStatus(item)
    
    return (
      <TouchableOpacity
        style={styles.stockCard}
        onPress={() => handleUpdatePress(item)}
      >
        <View style={styles.stockHeader}>
          <Text style={styles.medicineName}>{item.medicineName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.statusText}>{stockStatus.status}</Text>
          </View>
        </View>
        
        <View style={styles.stockDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Stock:</Text>
            <Text style={styles.detailValue}>{item.currentStock} units</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Unit Price:</Text>
            <Text style={styles.detailValue}>₹{item.unitPrice}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Batch:</Text>
            <Text style={styles.detailValue}>{item.batchNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry:</Text>
            <Text style={styles.detailValue}>{formatDate(item.expiryDate)}</Text>
          </View>
        </View>
        
        <View style={styles.stockFooter}>
          <Text style={styles.lastUpdated}>
            Updated: {formatDate(new Date(item.lastUpdated))}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    )
  }

  const renderUpdateModal = () => (
    <Modal
      visible={isUpdateModalVisible}
      animationType="slide"
      onRequestClose={() => setIsUpdateModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Update Stock</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsUpdateModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineTitle}>{selectedItem?.medicineName}</Text>
            <Text style={styles.medicineSubtitle}>
              Current Stock: {selectedItem?.currentStock} units
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>New Stock Quantity *</Text>
            <TextInput
              style={styles.input}
              value={newStock}
              onChangeText={setNewStock}
              placeholder="Enter new stock quantity"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Unit Price (₹) *</Text>
            <TextInput
              style={styles.input}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="Enter unit price"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Batch Number</Text>
            <TextInput
              style={styles.input}
              value={batchNumber}
              onChangeText={setBatchNumber}
              placeholder="Enter batch number"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Reason for Update</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Enter reason for stock update"
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={updateStock}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.buttonText}>Update Stock</Text>
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
          <Text style={styles.modalTitle}>Add New Stock</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsAddModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Medicine Name *</Text>
            <TextInput
              style={styles.input}
              value={selectedItem?.medicineName || ''}
              onChangeText={(text) => setSelectedItem(prev => prev ? {...prev, medicineName: text} : null)}
              placeholder="Enter medicine name"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Stock Quantity *</Text>
            <TextInput
              style={styles.input}
              value={newStock}
              onChangeText={setNewStock}
              placeholder="Enter stock quantity"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Unit Price (₹) *</Text>
            <TextInput
              style={styles.input}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="Enter unit price"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Batch Number</Text>
            <TextInput
              style={styles.input}
              value={batchNumber}
              onChangeText={setBatchNumber}
              placeholder="Enter batch number"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Manufacturer</Text>
            <TextInput
              style={styles.input}
              value={selectedItem?.manufacturer || ''}
              onChangeText={(text) => setSelectedItem(prev => prev ? {...prev, manufacturer: text} : null)}
              placeholder="Enter manufacturer name"
            />
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={updateStock}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.buttonText}>Add Stock</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cube" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Loading stock items...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stock Update</Text>
        <Text style={styles.subtitle}>Manage your medicine inventory</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
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

      {/* Stock List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredItems.map((item) => (
          <View key={item.id}>
            {renderStockItem({ item })}
          </View>
        ))}
        
        {filteredItems.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Stock Items Found</Text>
            <Text style={styles.emptySubtitle}>
              Add new stock items to manage your inventory
            </Text>
          </View>
        )}
      </ScrollView>

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
  content: {
    flex: 1,
    padding: 16,
  },
  stockCard: {
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
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
  stockDetails: {
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
  stockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
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
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  medicineInfo: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  medicineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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

export default StockUpdate
