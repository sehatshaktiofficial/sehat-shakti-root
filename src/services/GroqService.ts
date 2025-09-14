// Groq API Integration for Enhanced Medical Intelligence
// Provides online medical AI when internet is available
import { useAppStore } from '../store/AppStore'

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
  }>
}

interface MedicalQueryRequest {
  type: 'symptom_analysis' | 'drug_interaction' | 'medical_question' | 'pharmacy_stock' | 'doctor_availability'
  data: any
  patientInfo?: {
    age?: number
    gender?: string
    medicalHistory?: string[]
  }
}

interface MedicalResponse {
  success: boolean
  data?: any
  error?: string
  source: 'groq_api' | 'offline_fallback'
  confidence: number
}

class GroqMedicalService {
  private apiKey: string = ''
  private baseUrl: string = 'https://api.groq.com/openai/v1/chat/completions'
  private isOnline: boolean = false
  
  constructor() {
    // Initialize with environment or default API key
    this.apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || ''
  }

  // Set API key (for users who want to provide their own)
  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  // Check online status and API availability
  async checkAvailability(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.log('Groq API key not configured')
        return false
      }

      // Simple connectivity test with AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(this.baseUrl, {
        method: 'OPTIONS',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      this.isOnline = response.ok
      return this.isOnline
    } catch (error) {
      console.log('Groq API not available:', error)
      this.isOnline = false
      return false
    }
  }

  // Main method for medical queries
  async queryMedicalAI(request: MedicalQueryRequest): Promise<MedicalResponse> {
    const isAvailable = await this.checkAvailability()
    
    if (!isAvailable) {
      return await this.handleOfflineFallback(request)
    }

    try {
      const prompt = this.buildMedicalPrompt(request)
      const response = await this.callGroqAPI(prompt)
      
      return {
        success: true,
        data: this.parseGroqResponse(response, request.type),
        source: 'groq_api',
        confidence: 0.9
      }
    } catch (error) {
      console.error('Groq API call failed:', error)
      return await this.handleOfflineFallback(request)
    }
  }

  // Symptom analysis with Groq AI
  async analyzeSymptoms(symptoms: string[], patientInfo?: any): Promise<MedicalResponse> {
    return await this.queryMedicalAI({
      type: 'symptom_analysis',
      data: { symptoms, vitalSigns: patientInfo?.vitalSigns },
      patientInfo
    })
  }

  // Drug interaction checking
  async checkDrugInteractions(medicines: string[]): Promise<MedicalResponse> {
    return await this.queryMedicalAI({
      type: 'drug_interaction',
      data: { medicines }
    })
  }

  // General medical questions
  async askMedicalQuestion(question: string, context?: any): Promise<MedicalResponse> {
    return await this.queryMedicalAI({
      type: 'medical_question',
      data: { question, context }
    })
  }

  // Pharmacy stock query assistance
  async getPharmacyGuidance(medicineName: string, location?: string): Promise<MedicalResponse> {
    return await this.queryMedicalAI({
      type: 'pharmacy_stock',
      data: { medicineName, location }
    })
  }

  // Doctor availability assistance
  async getDoctorAvailabilityGuidance(specialty?: string, urgency?: string): Promise<MedicalResponse> {
    return await this.queryMedicalAI({
      type: 'doctor_availability',
      data: { specialty, urgency }
    })
  }

  // Build medical prompt based on request type
  private buildMedicalPrompt(request: MedicalQueryRequest): string {
    const baseContext = `You are a medical AI assistant for a rural telemedicine platform called Lok Sehat. 
    Provide accurate, helpful medical guidance while always recommending professional medical consultation when appropriate.
    Keep responses concise and practical for rural healthcare settings.`

    switch (request.type) {
      case 'symptom_analysis':
        return `${baseContext}

SYMPTOM ANALYSIS REQUEST:
Patient Symptoms: ${request.data.symptoms.join(', ')}
${request.patientInfo?.age ? `Age: ${request.patientInfo.age}` : ''}
${request.patientInfo?.gender ? `Gender: ${request.patientInfo.gender}` : ''}
${request.data.vitalSigns ? `Vital Signs: ${JSON.stringify(request.data.vitalSigns)}` : ''}

Please analyze these symptoms and provide:
1. Possible conditions (most likely first)
2. Urgency level (1-10, where 10 is emergency)
3. Immediate care recommendations
4. When to seek medical attention
5. Home care advice if appropriate

Format response as JSON:
{
  "possibleConditions": [],
  "urgencyLevel": number,
  "immediateActions": [],
  "seekMedicalCare": "when description",
  "homeCare": []
}`

      case 'drug_interaction':
        return `${baseContext}

DRUG INTERACTION CHECK:
Medicines: ${request.data.medicines.join(', ')}

Please check for interactions between these medicines and provide:
1. Any dangerous interactions
2. Mild interactions to monitor
3. Timing recommendations
4. Food interactions
5. Alternative suggestions if needed

Format response as JSON:
{
  "dangerousInteractions": [],
  "mildInteractions": [],
  "timingAdvice": [],
  "foodInteractions": [],
  "alternatives": []
}`

      case 'medical_question':
        return `${baseContext}

MEDICAL QUESTION:
${request.data.question}
${request.data.context ? `Context: ${JSON.stringify(request.data.context)}` : ''}

Please provide a clear, helpful answer appropriate for rural healthcare settings.
Include when professional medical consultation is recommended.`

      case 'pharmacy_stock':
        return `${baseContext}

PHARMACY GUIDANCE:
Medicine: ${request.data.medicineName}
${request.data.location ? `Location: ${request.data.location}` : ''}

Please provide guidance on:
1. Generic alternatives if original not available
2. Dosage information
3. Storage requirements
4. Important warnings
5. When this medicine is typically prescribed

Format as helpful guidance for rural pharmacy.`

      case 'doctor_availability':
        return `${baseContext}

DOCTOR AVAILABILITY GUIDANCE:
${request.data.specialty ? `Specialty: ${request.data.specialty}` : ''}
${request.data.urgency ? `Urgency: ${request.data.urgency}` : ''}

Please provide guidance on:
1. What type of doctor to consult
2. Urgency assessment
3. Questions to prepare for consultation
4. What information to have ready
5. Alternative care options if doctor not immediately available`

      default:
        return `${baseContext}\n\nPlease provide general medical guidance for: ${JSON.stringify(request.data)}`
    }
  }

  // Call Groq API
  private async callGroqAPI(prompt: string): Promise<GroqResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192', // Use Groq's fast Llama model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful medical AI assistant. Always recommend professional medical consultation when appropriate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent medical advice
        max_tokens: 1024,
        top_p: 0.9
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    return await response.json()
  }

  // Parse Groq response based on request type
  private parseGroqResponse(response: GroqResponse, type: string): any {
    const content = response.choices[0]?.message?.content || ''
    
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      // If JSON parsing fails, return as text
    }

    // Return as structured text response
    return {
      text: content,
      type: type,
      timestamp: Date.now()
    }
  }

  // Handle offline fallback
  private async handleOfflineFallback(request: MedicalQueryRequest): Promise<MedicalResponse> {
    console.log('Using offline fallback for medical query')
    
    // Basic offline fallback responses
    switch (request.type) {
      case 'symptom_analysis':
        return {
          success: true,
          data: {
            possibleConditions: ['General consultation recommended'],
            urgencyLevel: 5,
            immediateActions: ['Monitor symptoms', 'Rest and hydration'],
            seekMedicalCare: 'If symptoms persist or worsen',
            homeCare: ['Rest', 'Stay hydrated', 'Monitor temperature']
          },
          source: 'offline_fallback',
          confidence: 0.6
        }
      
      case 'drug_interaction':
        return {
          success: true,
          data: {
            dangerousInteractions: [],
            mildInteractions: ['Please consult pharmacist for drug interactions'],
            timingAdvice: ['Take as prescribed'],
            foodInteractions: ['Follow package instructions'],
            alternatives: []
          },
          source: 'offline_fallback',
          confidence: 0.5
        }
      
      default:
        return {
          success: false,
          error: 'This feature requires internet connection',
          source: 'offline_fallback',
          confidence: 0
        }
    }
  }

  // Get usage statistics
  getUsageStats() {
    return {
      isOnline: this.isOnline,
      hasApiKey: !!this.apiKey,
      lastChecked: Date.now()
    }
  }
}

// Singleton instance
export const groqMedicalService = new GroqMedicalService()

// Hook for React components
export const useGroqMedical = () => {
  const isOnline = useAppStore((state) => state.isOnline)
  
  return {
    analyzeSymptoms: groqMedicalService.analyzeSymptoms.bind(groqMedicalService),
    checkDrugInteractions: groqMedicalService.checkDrugInteractions.bind(groqMedicalService),
    askMedicalQuestion: groqMedicalService.askMedicalQuestion.bind(groqMedicalService),
    getPharmacyGuidance: groqMedicalService.getPharmacyGuidance.bind(groqMedicalService),
    getDoctorAvailabilityGuidance: groqMedicalService.getDoctorAvailabilityGuidance.bind(groqMedicalService),
    isAvailable: isOnline && groqMedicalService.getUsageStats().hasApiKey,
    setApiKey: groqMedicalService.setApiKey.bind(groqMedicalService)
  }
}

export default groqMedicalService