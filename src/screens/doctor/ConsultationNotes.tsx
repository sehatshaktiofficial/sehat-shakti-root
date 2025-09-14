// Consultation Notes - Doctor's consultation notes and documentation
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

interface ConsultationNote {
  id: string
  consultationId: string
  patientId: string
  patientName: string
  symptoms: string[]
  diagnosis: string
  treatment: string
  notes: string
  followUpRequired: boolean
  followUpDate?: Date
  prescriptionId?: string
  createdAt: Date
  updatedAt: Date
}

const ConsultationNotes: React.FC = () => {
  const [notes, setNotes] = useState<ConsultationNote[]>([])
  const [selectedNote, setSelectedNote] = useState<ConsultationNote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [isAddModalVisible, setIsAddModalVisible] = useState(false)
  const [editForm, setEditForm] = useState({
    symptoms: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    followUpRequired: false,
    followUpDate: '',
  })
  
  const currentUser = useCurrentUser()

  useEffect(() => {
    loadConsultationNotes()
  }, [])

  const loadConsultationNotes = async () => {
    try {
      setIsLoading(true)
      
      // In a real app, this would load from the database
      // For now, we'll simulate loading notes
      const mockNotes: ConsultationNote[] = [
        {
          id: 'NOTE-001',
          consultationId: 'CONS-001',
          patientId: 'PAT-001',
          patientName: 'Rajesh Kumar',
          symptoms: ['Fever', 'Cough', 'Sore throat', 'Body ache'],
          diagnosis: 'Upper Respiratory Tract Infection',
          treatment: 'Antibiotics, rest, plenty of fluids',
          notes: 'Patient presented with acute onset of symptoms. Temperature 101°F. Throat examination shows mild inflammation. Prescribed antibiotics and symptomatic treatment.',
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          prescriptionId: 'PRES-001',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'NOTE-002',
          consultationId: 'CONS-002',
          patientId: 'PAT-002',
          patientName: 'Priya Sharma',
          symptoms: ['Chest pain', 'Shortness of breath'],
          diagnosis: 'Anxiety-related chest pain',
          treatment: 'Breathing exercises, stress management',
          notes: 'Patient reports sudden onset of chest pain during work stress. ECG normal. Vitals stable. No cardiac risk factors.',
          followUpRequired: false,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        }
      ]

      setNotes(mockNotes)
    } catch (error) {
      console.error('Error loading consultation notes:', error)
      Alert.alert('Error', 'Failed to load consultation notes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditPress = (note: ConsultationNote) => {
    setSelectedNote(note)
    setEditForm({
      symptoms: note.symptoms.join(', '),
      diagnosis: note.diagnosis,
      treatment: note.treatment,
      notes: note.notes,
      followUpRequired: note.followUpRequired,
      followUpDate: note.followUpDate ? note.followUpDate.toISOString().split('T')[0] : '',
    })
    setIsEditModalVisible(true)
  }

  const handleAddPress = () => {
    setSelectedNote(null)
    setEditForm({
      symptoms: '',
      diagnosis: '',
      treatment: '',
      notes: '',
      followUpRequired: false,
      followUpDate: '',
    })
    setIsAddModalVisible(true)
  }

  const saveNote = async () => {
    try {
      if (!editForm.diagnosis || !editForm.treatment) {
        Alert.alert('Error', 'Please fill in diagnosis and treatment')
        return
      }

      const noteData = {
        ...editForm,
        symptoms: editForm.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        followUpDate: editForm.followUpDate ? new Date(editForm.followUpDate) : undefined,
      }

      if (selectedNote) {
        // Update existing note
        const updatedNotes = notes.map(note =>
          note.id === selectedNote.id
            ? {
                ...note,
                ...noteData,
                updatedAt: new Date(),
              }
            : note
        )
        setNotes(updatedNotes)
        Alert.alert('Success', 'Consultation note updated successfully')
      } else {
        // Add new note
        const newNote: ConsultationNote = {
          id: `NOTE-${Date.now()}`,
          consultationId: `CONS-${Date.now()}`,
          patientId: 'PAT-001',
          patientName: 'New Patient',
          ...noteData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setNotes([newNote, ...notes])
        Alert.alert('Success', 'Consultation note added successfully')
      }

      setIsEditModalVisible(false)
      setIsAddModalVisible(false)
    } catch (error) {
      console.error('Error saving note:', error)
      Alert.alert('Error', 'Failed to save consultation note')
    }
  }

  const deleteNote = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this consultation note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotes(notes.filter(note => note.id !== noteId))
            Alert.alert('Success', 'Consultation note deleted')
          }
        }
      ]
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderNoteItem = ({ item }: { item: ConsultationNote }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => handleEditPress(item)}
    >
      <View style={styles.noteHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.noteActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPress(item)}
          >
            <Ionicons name="create" size={16} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteNote(item.id)}
          >
            <Ionicons name="trash" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.diagnosis}>{item.diagnosis}</Text>

      <View style={styles.symptomsContainer}>
        <Text style={styles.symptomsLabel}>Symptoms:</Text>
        <View style={styles.symptomsList}>
          {item.symptoms.map((symptom, index) => (
            <View key={index} style={styles.symptomTag}>
              <Text style={styles.symptomText}>{symptom}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.treatment} numberOfLines={2}>
        Treatment: {item.treatment}
      </Text>

      {item.followUpRequired && item.followUpDate && (
        <View style={styles.followUpContainer}>
          <Ionicons name="calendar" size={16} color="#FF9800" />
          <Text style={styles.followUpText}>
            Follow-up: {formatDate(item.followUpDate)}
          </Text>
        </View>
      )}

      {item.prescriptionId && (
        <View style={styles.prescriptionContainer}>
          <Ionicons name="document-text" size={16} color="#4CAF50" />
          <Text style={styles.prescriptionText}>Prescription: {item.prescriptionId}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderEditModal = () => (
    <Modal
      visible={isEditModalVisible || isAddModalVisible}
      animationType="slide"
      onRequestClose={() => {
        setIsEditModalVisible(false)
        setIsAddModalVisible(false)
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {selectedNote ? 'Edit Note' : 'Add Note'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setIsEditModalVisible(false)
              setIsAddModalVisible(false)
            }}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Symptoms (comma-separated) *</Text>
            <TextInput
              style={styles.input}
              value={editForm.symptoms}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, symptoms: text }))}
              placeholder="Fever, cough, headache"
              multiline
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Diagnosis *</Text>
            <TextInput
              style={styles.input}
              value={editForm.diagnosis}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, diagnosis: text }))}
              placeholder="Enter diagnosis"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Treatment *</Text>
            <TextInput
              style={styles.input}
              value={editForm.treatment}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, treatment: text }))}
              placeholder="Enter treatment plan"
              multiline
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.notes}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, notes: text }))}
              placeholder="Additional notes and observations"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setEditForm(prev => ({ ...prev, followUpRequired: !prev.followUpRequired }))}
            >
              <Ionicons
                name={editForm.followUpRequired ? 'checkbox' : 'square-outline'}
                size={20}
                color={editForm.followUpRequired ? '#2196F3' : '#666'}
              />
              <Text style={styles.checkboxLabel}>Follow-up required</Text>
            </TouchableOpacity>
          </View>

          {editForm.followUpRequired && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Follow-up Date</Text>
              <TextInput
                style={styles.input}
                value={editForm.followUpDate}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, followUpDate: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveNote}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.buttonText}>Save Note</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="document-text" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Loading consultation notes...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Consultation Notes</Text>
        <Text style={styles.subtitle}>Document and manage consultation notes</Text>
      </View>

      {/* Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPress}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add New Note</Text>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {notes.map((note) => (
          <View key={note.id}>
            {renderNoteItem({ item: note })}
          </View>
        ))}
        
        {notes.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Notes Found</Text>
            <Text style={styles.emptySubtitle}>
              Add your first consultation note to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      {renderEditModal()}
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
  addButtonContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  noteCard: {
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
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  noteDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  diagnosis: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12,
  },
  symptomsContainer: {
    marginBottom: 12,
  },
  symptomsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  symptomTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  symptomText: {
    fontSize: 12,
    color: '#1976D2',
  },
  treatment: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  followUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  followUpText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 4,
  },
  prescriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prescriptionText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
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
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  saveButton: {
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

export default ConsultationNotes
