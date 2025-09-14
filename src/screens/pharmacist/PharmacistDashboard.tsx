// Pharmacist Dashboard - Main interface for pharmacists
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser, useIsOnline } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface DashboardStats {
  totalPrescriptions: number
  pendingPrescriptions: number
  completedPrescriptions: number
  lowStockItems: number
  totalRevenue: number
  todaySales: number
}

const PharmacistDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPrescriptions: 0,
    pendingPrescriptions: 0,
    completedPrescriptions: 0,
    lowStockItems: 0,
    totalRevenue: 0,
    todaySales: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([])
  const [lowStockMedicines, setLowStockMedicines] = useState<any[]>([])
  
  const currentUser = useCurrentUser()
  const isOnline = useIsOnline()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load prescription statistics
      const totalPrescriptions = await database.collections
        .get('prescriptions')
        .query()
        .fetchCount()

      const pendingPrescriptions = await database.collections
        .get('prescriptions')
        .query(
          Q.where('dispensed_at', Q.oneOf([null, undefined]))
        )
        .fetchCount()

      const completedPrescriptions = await database.collections
        .get('prescriptions')
        .query(
          Q.where('dispensed_at', Q.notEq(null))
        )
        .fetchCount()

      // Load inventory statistics
      const inventoryItems = await database.collections
        .get('pharmacy_inventory')
        .query()
        .fetch()

      const lowStockItems = inventoryItems.filter(item => 
        (item as any).stockQuantity < 10
      ).length

      // Load recent prescriptions
      const recentPrescriptionsData = await database.collections
        .get('prescriptions')
        .query(
          Q.sortBy('created_at', Q.desc),
          Q.take(5)
        )
        .fetch()

      const prescriptionsWithDetails = await Promise.all(
        recentPrescriptionsData.map(async (prescription) => {
          const patient = await database.collections
            .get('users')
            .find(prescription.patientId)
          const doctor = await database.collections
            .get('users')
            .find(prescription.doctorId)
          
          return {
            ...prescription,
            patientName: patient.name,
            doctorName: doctor.name,
            isDispensed: !!prescription.dispensedAt,
          }
        })
      )

      // Load low stock medicines
      const lowStockData = inventoryItems
        .filter(item => (item as any).stockQuantity < 10)
        .slice(0, 5)
        .map(item => ({
          id: item.id,
          name: (item as any).medicineName,
          stock: (item as any).stockQuantity,
          expiry: (item as any).expiryDate,
        }))

      setStats({
        totalPrescriptions,
        pendingPrescriptions,
        completedPrescriptions,
        lowStockItems,
        totalRevenue: 0, // Would calculate from sales data
        todaySales: 0, // Would calculate from today's sales
      })
      
      setRecentPrescriptions(prescriptionsWithDetails)
      setLowStockMedicines(lowStockData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Error', 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyPrescription = (prescriptionId: string) => {
    // Navigate to prescription verification
    Alert.alert('Verify Prescription', `Verifying prescription: ${prescriptionId}`)
  }

  const handleUpdateStock = (medicineId: string) => {
    // Navigate to stock update
    Alert.alert('Update Stock', `Updating stock for medicine: ${medicineId}`)
  }

  const handleScanQR = () => {
    // Navigate to QR scanner
    Alert.alert('QR Scanner', 'Opening QR code scanner...')
  }

  const renderStatCard = (title: string, value: number, icon: string, color: string, subtitle?: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <Ionicons name={icon as any} size={24} color={color} />
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  )

  const renderPrescriptionItem = (prescription: any) => (
    <TouchableOpacity
      key={prescription.id}
      style={styles.prescriptionCard}
      onPress={() => handleVerifyPrescription(prescription.id)}
    >
      <View style={styles.prescriptionInfo}>
        <Text style={styles.prescriptionId}>
          #{prescription.id.substring(0, 8)}...
        </Text>
        <Text style={styles.patientName}>{prescription.patientName}</Text>
        <Text style={styles.doctorName}>Dr. {prescription.doctorName}</Text>
        <Text style={styles.prescriptionDate}>
          {new Date(prescription.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.prescriptionStatus}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: prescription.isDispensed ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {prescription.isDispensed ? 'DISPENSED' : 'PENDING'}
          </Text>
        </View>
        <Ionicons
          name={prescription.isDispensed ? 'checkmark-circle' : 'time'}
          size={20}
          color={prescription.isDispensed ? '#4CAF50' : '#FF9800'}
        />
      </View>
    </TouchableOpacity>
  )

  const renderLowStockItem = (medicine: any) => (
    <TouchableOpacity
      key={medicine.id}
      style={styles.lowStockCard}
      onPress={() => handleUpdateStock(medicine.id)}
    >
      <View style={styles.medicineInfo}>
        <Text style={styles.medicineName}>{medicine.name}</Text>
        <Text style={styles.stockText}>Stock: {medicine.stock} units</Text>
        <Text style={styles.expiryText}>
          Expires: {new Date(medicine.expiry).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.stockActions}>
        <Ionicons name="warning" size={20} color="#FF5722" />
        <Text style={styles.lowStockText}>LOW</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadDashboardData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {currentUser?.name}
        </Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#FF9800' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline Mode'}
          </Text>
        </View>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        {renderStatCard('Total Prescriptions', stats.totalPrescriptions, 'document-text', '#2196F3')}
        {renderStatCard('Pending', stats.pendingPrescriptions, 'time', '#FF9800')}
        {renderStatCard('Completed', stats.completedPrescriptions, 'checkmark-circle', '#4CAF50')}
        {renderStatCard('Low Stock', stats.lowStockItems, 'warning', '#F44336')}
        {renderStatCard('Today\'s Sales', stats.todaySales, 'trending-up', '#4CAF50', '₹0')}
        {renderStatCard('Total Revenue', stats.totalRevenue, 'cash', '#4CAF50', '₹0')}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleScanQR}>
            <Ionicons name="qr-code" size={24} color="#2196F3" />
            <Text style={styles.quickActionText}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="search" size={24} color="#4CAF50" />
            <Text style={styles.quickActionText}>Search Medicine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="add-circle" size={24} color="#FF9800" />
            <Text style={styles.quickActionText}>Add Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="bar-chart" size={24} color="#9C27B0" />
            <Text style={styles.quickActionText}>Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Prescriptions */}
      <View style={styles.recentPrescriptions}>
        <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
        {recentPrescriptions.length > 0 ? (
          recentPrescriptions.map(renderPrescriptionItem)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No recent prescriptions</Text>
          </View>
        )}
      </View>

      {/* Low Stock Alert */}
      {lowStockMedicines.length > 0 && (
        <View style={styles.lowStockSection}>
          <Text style={styles.sectionTitle}>Low Stock Alert</Text>
          {lowStockMedicines.map(renderLowStockItem)}
        </View>
      )}

      {/* Emergency Contact */}
      <View style={styles.emergencySection}>
        <TouchableOpacity style={styles.emergencyButton}>
          <Ionicons name="call" size={24} color="white" />
          <Text style={styles.emergencyText}>Emergency Contact</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  recentPrescriptions: {
    padding: 20,
  },
  prescriptionCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
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
    alignItems: 'center',
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
  lowStockSection: {
    padding: 20,
  },
  lowStockCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stockText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  expiryText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stockActions: {
    alignItems: 'center',
  },
  lowStockText: {
    fontSize: 10,
    color: '#FF5722',
    fontWeight: 'bold',
    marginTop: 4,
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
  emergencySection: {
    padding: 20,
  },
  emergencyButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
})

export default PharmacistDashboard
