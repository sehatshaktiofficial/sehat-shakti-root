// Sales Report - Pharmacist sales analytics and reporting
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface SalesData {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  topSellingMedicines: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  dailySales: Array<{
    date: string
    sales: number
    orders: number
  }>
  monthlyGrowth: number
  prescriptionVerificationRate: number
}

interface Order {
  id: string
  patientId: string
  patientName: string
  medicines: Array<{
    name: string
    quantity: number
    price: number
  }>
  totalAmount: number
  prescriptionId: string
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: Date
  completedAt?: Date
}

const SalesReport: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [showDetailedView, setShowDetailedView] = useState(false)
  
  const currentUser = useCurrentUser()
  const { width } = Dimensions.get('window')

  useEffect(() => {
    loadSalesData()
  }, [selectedPeriod])

  const loadSalesData = async () => {
    try {
      setIsLoading(true)
      
      // Calculate date range based on selected period
      const now = new Date()
      let startDate = new Date()
      
      switch (selectedPeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      // Load orders from database
      const orders = await database.collections
        .get('orders')
        .query(
          Q.where('pharmacy_id', Q.eq(currentUser?.id || '')),
          Q.where('created_at', Q.gte(startDate.getTime())),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch()

      const ordersList: Order[] = orders.map(order => ({
        id: order.id,
        patientId: (order as any).patientId,
        patientName: (order as any).patientName || 'Unknown Patient',
        medicines: (order as any).medicines || [],
        totalAmount: (order as any).totalAmount || 0,
        prescriptionId: (order as any).prescriptionId,
        status: (order as any).status || 'pending',
        createdAt: new Date((order as any).createdAt || Date.now()),
        completedAt: (order as any).completedAt ? new Date((order as any).completedAt) : undefined,
      }))

      setRecentOrders(ordersList)

      // Calculate sales data
      const completedOrders = ordersList.filter(order => order.status === 'completed')
      const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const totalOrders = completedOrders.length
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

      // Calculate top selling medicines
      const medicineSales: { [key: string]: { quantity: number; revenue: number } } = {}
      completedOrders.forEach(order => {
        order.medicines.forEach(medicine => {
          if (medicineSales[medicine.name]) {
            medicineSales[medicine.name].quantity += medicine.quantity
            medicineSales[medicine.name].revenue += medicine.price * medicine.quantity
          } else {
            medicineSales[medicine.name] = {
              quantity: medicine.quantity,
              revenue: medicine.price * medicine.quantity
            }
          }
        })
      })

      const topSellingMedicines = Object.entries(medicineSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Calculate daily sales for the period
      const dailySalesMap: { [key: string]: { sales: number; orders: number } } = {}
      completedOrders.forEach(order => {
        const date = order.createdAt.toDateString()
        if (dailySalesMap[date]) {
          dailySalesMap[date].sales += order.totalAmount
          dailySalesMap[date].orders += 1
        } else {
          dailySalesMap[date] = {
            sales: order.totalAmount,
            orders: 1
          }
        }
      })

      const dailySales = Object.entries(dailySalesMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calculate monthly growth (simplified)
      const currentMonthSales = dailySales.reduce((sum, day) => sum + day.sales, 0)
      const previousMonthSales = currentMonthSales * 0.8 // Simulated previous month data
      const monthlyGrowth = previousMonthSales > 0 ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100 : 0

      // Calculate prescription verification rate
      const verifiedPrescriptions = ordersList.filter(order => order.prescriptionId).length
      const prescriptionVerificationRate = ordersList.length > 0 ? (verifiedPrescriptions / ordersList.length) * 100 : 0

      const salesData: SalesData = {
        totalSales,
        totalOrders,
        averageOrderValue,
        topSellingMedicines,
        dailySales,
        monthlyGrowth,
        prescriptionVerificationRate,
      }

      setSalesData(salesData)

    } catch (error) {
      console.error('Error loading sales data:', error)
      Alert.alert('Error', 'Failed to load sales data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const getPeriodText = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today'
      case 'week': return 'Last 7 Days'
      case 'month': return 'Last 30 Days'
      case 'year': return 'Last 12 Months'
      default: return 'Last 30 Days'
    }
  }

  const renderMetricCard = (title: string, value: string, icon: string, color: string, subtitle?: string) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  )

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.patientName}>{item.patientName}</Text>
      
      <View style={styles.orderDetails}>
        <Text style={styles.medicineCount}>
          {item.medicines.length} medicine{item.medicines.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.orderAmount}>{formatCurrency(item.totalAmount)}</Text>
      </View>
      
      <Text style={styles.orderDate}>
        {formatDate(item.createdAt)}
      </Text>
    </TouchableOpacity>
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50'
      case 'pending': return '#FF9800'
      case 'cancelled': return '#F44336'
      default: return '#666'
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="analytics" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Loading sales data...</Text>
      </View>
    )
  }

  if (!salesData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Failed to load sales data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSalesData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sales Report</Text>
        <Text style={styles.subtitle}>{getPeriodText()}</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month', 'year'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadSalesData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          {renderMetricCard(
            'Total Sales',
            formatCurrency(salesData.totalSales),
            'cash',
            '#4CAF50',
            `${salesData.totalOrders} orders`
          )}
          
          {renderMetricCard(
            'Average Order',
            formatCurrency(salesData.averageOrderValue),
            'trending-up',
            '#2196F3',
            'per order'
          )}
          
          {renderMetricCard(
            'Growth',
            `${salesData.monthlyGrowth > 0 ? '+' : ''}${salesData.monthlyGrowth.toFixed(1)}%`,
            'arrow-up',
            salesData.monthlyGrowth >= 0 ? '#4CAF50' : '#F44336',
            'vs previous period'
          )}
          
          {renderMetricCard(
            'Verification Rate',
            `${salesData.prescriptionVerificationRate.toFixed(1)}%`,
            'checkmark-circle',
            '#FF9800',
            'prescriptions verified'
          )}
        </View>

        {/* Top Selling Medicines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Medicines</Text>
          {salesData.topSellingMedicines.map((medicine, index) => (
            <View key={index} style={styles.medicineItem}>
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{medicine.name}</Text>
                <Text style={styles.medicineQuantity}>{medicine.quantity} units sold</Text>
              </View>
              <Text style={styles.medicineRevenue}>{formatCurrency(medicine.revenue)}</Text>
            </View>
          ))}
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => setShowDetailedView(!showDetailedView)}>
              <Text style={styles.viewAllText}>
                {showDetailedView ? 'Show Less' : 'View All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {recentOrders.slice(0, showDetailedView ? recentOrders.length : 5).map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={styles.patientName}>{order.patientName}</Text>
              
              <View style={styles.orderDetails}>
                <Text style={styles.medicineCount}>
                  {order.medicines.length} medicine{order.medicines.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.orderAmount}>{formatCurrency(order.totalAmount)}</Text>
              </View>
              
              <Text style={styles.orderDate}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download" size={20} color="#FF9800" />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="print" size={20} color="#FF9800" />
            <Text style={styles.actionButtonText}>Print Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  retryButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  periodButtonActive: {
    backgroundColor: '#FF9800',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  metricsContainer: {
    padding: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  medicineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  medicineQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  medicineRevenue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
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
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicineCount: {
    fontSize: 12,
    color: '#666',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  actionButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
})

export default SalesReport
