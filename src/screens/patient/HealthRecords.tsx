// Health Records - Patient medical history and records management
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface HealthRecord {
  id: string
  type: 'consultation' | 'test_result' | 'prescription' | 'vaccination'
  title: string
  date: string
  doctor?: string
  status: 'completed' | 'pending' | 'cancelled'
  summary: string
}

const HealthRecords: React.FC = ({ navigation }: any) => {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadHealthRecords()
  }, [])

  const loadHealthRecords = async () => {
    // Mock data for demo
    const mockRecords: HealthRecord[] = [
      {
        id: '1',
        type: 'consultation',
        title: 'General Checkup',
        date: '2024-01-15',
        doctor: 'Dr. Priya Sharma',
        status: 'completed',
        summary: 'Regular health checkup. All vitals normal.'
      },
      {
        id: '2',
        type: 'test_result',
        title: 'Blood Test Report',
        date: '2024-01-10',
        status: 'completed',
        summary: 'Complete blood count and lipid profile results.'
      },
      {
        id: '3',
        type: 'prescription',
        title: 'Medication for Fever',
        date: '2024-01-05',
        doctor: 'Dr. Rajesh Kumar',
        status: 'completed',
        summary: 'Prescribed paracetamol and rest for viral fever.'
      }
    ]
    setRecords(mockRecords)
  }

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'consultation': return 'medical'
      case 'test_result': return 'clipboard'
      case 'prescription': return 'medkit'
      case 'vaccination': return 'shield-checkmark'
      default: return 'document'
    }
  }

  const getRecordColor = (type: string) => {
    switch (type) {
      case 'consultation': return '#2196F3'
      case 'test_result': return '#FF9800'
      case 'prescription': return '#4CAF50'
      case 'vaccination': return '#9C27B0'
      default: return '#666'
    }
  }

  const renderRecord = ({ item }: { item: HealthRecord }) => (
    <TouchableOpacity style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={[styles.recordIcon, { backgroundColor: getRecordColor(item.type) }]}>
          <Ionicons name={getRecordIcon(item.type) as any} size={20} color="white" />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{item.title}</Text>
          <Text style={styles.recordDate}>{item.date}</Text>
          {item.doctor && <Text style={styles.recordDoctor}>{item.doctor}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.recordSummary}>{item.summary}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Records</Text>
        <TouchableOpacity>
          <Ionicons name="add" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'consultation', 'test_result', 'prescription'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterTab, filter === type && styles.filterTabActive]}
            onPress={() => setFilter(type)}
          >
            <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Records List */}
      <FlatList
        data={records.filter(r => filter === 'all' || r.type === filter)}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        style={styles.recordsList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  recordsList: {
    flex: 1,
    padding: 15,
  },
  recordCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recordDoctor: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  recordSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
})

export default HealthRecords