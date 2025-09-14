// Book Consultation - Video/voice consultation booking for patients
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
import { useCurrentUser, useIsOnline } from '../../store/AppStore'
import { DatabaseService } from '../../database'

interface Doctor {
  id: string
  name: string
  specialty: string
  rating: number
  experience: number
  isOnline: boolean
  availableSlots: string[]
  consultationFee: number
  languages: string[]
}

interface ConsultationType {
  id: string
  name: string
  icon: keyof typeof Ionicons.glyphMap
  description: string
  duration: string
  fee: number
  requiresInternet: boolean
}

const BookConsultation: React.FC = ({ navigation }: any) => {
  const currentUser = useCurrentUser()
  const isOnline = useIsOnline()
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('')
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [consultationReason, setConsultationReason] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showDoctorModal, setShowDoctorModal] = useState(false)

  const consultationTypes: ConsultationType[] = [
    {
      id: 'video',
      name: 'Video Consultation',
      icon: 'videocam',
      description: 'Face-to-face video call with doctor',
      duration: '20-30 minutes',
      fee: 300,
      requiresInternet: true
    },
    {
      id: 'voice',
      name: 'Voice Consultation',
      icon: 'call',
      description: 'Voice call consultation',
      duration: '15-20 minutes',
      fee: 200,
      requiresInternet: true
    },
    {
      id: 'offline',
      name: 'Offline Request',
      icon: 'document-text',
      description: 'Send consultation request for later',
      duration: 'Response within 24 hours',
      fee: 150,
      requiresInternet: false
    },
    {
      id: 'emergency',
      name: 'Emergency',
      icon: 'warning',
      description: 'Immediate medical attention',
      duration: 'Immediate',
      fee: 500,
      requiresInternet: false
    }
  ]

  const specialties = [
    'General Medicine',
    'Pediatrics',
    'Gynecology',
    'Cardiology',
    'Dermatology',
    'Mental Health',
    'Emergency Medicine',
    'Family Medicine'
  ]

  useEffect(() => {
    if (selectedSpecialty) {
      loadAvailableDoctors()
    }
  }, [selectedSpecialty, selectedType])

  const loadAvailableDoctors = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would fetch from database or API
      // For now, we'll simulate with mock data
      const mockDoctors: Doctor[] = [
        {
          id: '1',
          name: 'Dr. Priya Sharma',
          specialty: selectedSpecialty,
          rating: 4.8,
          experience: 8,
          isOnline: isOnline,
          availableSlots: ['10:00 AM', '2:00 PM', '4:00 PM'],
          consultationFee: 300,
          languages: ['Hindi', 'English']
        },
        {
          id: '2',
          name: 'Dr. Rajesh Kumar',
          specialty: selectedSpecialty,
          rating: 4.6,
          experience: 12,
          isOnline: false,
          availableSlots: ['11:00 AM', '3:00 PM', '5:00 PM'],
          consultationFee: 400,
          languages: ['Hindi', 'English', 'Punjabi']
        },
        {
          id: '3',
          name: 'Dr. Asha Patel',
          specialty: selectedSpecialty,
          rating: 4.9,
          experience: 15,
          isOnline: isOnline,
          availableSlots: ['9:00 AM', '1:00 PM', '6:00 PM'],
          consultationFee: 350,
          languages: ['Hindi', 'English', 'Gujarati']
        }
      ]

      setAvailableDoctors(mockDoctors)
    } catch (error) {
      console.error('Failed to load doctors:', error)
      Alert.alert('Error', 'Failed to load available doctors')
    } finally {
      setIsLoading(false)
    }
  }

  const bookConsultation = async () => {
    if (!selectedType || !selectedDoctor || !consultationReason.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    if (selectedType !== 'offline' && selectedType !== 'emergency' && !selectedSlot) {
      Alert.alert('Error', 'Please select a time slot')
      return
    }

    try {
      setIsLoading(true)

      // Create consultation record
      const consultation = {
        id: Date.now().toString(),
        patientId: currentUser?.id,
        doctorId: selectedDoctor.id,
        type: selectedType,
        specialty: selectedSpecialty,
        scheduledTime: selectedSlot,
        reason: consultationReason,
        symptoms: symptoms,
        status: selectedType === 'emergency' ? 'urgent' : 'scheduled',
        fee: selectedDoctor.consultationFee,
        createdAt: new Date().toISOString(),
        isOnline: selectedType === 'video' || selectedType === 'voice'
      }

      // Save to database - we'll implement this later
      // await DatabaseService.saveConsultation(consultation)
      console.log('Consultation booked:', consultation)

      // Show success message
      Alert.alert(
        'Consultation Booked',
        `Your ${consultationTypes.find(t => t.id === selectedType)?.name} with ${selectedDoctor.name} has been booked successfully.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Consultations')
          }
        ]
      )

    } catch (error) {
      console.error('Failed to book consultation:', error)
      Alert.alert('Error', 'Failed to book consultation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderConsultationType = (type: ConsultationType) => {
    const isAvailable = !type.requiresInternet || isOnline
    const isSelected = selectedType === type.id

    return (
      <TouchableOpacity
        key={type.id}
        style={[
          styles.typeCard,
          isSelected && styles.typeCardSelected,
          !isAvailable && styles.typeCardDisabled
        ]}
        onPress={() => isAvailable ? setSelectedType(type.id) : null}
        disabled={!isAvailable}
      >
        <View style={styles.typeHeader}>
          <Ionicons 
            name={type.icon} 
            size={24} 
            color={isSelected ? 'white' : isAvailable ? '#2196F3' : '#ccc'} 
          />
          <Text style={[
            styles.typeName,
            isSelected && styles.typeNameSelected,
            !isAvailable && styles.typeNameDisabled
          ]}>
            {type.name}
          </Text>
          {!isAvailable && (
            <Ionicons name="ban" size={16} color="#F44336" />
          )}
        </View>
        <Text style={[
          styles.typeDescription,
          isSelected && styles.typeDescriptionSelected,
          !isAvailable && styles.typeDescriptionDisabled
        ]}>
          {type.description}
        </Text>
        <View style={styles.typeDetails}>
          <Text style={[
            styles.typeDetail,
            isSelected && styles.typeDetailSelected,
            !isAvailable && styles.typeDetailDisabled
          ]}>
            Duration: {type.duration}
          </Text>
          <Text style={[
            styles.typeDetail,
            isSelected && styles.typeDetailSelected,
            !isAvailable && styles.typeDetailDisabled
          ]}>
            Fee: ₹{type.fee}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderDoctor = (doctor: Doctor) => (
    <TouchableOpacity
      key={doctor.id}
      style={[
        styles.doctorCard,
        selectedDoctor?.id === doctor.id && styles.doctorCardSelected
      ]}
      onPress={() => setSelectedDoctor(doctor)}
    >
      <View style={styles.doctorInfo}>
        <View style={styles.doctorHeader}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <View style={styles.doctorStatus}>
            <View style={[
              styles.statusDot,
              { backgroundColor: doctor.isOnline ? '#4CAF50' : '#FF9800' }
            ]} />
            <Text style={styles.statusText}>
              {doctor.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
        
        <View style={styles.doctorDetails}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{doctor.rating}</Text>
          </View>
          <Text style={styles.experience}>{doctor.experience} years exp.</Text>
          <Text style={styles.fee}>₹{doctor.consultationFee}</Text>
        </View>

        <View style={styles.languageContainer}>
          <Text style={styles.languageLabel}>Languages: </Text>
          <Text style={styles.languages}>{doctor.languages.join(', ')}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.viewProfileButton}
        onPress={() => setShowDoctorModal(true)}
      >
        <Ionicons name="information-circle" size={16} color="#2196F3" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Consultation</Text>
        <View style={styles.connectionStatus}>
          <Ionicons 
            name={isOnline ? "wifi" : "close-circle"} 
            size={20} 
            color={isOnline ? "#4CAF50" : "#FF9800"} 
          />
        </View>
      </View>

      {/* Step 1: Choose Consultation Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Choose Consultation Type</Text>
        <View style={styles.typesGrid}>
          {consultationTypes.map(renderConsultationType)}
        </View>
      </View>

      {/* Step 2: Select Specialty */}
      {selectedType && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Select Specialty</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.specialtyContainer}>
              {specialties.map((specialty) => (
                <TouchableOpacity
                  key={specialty}
                  style={[
                    styles.specialtyButton,
                    selectedSpecialty === specialty && styles.specialtyButtonSelected
                  ]}
                  onPress={() => setSelectedSpecialty(specialty)}
                >
                  <Text style={[
                    styles.specialtyText,
                    selectedSpecialty === specialty && styles.specialtyTextSelected
                  ]}>
                    {specialty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Step 3: Select Doctor */}
      {selectedSpecialty && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Select Doctor</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading available doctors...</Text>
            </View>
          ) : (
            availableDoctors.map(renderDoctor)
          )}
        </View>
      )}

      {/* Step 4: Select Time Slot */}
      {selectedDoctor && selectedType !== 'offline' && selectedType !== 'emergency' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Select Time Slot</Text>
          <View style={styles.slotsContainer}>
            {selectedDoctor.availableSlots.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.slotButton,
                  selectedSlot === slot && styles.slotButtonSelected
                ]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[
                  styles.slotText,
                  selectedSlot === slot && styles.slotTextSelected
                ]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Step 5: Provide Details */}
      {selectedDoctor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Consultation Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Reason for Consultation *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Brief description of your health concern"
              value={consultationReason}
              onChangeText={setConsultationReason}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current Symptoms (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your current symptoms"
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Booking Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Doctor:</Text>
              <Text style={styles.summaryValue}>{selectedDoctor.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type:</Text>
              <Text style={styles.summaryValue}>
                {consultationTypes.find(t => t.id === selectedType)?.name}
              </Text>
            </View>
            {selectedSlot && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{selectedSlot}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fee:</Text>
              <Text style={[styles.summaryValue, styles.feeText]}>
                ₹{selectedDoctor.consultationFee}
              </Text>
            </View>
          </View>

          {/* Book Button */}
          <TouchableOpacity
            style={[styles.bookButton, isLoading && styles.bookButtonDisabled]}
            onPress={bookConsultation}
            disabled={isLoading}
          >
            <Text style={styles.bookButtonText}>
              {isLoading ? 'Booking...' : 'Book Consultation'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Doctor Details Modal */}
      <Modal
        visible={showDoctorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDoctorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Doctor Profile</Text>
              <TouchableOpacity onPress={() => setShowDoctorModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedDoctor && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalDoctorName}>{selectedDoctor.name}</Text>
                <Text style={styles.modalSpecialty}>{selectedDoctor.specialty}</Text>
                
                <View style={styles.modalDetailsRow}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.modalDetailText}>
                    {selectedDoctor.rating} rating
                  </Text>
                </View>
                
                <View style={styles.modalDetailsRow}>
                  <Ionicons name="school" size={16} color="#666" />
                  <Text style={styles.modalDetailText}>
                    {selectedDoctor.experience} years experience
                  </Text>
                </View>
                
                <View style={styles.modalDetailsRow}>
                  <Ionicons name="language" size={16} color="#666" />
                  <Text style={styles.modalDetailText}>
                    {selectedDoctor.languages.join(', ')}
                  </Text>
                </View>
                
                <Text style={styles.modalSectionTitle}>Available Time Slots</Text>
                <View style={styles.modalSlots}>
                  {selectedDoctor.availableSlots.map((slot) => (
                    <View key={slot} style={styles.modalSlot}>
                      <Text style={styles.modalSlotText}>{slot}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  connectionStatus: {
    padding: 5,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  typesGrid: {
    gap: 15,
  },
  typeCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    elevation: 1,
  },
  typeCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  typeCardDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  typeNameSelected: {
    color: 'white',
  },
  typeNameDisabled: {
    color: '#999',
  },
  typeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  typeDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  typeDescriptionDisabled: {
    color: '#ccc',
  },
  typeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeDetail: {
    fontSize: 12,
    color: '#666',
  },
  typeDetailSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  typeDetailDisabled: {
    color: '#ccc',
  },
  specialtyContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  specialtyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  specialtyButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  specialtyText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  specialtyTextSelected: {
    color: 'white',
  },
  doctorCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    elevation: 1,
  },
  doctorCardSelected: {
    borderColor: '#2196F3',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  doctorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  doctorDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  experience: {
    fontSize: 12,
    color: '#666',
    marginRight: 15,
  },
  fee: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 12,
    color: '#666',
  },
  languages: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  viewProfileButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  slotButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  slotText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  slotTextSelected: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  feeText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalDoctorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalSpecialty: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  modalSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalSlot: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSlotText: {
    fontSize: 12,
    color: '#333',
  },
})

export default BookConsultation