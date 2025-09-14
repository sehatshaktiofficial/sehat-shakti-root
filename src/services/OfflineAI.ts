// Offline AI Service using TensorFlow.js for Medical Analysis
// Provides 100% offline medical intelligence for rural areas
import * as tf from '@tensorflow/tfjs'
import { Platform } from 'react-native'

interface SymptomInput {
  code: string
  name: string
  severity?: number // 1-10 scale
  duration?: string // hours, days, weeks
  frequency?: string // constant, intermittent, occasional
}

interface VitalSigns {
  temperature?: number // Celsius
  bloodPressure?: {
    systolic: number
    diastolic: number
  }
  heartRate?: number // BPM
  respiratoryRate?: number // per minute
  oxygenSaturation?: number // percentage
}

interface AnalysisResult {
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
  urgencyScore: number // 1-10
  possibleConditions: Array<{
    condition: string
    confidence: number
    icdCode?: string
    description: string
  }>
  recommendedActions: string[]
  requiresDoctor: boolean
  emergencyActions?: string[]
  homeCareAdvice: string[]
  followUpAdvice: string
  confidence: number
}

interface DrugInteraction {
  severity: 'MINOR' | 'MODERATE' | 'MAJOR'
  description: string
  mechanism: string
  management: string
}

class OfflineAIService {
  private symptomModel: tf.LayersModel | null = null
  private drugInteractionModel: tf.LayersModel | null = null
  private isInitialized: boolean = false
  private isInitializing: boolean = false
  private medicalKnowledgeBase: any = null
  private symptomMappings: Map<string, number> = new Map()
  private conditionMappings: Map<number, string> = new Map()

  constructor() {
    // Do not initialize immediately to avoid runtime not ready errors
    // this.initializeAI()
  }

