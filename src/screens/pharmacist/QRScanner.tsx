// QR Scanner - Scan prescription QR codes for verification
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface ScannedPrescription {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  medicines: any[]
  instructions: string
  validUntil: Date
  digitalSignature: string
  createdAt: Date
  isVerified: boolean
}

const QRScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [scannedPrescription, setScannedPrescription] = useState<ScannedPrescription | null>(null)
  const [isResultModalVisible, setIsResultModalVisible] = useState(false)
  const [scanHistory, setScanHistory] = useState<string[]>([])
  
  const currentUser = useCurrentUser()
  const { width, height } = Dimensions.get('window')

  useEffect(() => {
    loadScanHistory()
  }, [])

  const loadScanHistory = async () => {
    try {
      // Load from AsyncStorage or local database
      const history = ['PRES-12345678', 'PRES-87654321', 'PRES-11223344']
      setScanHistory(history)
    } catch (error) {
      console.error('Error loading scan history:', error)
    }
  }

  const startScanning = () => {
    setIsScanning(true)
    // In a real implementation, this would open the camera for QR scanning
    // For demo purposes, we'll simulate scanning after 2 seconds
    setTimeout(() => {
      simulateQRScan()
    }, 2000)
  }

  const simulateQRScan = () => {
    // Simulate scanning a QR code
    const mockQRData = 'PRES-' + Math.random().toString(36).substr(2, 8).toUpperCase()
    setScannedData(mockQRData)
    setIsScanning(false)
    
    // Look up prescription data
    lookupPrescription(mockQRData)
  }

  const lookupPrescription = async (prescriptionId: string) => {
    try {
      const prescription = await database.collections
        .get('prescriptions')
        .find(prescriptionId)

      if (!prescription) {
        Alert.alert('Prescription Not Found', 'This prescription ID does not exist in our database')
        return
      }

      const patient = await database.collections
        .get('users')
        .find(prescription.patientId)
      const doctor = await database.collections
        .get('users')
        .find(prescription.doctorId)

      const prescriptionData: ScannedPrescription = {
        id: prescription.id,
        patientId: prescription.patientId,
        patientName: patient.name,
        doctorId: prescription.doctorId,
        doctorName: doctor.name,
        medicines: (prescription as any).medicines || [],
        instructions: (prescription as any).instructions,
        validUntil: prescription.validUntil,
        digitalSignature: (prescription as any).digitalSignature,
        createdAt: prescription.createdAt,
        isVerified: (prescription as any).isVerified || false,
      }

      setScannedPrescription(prescriptionData)
      setIsResultModalVisible(true)

      // Add to scan history
      if (!scanHistory.includes(prescriptionId)) {
        const newHistory = [prescriptionId, ...scanHistory.slice(0, 9)]
        setScanHistory(newHistory)
      }

    } catch (error) {
      console.error('Error looking up prescription:', error)
      Alert.alert('Error', 'Failed to look up prescription data')
    }
  }

  const verifyPrescription = async () => {
    if (!scannedPrescription) return

    try {
      // Verify digital signature
      const isValidSignature = await verifyDigitalSignature(scannedPrescription)
      
      if (!isValidSignature) {
        Alert.alert('Verification Failed', 'Digital signature verification failed')
        return
      }

      // Check if prescription is still valid
      if (scannedPrescription.validUntil < new Date()) {
        Alert.alert('Prescription Expired', 'This prescription has expired')
        return
      }

      // Update prescription as verified
      const prescriptionRecord = await database.collections
        .get('prescriptions')
        .find(scannedPrescription.id)

      await database.write(async () => {
        await prescriptionRecord.update((record: any) => {
          record.isVerified = true
          record.verifiedBy = currentUser?.id
          record.verifiedAt = new Date()
        })
      })

      Alert.alert('Prescription Verified', 'Prescription has been successfully verified')
      setIsResultModalVisible(false)
      setScannedPrescription(null)

    } catch (error) {
      console.error('Error verifying prescription:', error)
      Alert.alert('Error', 'Failed to verify prescription')
    }
  }

  const verifyDigitalSignature = async (prescription: ScannedPrescription): Promise<boolean> => {
    try {
      // In a real implementation, this would verify the digital signature
      // For now, we'll simulate verification
      return true
    } catch (error) {
      console.error('Error verifying digital signature:', error)
      return false
    }
  }

  const handleHistoryPress = (prescriptionId: string) => {
    lookupPrescription(prescriptionId)
  }

  const renderScanningView = () => (
    <View style={styles.scanningContainer}>
      <View style={styles.scannerFrame}>
        <View style={styles.corner} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
      
      <Text style={styles.scanningText}>Position QR code within the frame</Text>
      <Text style={styles.scanningSubtext}>Scanning...</Text>
      
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setIsScanning(false)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )

  const renderResultModal = () => {
    if (!scannedPrescription) return null

    return (
      <Modal
        visible={isResultModalVisible}
        animationType="slide"
        onRequestClose={() => setIsResultModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Prescription Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsResultModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Prescription ID</Text>
              <Text style={styles.detailText}>{scannedPrescription.id}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Patient Information</Text>
              <Text style={styles.detailText}>
                Name: {scannedPrescription.patientName}
                {'\n'}ID: {scannedPrescription.patientId}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Doctor Information</Text>
              <Text style={styles.detailText}>
                Dr. {scannedPrescription.doctorName}
                {'\n'}Prescribed on: {new Date(scannedPrescription.createdAt).toLocaleString()}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Medicines ({scannedPrescription.medicines.length})</Text>
              {scannedPrescription.medicines.map((medicine, index) => (
                <View key={index} style={styles.medicineItem}>
                  <Text style={styles.medicineName}>{medicine.genericName}</Text>
                  <Text style={styles.medicineDetails}>
                    {medicine.dosage} | {medicine.frequency} | {medicine.duration}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Validity</Text>
              <Text style={styles.detailText}>
                Valid until: {new Date(scannedPrescription.validUntil).toLocaleDateString()}
                {'\n'}Status: {scannedPrescription.isVerified ? 'VERIFIED' : 'PENDING'}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              {!scannedPrescription.isVerified && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={verifyPrescription}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Verify Prescription</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <View style={styles.container}>
      {isScanning ? (
        renderScanningView()
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>QR Code Scanner</Text>
            <Text style={styles.subtitle}>Scan prescription QR codes for verification</Text>
          </View>

          {/* Scanner Area */}
          <View style={styles.scannerArea}>
            <View style={styles.scannerPlaceholder}>
              <Ionicons name="qr-code" size={80} color="#ccc" />
              <Text style={styles.scannerText}>QR Code Scanner</Text>
              <Text style={styles.scannerSubtext}>
                Tap the scan button to start scanning prescription QR codes
              </Text>
            </View>
          </View>

          {/* Scan Button */}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={startScanning}
          >
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.scanButtonText}>Start Scanning</Text>
          </TouchableOpacity>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Recent Scans</Text>
              {scanHistory.slice(0, 5).map((prescriptionId, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyItem}
                  onPress={() => handleHistoryPress(prescriptionId)}
                >
                  <Ionicons name="document-text" size={20} color="#666" />
                  <Text style={styles.historyText}>{prescriptionId}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsTitle}>How to use:</Text>
            <Text style={styles.instructionsText}>
              1. Tap "Start Scanning" to open the camera
              {'\n'}2. Position the QR code within the frame
              {'\n'}3. The prescription details will be displayed
              {'\n'}4. Verify the prescription if valid
            </Text>
          </View>
        </>
      )}

      {/* Result Modal */}
      {renderResultModal()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  scannerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scannerPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  scannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  scannerSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  scanningContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
    borderWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    transform: [{ rotate: '90deg' }],
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    transform: [{ rotate: '-90deg' }],
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    transform: [{ rotate: '180deg' }],
  },
  scanningText: {
    color: 'white',
    fontSize: 18,
    marginTop: 40,
  },
  scanningSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 40,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  historySection: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  instructionsSection: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionButtons: {
    marginTop: 20,
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
})

export default QRScanner
