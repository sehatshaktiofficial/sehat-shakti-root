// Symptom Checker - AI-powered symptom analysis for patients
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useIsOnline } from '../../store/AppStore'
import { offlineAIService } from '../../services/OfflineAI'
import { groqMedicalService } from '../../services/GroqService'

interface Symptom {
  id: string
  name: string
  severity: 'mild' | 'moderate' | 'severe'
  duration: string
  description?: string
}

interface AnalysisResult {
  possibleConditions: Array<{
    condition: string
    confidence?: number
    description: string
  }>
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency'
  recommendations: string[]
  redFlags: string[]
}

const SymptomChecker: React.FC = ({ navigation }: any) => {
  const isOnline = useIsOnline()
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [currentSymptom, setCurrentSymptom] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild')
  const [duration, setDuration] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [showAddSymptom, setShowAddSymptom] = useState(false)

  const severityLevels = [
    { key: 'mild', label: 'Mild', color: '#4CAF50' },
    { key: 'moderate', label: 'Moderate', color: '#FF9800' },
    { key: 'severe', label: 'Severe', color: '#F44336' },
  ]

  const commonSymptoms = [
    'Fever', 'Headache', 'Cough', 'Sore throat', 'Nausea', 'Fatigue',
    'Dizziness', 'Abdominal pain', 'Chest pain', 'Shortness of breath',
    'Joint pain', 'Muscle aches', 'Rash', 'Diarrhea', 'Vomiting', 'Insomnia'
  ]

  const addSymptom = () => {
    if (!currentSymptom.trim() || !duration.trim()) {
      Alert.alert('Error', 'Please fill in all symptom details')
      return
    }

    const newSymptom: Symptom = {
      id: Date.now().toString(),
      name: currentSymptom.trim(),
      severity: selectedSeverity,
      duration: duration.trim(),
    }

    setSymptoms([...symptoms, newSymptom])
    setCurrentSymptom('')
    setDuration('')
    setShowAddSymptom(false)
  }

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter(s => s.id !== id))
    setAnalysis(null)
  }

  const addQuickSymptom = (symptomName: string) => {
    const newSymptom: Symptom = {
      id: Date.now().toString(),
      name: symptomName,
      severity: 'mild',
      duration: 'Less than 24 hours',
    }
    setSymptoms([...symptoms, newSymptom])
  }

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) {
      Alert.alert('Error', 'Please add at least one symptom')
      return
    }

    setIsAnalyzing(true)
    setAnalysis(null)

    try {
      let result: AnalysisResult

      if (isOnline) {
        // Use Groq AI for online analysis
        const groqResult = await groqMedicalService.analyzeSymptoms(
          symptoms.map(s => s.name)
        )
        
        // Transform Groq response to our format
        result = {
          possibleConditions: groqResult.data?.possibleConditions || [],
          urgencyLevel: groqResult.data?.urgencyLevel >= 8 ? 'emergency' : 
                       groqResult.data?.urgencyLevel >= 6 ? 'high' :
                       groqResult.data?.urgencyLevel >= 4 ? 'medium' : 'low',
          recommendations: groqResult.data?.immediateActions || [],
          redFlags: groqResult.data?.seekMedicalCare ? [groqResult.data.seekMedicalCare] : []
        }
      } else {
        // Use offline AI
        const offlineResult = await offlineAIService.analyzeSymptoms(
          symptoms.map(s => ({
            code: s.name.toLowerCase().replace(/\s+/g, '_'),
            name: s.name,
            severity: s.severity === 'mild' ? 3 : s.severity === 'moderate' ? 6 : 9
          }))
        )
        
        // Transform offline response to our format
        result = {
          possibleConditions: offlineResult.possibleConditions || [],
          urgencyLevel: offlineResult.urgency === 'EMERGENCY' ? 'emergency' :
                       offlineResult.urgency === 'HIGH' ? 'high' :
                       offlineResult.urgency === 'MEDIUM' ? 'medium' : 'low',
          recommendations: offlineResult.recommendedActions || [],
          redFlags: offlineResult.emergencyActions || []
        }
      }

      setAnalysis(result)

      // Check for emergency conditions
      if (result.urgencyLevel === 'emergency') {
        Alert.alert(
          'MEDICAL EMERGENCY',
          'Your symptoms suggest a potential medical emergency. Please seek immediate medical attention or call emergency services.',
          [{ text: 'Understood', style: 'destructive' }]
        )
      }
    } catch (error) {
      console.error('Symptom analysis failed:', error)
      Alert.alert(
        'Analysis Failed',
        'Unable to analyze symptoms. Please try again or consult a healthcare provider.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return '#4CAF50'
      case 'moderate': return '#FF9800'
      case 'severe': return '#F44336'
      default: return '#666'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return '#4CAF50'
      case 'medium': return '#FF9800'
      case 'high': return '#F44336'
      case 'emergency': return '#D32F2F'
      default: return '#666'
    }
  }

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
        <Text style={styles.headerTitle}>Symptom Checker</Text>
        <View style={styles.statusIndicator}>
          <Ionicons 
            name={isOnline ? "cloud" : "hardware-chip"} 
            size={20} 
            color={isOnline ? "#4CAF50" : "#FF9800"} 
          />
          <Text style={styles.statusText}>
            {isOnline ? "Online AI" : "Offline AI"}
          </Text>
        </View>
      </View>

      {/* Current Symptoms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Symptoms ({symptoms.length})</Text>
        
        {symptoms.length > 0 ? (
          symptoms.map((symptom) => (
            <View key={symptom.id} style={styles.symptomCard}>
              <View style={styles.symptomInfo}>
                <Text style={styles.symptomName}>{symptom.name}</Text>
                <View style={styles.symptomDetails}>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(symptom.severity) }]}>
                    <Text style={styles.severityText}>{symptom.severity}</Text>
                  </View>
                  <Text style={styles.durationText}>Duration: {symptom.duration}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeSymptom(symptom.id)}
              >
                <Ionicons name="close" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="medical" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No symptoms added yet</Text>
            <Text style={styles.emptySubtext}>Add symptoms to get AI analysis</Text>
          </View>
        )}
      </View>

      {/* Quick Add Common Symptoms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common Symptoms</Text>
        <View style={styles.quickSymptoms}>
          {commonSymptoms.map((symptom) => (
            <TouchableOpacity
              key={symptom}
              style={styles.quickSymptomButton}
              onPress={() => addQuickSymptom(symptom)}
            >
              <Text style={styles.quickSymptomText}>{symptom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Add Custom Symptom */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddSymptom(!showAddSymptom)}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Add Custom Symptom</Text>
        </TouchableOpacity>

        {showAddSymptom && (
          <View style={styles.addSymptomForm}>
            <TextInput
              style={styles.input}
              placeholder="Describe your symptom"
              value={currentSymptom}
              onChangeText={setCurrentSymptom}
            />
            
            <View style={styles.severitySelector}>
              <Text style={styles.label}>Severity:</Text>
              <View style={styles.severityButtons}>
                {severityLevels.map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    style={[
                      styles.severityButton,
                      { 
                        backgroundColor: selectedSeverity === level.key ? level.color : '#f0f0f0',
                        borderColor: level.color 
                      }
                    ]}
                    onPress={() => setSelectedSeverity(level.key as any)}
                  >
                    <Text style={[
                      styles.severityButtonText,
                      { color: selectedSeverity === level.key ? 'white' : level.color }
                    ]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="How long have you had this symptom?"
              value={duration}
              onChangeText={setDuration}
            />

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddSymptom(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={addSymptom}
              >
                <Text style={styles.saveButtonText}>Add Symptom</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Analyze Button */}
      {symptoms.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
            onPress={analyzeSymptoms}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="hardware-chip" size={24} color="white" />
            )}
            <Text style={styles.analyzeButtonText}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Symptoms'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analysis Results */}
      {analysis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Results</Text>
          
          {/* Urgency Level */}
          <View style={[styles.urgencyCard, { borderLeftColor: getUrgencyColor(analysis.urgencyLevel) }]}>
            <View style={styles.urgencyHeader}>
              <Ionicons 
                name={analysis.urgencyLevel === 'emergency' ? 'warning' : 'information-circle'} 
                size={24} 
                color={getUrgencyColor(analysis.urgencyLevel)} 
              />
              <Text style={[styles.urgencyText, { color: getUrgencyColor(analysis.urgencyLevel) }]}>
                {analysis.urgencyLevel.toUpperCase()} PRIORITY
              </Text>
            </View>
          </View>

          {/* Possible Conditions */}
          <View style={styles.conditionsCard}>
            <Text style={styles.cardTitle}>Possible Conditions</Text>
            {analysis.possibleConditions.map((condition, index) => (
              <View key={index} style={styles.conditionItem}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.conditionName}>{condition.condition}</Text>
                  <Text style={styles.conditionProbability}>
                    {Math.round((condition.confidence || 0) * 100)}%
                  </Text>
                </View>
                <Text style={styles.conditionDescription}>{condition.description}</Text>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          <View style={styles.recommendationsCard}>
            <Text style={styles.cardTitle}>Recommendations</Text>
            {analysis.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>

          {/* Red Flags */}
          {analysis.redFlags.length > 0 && (
            <View style={styles.redFlagsCard}>
              <Text style={styles.cardTitle}>⚠️ Warning Signs</Text>
              {analysis.redFlags.map((flag, index) => (
                <View key={index} style={styles.redFlagItem}>
                  <Ionicons name="warning" size={16} color="#F44336" />
                  <Text style={styles.redFlagText}>{flag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('BookConsultation')}
            >
              <Ionicons name="videocam" size={20} color="white" />
              <Text style={styles.actionButtonText}>Book Consultation</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryActionButton]}
              onPress={() => {
                // TODO: Save analysis to health records
                Alert.alert('Saved', 'Analysis saved to your health records')
              }}
            >
              <Ionicons name="save" size={20} color="#2196F3" />
              <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
                Save to Records
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color="#666" />
        <Text style={styles.disclaimerText}>
          This AI analysis is for informational purposes only and should not replace professional medical advice. 
          Always consult a healthcare provider for proper diagnosis and treatment.
        </Text>
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
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
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
  symptomCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  symptomInfo: {
    flex: 1,
  },
  symptomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  symptomDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  severityText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
  },
  removeButton: {
    padding: 5,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  quickSymptoms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickSymptomButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  quickSymptomText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addSymptomForm: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  severitySelector: {
    marginBottom: 15,
  },
  severityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  urgencyCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 15,
    elevation: 1,
  },
  urgencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  conditionsCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  conditionItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  conditionProbability: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  conditionDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 1,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
  },
  redFlagsCard: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  redFlagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  redFlagText: {
    flex: 1,
    fontSize: 14,
    color: '#c62828',
    marginLeft: 10,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  secondaryActionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  secondaryActionButtonText: {
    color: '#2196F3',
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    lineHeight: 18,
  },
})

export default SymptomChecker