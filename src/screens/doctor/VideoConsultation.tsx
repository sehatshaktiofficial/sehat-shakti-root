// Video Consultation - Offline video consultation for doctors
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../../store/AppStore'
import { database } from '../../database'
import { Q } from '@nozbe/watermelondb'

interface ConsultationData {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  chiefComplaint: string
  symptoms: any[]
  urgencyLevel: number
  scheduledAt: Date
  status: string
}

const VideoConsultation: React.FC = () => {
  const [consultation, setConsultation] = useState<ConsultationData | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [consultationNotes, setConsultationNotes] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  
  const currentUser = useCurrentUser()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadConsultationData()
    startTimer()
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const loadConsultationData = async () => {
    try {
      // In a real implementation, this would get the consultation ID from navigation params
      const consultations = await database.collections
        .get('consultations')
        .query(
          Q.where('doctor_id', currentUser?.id || ''),
          Q.where('status', 'in_progress'),
          Q.sortBy('started_at', Q.desc),
          Q.take(1)
        )
        .fetch()

      if (consultations.length > 0) {
        const consultationData = consultations[0]
        const patient = await database.collections
          .get('users')
          .find(consultationData.patientId)

        setConsultation({
          id: consultationData.id,
          patientId: consultationData.patientId,
          patientName: patient.name,
          patientPhone: patient.phoneNumber,
          chiefComplaint: consultationData.chiefComplaint || 'No complaint specified',
          symptoms: consultationData.symptoms || [],
          urgencyLevel: consultationData.urgencyLevel,
          scheduledAt: consultationData.scheduledAt,
          status: consultationData.status,
        })
        setIsConnected(true)
      } else {
        Alert.alert('No Active Consultation', 'No active consultation found')
      }
    } catch (error) {
      console.error('Error loading consultation data:', error)
      Alert.alert('Error', 'Failed to load consultation data')
    }
  }

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => prev + 1)
    }, 1000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    Alert.alert('Recording Started', 'Consultation is being recorded locally')
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    Alert.alert('Recording Stopped', 'Recording saved locally')
  }

  const handleToggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleToggleVideo = () => {
    setIsVideoOn(!isVideoOn)
  }

  const handleEndConsultation = async () => {
    try {
      if (!consultation) return

      // Update consultation status
      const consultationRecord = await database.collections
        .get('consultations')
        .find(consultation.id)

      await database.write(async () => {
        await consultationRecord.update((record: any) => {
          record.status = 'completed'
          record.endedAt = new Date()
          record.notes = consultationNotes
        })
      })

      // Create health record
      await database.write(async () => {
        await database.collections.get('health_records').create((record: any) => {
          record.patientId = consultation.patientId
          record.recordType = 'consultation'
          record.title = 'Video Consultation'
          record.content = {
            consultationId: consultation.id,
            doctorName: currentUser?.name,
            duration: currentTime,
            notes: consultationNotes,
            symptoms: consultation.symptoms,
            chiefComplaint: consultation.chiefComplaint,
            createdAt: new Date(),
          }
          record.doctorId = currentUser?.id
          record.consultationId = consultation.id
          record.isCritical = consultation.urgencyLevel >= 8
        })
      })

      Alert.alert(
        'Consultation Completed',
        `Duration: ${formatTime(currentTime)}`,
        [{ text: 'OK', onPress: () => {
          // Navigate back to dashboard
        }}]
      )
    } catch (error) {
      console.error('Error ending consultation:', error)
      Alert.alert('Error', 'Failed to end consultation')
    }
  }

  const handleEmergency = () => {
    Alert.alert(
      'Emergency Protocol',
      'Emergency protocols activated. Contacting emergency services...',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 108', onPress: () => {
          // In a real app, this would make an actual call
          Alert.alert('Emergency Call', 'Calling emergency services (108)...')
        }}
      ]
    )
  }

  if (!consultation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading consultation...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Video Area */}
      <View style={styles.videoContainer}>
        {isVideoOn ? (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={64} color="#666" />
            <Text style={styles.videoText}>Video Feed</Text>
            <Text style={styles.patientName}>{consultation.patientName}</Text>
          </View>
        ) : (
          <View style={styles.videoOffPlaceholder}>
            <Ionicons name="videocam-off" size={64} color="#666" />
            <Text style={styles.videoText}>Video Off</Text>
          </View>
        )}

        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected (Offline)' : 'Disconnected'}
          </Text>
        </View>

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>REC</Text>
          </View>
        )}
      </View>

      {/* Patient Information */}
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{consultation.patientName}</Text>
        <Text style={styles.patientPhone}>{consultation.patientPhone}</Text>
        <Text style={styles.complaint}>{consultation.chiefComplaint}</Text>
        
        {consultation.symptoms.length > 0 && (
          <View style={styles.symptomsContainer}>
            <Text style={styles.symptomsTitle}>Symptoms:</Text>
            <View style={styles.symptomsList}>
              {consultation.symptoms.map((symptom, index) => (
                <View key={index} style={styles.symptomTag}>
                  <Text style={styles.symptomText}>{symptom.name || symptom}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={handleToggleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
          onPress={handleToggleVideo}
        >
          <Ionicons name={isVideoOn ? 'videocam' : 'videocam-off'} size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
        >
          <Ionicons name={isRecording ? 'stop' : 'radio'} size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.emergencyButton]}
          onPress={handleEmergency}
        >
          <Ionicons name="warning" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endButton]}
          onPress={handleEndConsultation}
        >
          <Ionicons name="call" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(currentTime)}</Text>
      </View>

      {/* Notes Section */}
      <View style={styles.notesContainer}>
        <Text style={styles.notesTitle}>Consultation Notes:</Text>
        <View style={styles.notesInputContainer}>
          <Text style={styles.notesPlaceholder}>
            Add notes about the consultation...
          </Text>
        </View>
      </View>
    </View>
  )
}

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
  videoContainer: {
    width: width,
    height: height * 0.6,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  videoOffPlaceholder: {
    alignItems: 'center',
  },
  videoText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
  },
  patientName: {
    color: 'white',
    fontSize: 16,
    marginTop: 8,
  },
  connectionStatus: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  patientInfo: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  patientName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  patientPhone: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
  complaint: {
    color: 'white',
    fontSize: 16,
    marginTop: 8,
  },
  symptomsContainer: {
    marginTop: 12,
  },
  symptomsTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  symptomTag: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  symptomText: {
    color: 'white',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#F44336',
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  emergencyButton: {
    backgroundColor: '#F44336',
  },
  endButton: {
    backgroundColor: '#F44336',
  },
  timerContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  notesTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesInputContainer: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    minHeight: 60,
  },
  notesPlaceholder: {
    color: '#666',
    fontSize: 14,
  },
})

export default VideoConsultation