  // Initialize AI models and knowledge base (safe lazy initialization)
  async initializeAI(): Promise<boolean> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      return new Promise((resolve) => {
        const checkInit = () => {
          if (this.isInitialized) {
            resolve(true)
          } else if (!this.isInitializing) {
            resolve(false)
          } else {
            setTimeout(checkInit, 100)
          }
        }
        checkInit()
      })
    }

    if (this.isInitialized) {
      return true
    }

    this.isInitializing = true

    try {
      console.log('Initializing Lok Sehat Offline AI...')

      // Initialize basic knowledge first (doesn't require TensorFlow)
      this.initializeSymptomMappings()
      this.initializeBasicKnowledge()

      // Try to initialize TensorFlow.js (with RN backend on native only)
      try {
        if (Platform.OS !== 'web') {
          // Dynamically load react-native backend only on native platforms
          await import('@tensorflow/tfjs-react-native')
        }
        await tf.ready()
        console.log('TensorFlow.js ready')
        
        // Load pre-trained models (bundled with app)
        await this.loadModels()
      } catch (tfError) {
        console.warn('TensorFlow.js initialization failed, using rule-based fallback:', tfError)
      }

      // Try to load medical knowledge base from local database
      try {
        await this.loadMedicalKnowledgeBase()
      } catch (dbError) {
        console.warn('Database initialization failed, using basic knowledge:', dbError)
      }

      this.isInitialized = true
      this.isInitializing = false
      console.log('Offline AI initialized successfully')
      return true
    } catch (error) {
      console.error('Offline AI initialization failed:', error)
      this.isInitialized = false
      this.isInitializing = false
      return false
    }
  }

  // Load medical knowledge base from local database
  async loadMedicalKnowledgeBase() {
    try {
      // Dynamically import database to avoid initializing native modules at bundle time
      const { database } = await import('../database')

      const knowledge = await database.collections
        .get('medical_knowledge')
        .query()
        .fetch()

      this.medicalKnowledgeBase = {
        symptoms: knowledge.filter(k => (k as any).category === 'symptoms'),
        conditions: knowledge.filter(k => (k as any).category === 'conditions'),
        protocols: knowledge.filter(k => (k as any).category === 'protocols')
      }

      console.log(`Loaded ${knowledge.length} medical knowledge entries`)
    } catch (error) {
      console.warn('Failed to load medical knowledge base, using fallback:', error)
      // Initialize with basic knowledge if database fails
      this.initializeBasicKnowledge()
    }
  }

  // Initialize basic medical knowledge as fallback
  initializeBasicKnowledge() {
    this.medicalKnowledgeBase = {
      symptoms: [
        { code: 'fever', name: 'Fever', severity_level: 5 },
        { code: 'headache', name: 'Headache', severity_level: 3 },
        { code: 'chest_pain', name: 'Chest Pain', severity_level: 9 },
        { code: 'difficulty_breathing', name: 'Difficulty Breathing', severity_level: 9 },
        { code: 'nausea', name: 'Nausea', severity_level: 3 },
        { code: 'fatigue', name: 'Fatigue', severity_level: 2 }
      ],
      conditions: [
        { code: 'common_cold', name: 'Common Cold', severity_level: 2 },
        { code: 'hypertension', name: 'High Blood Pressure', severity_level: 7 },
        { code: 'cardiac_emergency', name: 'Cardiac Emergency', severity_level: 10 }
      ],
      protocols: []
    }
  }

  // Initialize symptom to vector mappings
  initializeSymptomMappings() {
    const commonSymptoms = [
      'fever', 'headache', 'chest_pain', 'difficulty_breathing', 'nausea', 
      'fatigue', 'cough', 'sore_throat', 'abdominal_pain', 'dizziness',
      'vomiting', 'diarrhea', 'muscle_ache', 'joint_pain', 'rash',
      'swelling', 'palpitations', 'shortness_of_breath', 'confusion',
      'loss_of_appetite', 'weight_loss', 'night_sweats', 'chills'
    ]

    commonSymptoms.forEach((symptom, index) => {
      this.symptomMappings.set(symptom, index)
    })

    // Common conditions mapping
    const conditions = [
      'common_cold', 'flu', 'hypertension', 'diabetes', 'gastritis',
      'migraine', 'bronchitis', 'urinary_tract_infection', 'allergic_reaction',
      'food_poisoning', 'anxiety', 'dehydration', 'anemia', 'arthritis',
      'cardiac_emergency', 'respiratory_emergency', 'stroke', 'appendicitis'
    ]

    conditions.forEach((condition, index) => {
      this.conditionMappings.set(index, condition)
    })
  }

  // Load pre-trained TensorFlow models (placeholder - would be actual models in production)
  async loadModels() {
    try {
      // For now, we'll use rule-based logic
      // In production, these would be actual TensorFlow.js models
      console.log('Loading symptom analysis models...')
      
      // Placeholder for model loading
      // this.symptomModel = await tf.loadLayersModel(bundleResourceIO({
      //   modelUrl: require('../../assets/models/symptom_model.json'),
      //   weightsUrl: require('../../assets/models/symptom_weights.bin')
      // }))

      console.log('Models loaded successfully (rule-based fallback active)')
    } catch (error) {
      console.error('Model loading failed, using rule-based analysis:', error)
    }
  }

  // Main symptom analysis function
  async analyzeSymptoms(
    symptoms: SymptomInput[],
    patientAge?: number,
    patientGender?: string,
    vitalSigns?: VitalSigns
  ): Promise<AnalysisResult> {
    try {
      // Ensure AI is initialized before analysis
      if (!this.isInitialized) {
        console.log('Initializing AI service for symptom analysis...')
        const initSuccess = await this.initializeAI()
        if (!initSuccess) {
          console.warn('AI initialization failed, using basic fallback analysis')
        }
      }

      // Check for emergency conditions first
      const emergencyCheck = this.checkEmergencyConditions(symptoms, vitalSigns)
      if (emergencyCheck.isEmergency && emergencyCheck.result) {
        return emergencyCheck.result
      }

      // Perform detailed analysis
      const analysis = await this.performDetailedAnalysis(symptoms, patientAge, patientGender, vitalSigns)
      
      return analysis
    } catch (error) {
      console.error('Symptom analysis failed:', error)
      return this.getFallbackAnalysis(symptoms)
    }
  }

  // Check for emergency conditions
  checkEmergencyConditions(symptoms: SymptomInput[], vitalSigns?: VitalSigns): { isEmergency: boolean; result?: AnalysisResult } {
    const emergencySymptoms = [
      'chest_pain', 'difficulty_breathing', 'severe_bleeding', 'unconsciousness',
      'severe_headache', 'stroke_symptoms', 'severe_abdominal_pain'
    ]

    const criticalVitals = this.assessCriticalVitals(vitalSigns)

    for (const symptom of symptoms) {
      if (emergencySymptoms.includes(symptom.code) || (symptom.severity && symptom.severity >= 8)) {
        return {
          isEmergency: true,
          result: {
            urgency: 'EMERGENCY',
            urgencyScore: 10,
            possibleConditions: [{
              condition: this.getEmergencyCondition(symptom.code),
              confidence: 0.95,
              description: 'Emergency medical condition requiring immediate attention'
            }],
            recommendedActions: ['Call emergency services immediately (108)'],
            requiresDoctor: true,
            emergencyActions: this.getEmergencyActions(symptom.code),
            homeCareAdvice: ['Do not attempt home treatment', 'Stay calm', 'Keep patient comfortable'],
            followUpAdvice: 'Immediate emergency medical care required',
            confidence: 0.95
          }
        }
      }
    }

    if (criticalVitals.isCritical) {
      return {
        isEmergency: true,
        result: {
          urgency: 'EMERGENCY',
          urgencyScore: 10,
          possibleConditions: [{
            condition: 'Critical vital signs',
            confidence: 0.9,
            description: criticalVitals.reason || 'Critical vital signs detected'
          }],
          recommendedActions: ['Seek immediate medical attention'],
          requiresDoctor: true,
          emergencyActions: ['Monitor vital signs', 'Keep patient comfortable', 'Call emergency services'],
          homeCareAdvice: ['Do not delay medical care'],
          followUpAdvice: 'Emergency medical evaluation required',
          confidence: 0.9
        }
      }
    }

    return { isEmergency: false }
  }

  // Assess critical vital signs
  assessCriticalVitals(vitalSigns?: VitalSigns): { isCritical: boolean; reason?: string } {
    if (!vitalSigns) return { isCritical: false }

    // Critical temperature (fever > 40°C or < 35°C)
    if (vitalSigns.temperature && (vitalSigns.temperature > 40 || vitalSigns.temperature < 35)) {
      return { isCritical: true, reason: 'Critical body temperature' }
    }

    // Critical blood pressure
    if (vitalSigns.bloodPressure) {
      const { systolic, diastolic } = vitalSigns.bloodPressure
      if (systolic > 180 || diastolic > 120 || systolic < 90) {
        return { isCritical: true, reason: 'Critical blood pressure' }
      }
    }

    // Critical heart rate
    if (vitalSigns.heartRate && (vitalSigns.heartRate > 120 || vitalSigns.heartRate < 50)) {
      return { isCritical: true, reason: 'Critical heart rate' }
    }

    // Critical oxygen saturation
    if (vitalSigns.oxygenSaturation && vitalSigns.oxygenSaturation < 90) {
      return { isCritical: true, reason: 'Critical oxygen saturation' }
    }

    return { isCritical: false }
  }

  // Perform detailed symptom analysis
  async performDetailedAnalysis(
    symptoms: SymptomInput[],
    patientAge?: number,
    patientGender?: string,
    vitalSigns?: VitalSigns
  ): Promise<AnalysisResult> {
    // Rule-based analysis (would use ML model in production)
    const symptomPatterns = this.matchSymptomPatterns(symptoms)
    const ageFactors = this.applyAgeFactors(symptomPatterns, patientAge)
    const genderFactors = this.applyGenderFactors(ageFactors, patientGender)
    const vitalFactors = this.applyVitalSignFactors(genderFactors, vitalSigns)

    // Calculate overall urgency
    const urgencyScore = this.calculateUrgencyScore(symptoms, vitalSigns)
    const urgency = this.mapUrgencyLevel(urgencyScore)

    // Generate recommendations
    const recommendations = this.generateRecommendations(vitalFactors, urgencyScore)

    return {
      urgency,
      urgencyScore,
      possibleConditions: vitalFactors.slice(0, 3), // Top 3 conditions
      recommendedActions: recommendations.actions,
      requiresDoctor: urgencyScore >= 6,
      homeCareAdvice: recommendations.homeCare,
      followUpAdvice: recommendations.followUp,
      confidence: this.calculateConfidence(symptoms.length, vitalSigns ? 1 : 0)
    }
  }

  // Match symptom patterns to conditions
  matchSymptomPatterns(symptoms: SymptomInput[]): Array<{ condition: string; confidence: number; description: string }> {
    const conditions: Array<{ condition: string; confidence: number; description: string }> = []

    // Common cold pattern
    const coldSymptoms = ['cough', 'sore_throat', 'runny_nose', 'headache', 'fatigue']
    const coldMatch = this.calculatePatternMatch(symptoms, coldSymptoms)
    if (coldMatch > 0.3) {
      conditions.push({
        condition: 'Common Cold',
        confidence: coldMatch,
        description: 'Viral upper respiratory tract infection'
      })
    }

    // Flu pattern
    const fluSymptoms = ['fever', 'muscle_ache', 'fatigue', 'headache', 'cough']
    const fluMatch = this.calculatePatternMatch(symptoms, fluSymptoms)
    if (fluMatch > 0.4) {
      conditions.push({
        condition: 'Influenza',
        confidence: fluMatch,
        description: 'Viral infection with systemic symptoms'
      })
    }

    // Gastroenteritis pattern
    const gastroSymptoms = ['nausea', 'vomiting', 'diarrhea', 'abdominal_pain']
    const gastroMatch = this.calculatePatternMatch(symptoms, gastroSymptoms)
    if (gastroMatch > 0.4) {
      conditions.push({
        condition: 'Gastroenteritis',
        confidence: gastroMatch,
        description: 'Inflammation of stomach and intestines'
      })
    }

    // Hypertension pattern
    const htnSymptoms = ['headache', 'dizziness', 'fatigue', 'palpitations']
    const htnMatch = this.calculatePatternMatch(symptoms, htnSymptoms)
    if (htnMatch > 0.3) {
      conditions.push({
        condition: 'Hypertension',
        confidence: htnMatch,
        description: 'High blood pressure'
      })
    }

    return conditions.sort((a, b) => b.confidence - a.confidence)
  }

  // Calculate pattern match score
  calculatePatternMatch(patientSymptoms: SymptomInput[], conditionSymptoms: string[]): number {
    let matches = 0
    let totalWeight = 0

    for (const conditionSymptom of conditionSymptoms) {
      const patientSymptom = patientSymptoms.find(s => s.code === conditionSymptom)
      if (patientSymptom) {
        const weight = (patientSymptom.severity || 5) / 10
        matches += weight
      }
      totalWeight += 1
    }

    return totalWeight > 0 ? matches / totalWeight : 0
  }

  // Apply age-based factors
  applyAgeFactors(conditions: any[], age?: number): any[] {
    if (!age) return conditions

    return conditions.map(condition => {
      let adjustedConfidence = condition.confidence

      // Age-specific adjustments
      if (age > 65) {
        // Elderly are more prone to serious conditions
        if (condition.condition.includes('Hypertension') || condition.condition.includes('Cardiac')) {
          adjustedConfidence *= 1.2
        }
      } else if (age < 18) {
        // Children are more prone to infections
        if (condition.condition.includes('Cold') || condition.condition.includes('Flu')) {
          adjustedConfidence *= 1.1
        }
      }

      return { ...condition, confidence: Math.min(adjustedConfidence, 1.0) }
    })
  }

  // Apply gender-based factors
  applyGenderFactors(conditions: any[], gender?: string): any[] {
    if (!gender) return conditions

    return conditions.map(condition => {
      let adjustedConfidence = condition.confidence

      // Gender-specific adjustments would go here
      // This is a simplified example

      return { ...condition, confidence: adjustedConfidence }
    })
  }

  // Apply vital sign factors
  applyVitalSignFactors(conditions: any[], vitalSigns?: VitalSigns): any[] {
    if (!vitalSigns) return conditions

    return conditions.map(condition => {
      let adjustedConfidence = condition.confidence

      // Adjust confidence based on vital signs
      if (vitalSigns.temperature && vitalSigns.temperature > 38) {
        if (condition.condition.includes('Flu') || condition.condition.includes('infection')) {
          adjustedConfidence *= 1.3
        }
      }

      if (vitalSigns.bloodPressure) {
        const systolic = vitalSigns.bloodPressure.systolic
        if (systolic > 140 && condition.condition.includes('Hypertension')) {
          adjustedConfidence *= 1.4
        }
      }

      return { ...condition, confidence: Math.min(adjustedConfidence, 1.0) }
    })
  }

  // Calculate urgency score
  calculateUrgencyScore(symptoms: SymptomInput[], vitalSigns?: VitalSigns): number {
    let score = 0

    // Base score from symptoms
    for (const symptom of symptoms) {
      score += (symptom.severity || 5) / 10
    }

    // Vital signs contribution
    if (vitalSigns) {
      if (vitalSigns.temperature && vitalSigns.temperature > 39) score += 1
      if (vitalSigns.bloodPressure && vitalSigns.bloodPressure.systolic > 160) score += 1.5
      if (vitalSigns.heartRate && vitalSigns.heartRate > 100) score += 0.5
    }

    // Normalize to 1-10 scale
    return Math.min(Math.max(score, 1), 10)
  }

  // Map urgency score to level
  mapUrgencyLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' {
    if (score >= 9) return 'EMERGENCY'
    if (score >= 7) return 'HIGH'
    if (score >= 4) return 'MEDIUM'
    return 'LOW'
  }

  // Generate recommendations
  generateRecommendations(conditions: any[], urgencyScore: number) {
    const actions = []
    const homeCare = []
    let followUp = ''

    if (urgencyScore >= 8) {
      actions.push('Seek immediate medical attention')
      actions.push('Do not delay treatment')
      followUp = 'Emergency medical care required'
    } else if (urgencyScore >= 6) {
      actions.push('Consult doctor within 24 hours')
      actions.push('Monitor symptoms closely')
      followUp = 'Medical consultation recommended within 24 hours'
    } else if (urgencyScore >= 4) {
      actions.push('Consider doctor consultation if symptoms persist')
      actions.push('Monitor for worsening symptoms')
      followUp = 'If symptoms persist for 2-3 days, consult doctor'
    } else {
      actions.push('Monitor symptoms')
      actions.push('Rest and supportive care')
      followUp = 'Consult doctor if symptoms worsen or persist beyond a week'
    }

    // General home care advice
    homeCare.push('Rest and adequate sleep')
    homeCare.push('Stay hydrated')
    homeCare.push('Maintain good nutrition')
    homeCare.push('Monitor temperature and symptoms')

    return { actions, homeCare, followUp }
  }

  // Calculate confidence based on available data
  calculateConfidence(symptomCount: number, vitalSignsPresent: number): number {
    let confidence = 0.5 // Base confidence

    // More symptoms = higher confidence
    confidence += Math.min(symptomCount * 0.1, 0.3)

    // Vital signs present = higher confidence
    confidence += vitalSignsPresent * 0.2

    return Math.min(confidence, 1.0)
  }

  // Get emergency condition name
  getEmergencyCondition(symptomCode: string): string {
    const emergencyMap: { [key: string]: string } = {
      'chest_pain': 'Suspected Cardiac Emergency',
      'difficulty_breathing': 'Respiratory Emergency',
      'severe_bleeding': 'Hemorrhage Emergency',
      'unconsciousness': 'Neurological Emergency',
      'severe_headache': 'Possible Stroke/Hypertensive Crisis'
    }

    return emergencyMap[symptomCode] || 'Medical Emergency'
  }

  // Get emergency actions
  getEmergencyActions(symptomCode: string): string[] {
    const actionMap: { [key: string]: string[] } = {
      'chest_pain': [
        'Call emergency services (108)',
        'Give aspirin if not allergic (300mg chewed)',
        'Keep patient calm and seated',
        'Loosen tight clothing',
        'Monitor breathing and pulse'
      ],
      'difficulty_breathing': [
        'Call emergency services immediately',
        'Help patient sit upright',
        'Loosen tight clothing',
        'Clear airway if obstructed',
        'Stay with patient'
      ],
      'severe_bleeding': [
        'Apply direct pressure to wound',
        'Elevate injured area if possible',
        'Call emergency services',
        'Do not remove embedded objects',
        'Monitor for shock'
      ]
    }

    return actionMap[symptomCode] || [
      'Call emergency services (108)',
      'Keep patient calm',
      'Monitor vital signs',
      'Do not give food or water',
      'Stay with patient until help arrives'
    ]
  }

  // Fallback analysis for errors
  getFallbackAnalysis(symptoms: SymptomInput[]): AnalysisResult {
    return {
      urgency: 'MEDIUM',
      urgencyScore: 5,
      possibleConditions: [{
        condition: 'General medical consultation needed',
        confidence: 0.6,
        description: 'Unable to perform detailed analysis. Please consult healthcare provider.'
      }],
      recommendedActions: ['Consult with healthcare provider', 'Monitor symptoms'],
      requiresDoctor: true,
      homeCareAdvice: ['Rest', 'Stay hydrated', 'Monitor symptoms'],
      followUpAdvice: 'Medical consultation recommended',
      confidence: 0.6
    }
  }

  // Drug interaction checking (basic rule-based)
  async checkDrugInteractions(medicines: string[]): Promise<DrugInteraction[]> {
    const interactions: DrugInteraction[] = []

    // Basic drug interaction rules
    const interactionRules = [
      {
        drugs: ['warfarin', 'aspirin'],
        severity: 'MAJOR' as const,
        description: 'Increased bleeding risk',
        mechanism: 'Additive anticoagulant effects',
        management: 'Monitor INR closely, consider dose adjustment'
      },
      {
        drugs: ['metformin', 'alcohol'],
        severity: 'MODERATE' as const,
        description: 'Increased risk of lactic acidosis',
        mechanism: 'Alcohol interferes with lactate metabolism',
        management: 'Limit alcohol consumption, monitor lactate levels'
      }
    ]

    for (const rule of interactionRules) {
      const hasAllDrugs = rule.drugs.every(drug => 
        medicines.some(medicine => 
          medicine.toLowerCase().includes(drug.toLowerCase())
        )
      )

      if (hasAllDrugs) {
        interactions.push(rule)
      }
    }

    return interactions
  }

  // Get AI status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasSymptomModel: !!this.symptomModel,
      hasDrugModel: !!this.drugInteractionModel,
      knowledgeBaseSize: this.medicalKnowledgeBase ? 
        Object.values(this.medicalKnowledgeBase).flat().length : 0,
      symptomMappings: this.symptomMappings.size
    }
  }
}

// Singleton instance
export const offlineAIService = new OfflineAIService()

// Export for easy access
export const offlineSymptomChecker = {
  analyzeSymptoms: offlineAIService.analyzeSymptoms.bind(offlineAIService),
  checkDrugInteractions: offlineAIService.checkDrugInteractions.bind(offlineAIService),
  getStatus: offlineAIService.getStatus.bind(offlineAIService)
}

export default offlineAIService