// Database Models for Lok Sehat
import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, json, children, relation } from '@nozbe/watermelondb/decorators'

// Helper function to sanitize JSON data - must be defined before decorators use it
function sanitizeJson(json: any) {
  return json || null
}

// Base model with common fields
export class BaseModel extends Model {
  @readonly @date('created_at') createdAt: Date
  @readonly @date('updated_at') updatedAt: Date
}

// User Model (Patients, Doctors, Pharmacists)
export class User extends BaseModel {
  static table = 'users'

  @field('phone_number') phoneNumber: string
  @field('name') name: string
  @field('role') role: 'patient' | 'doctor' | 'pharmacist'
  @field('email') email?: string
  @field('date_of_birth') dateOfBirth?: string
  @field('gender') gender?: 'male' | 'female' | 'other'
  @field('village') village?: string
  @field('preferred_language') preferredLanguage: string
  @json('emergency_contacts', sanitizeJson) emergencyContacts?: any[]
  @field('profile_picture') profilePicture?: string
  @field('encrypted_data') encryptedData?: string
  @field('last_sync') lastSync?: number
  @field('needs_sync') needsSync: boolean
  @field('created_offline') createdOffline: boolean
  @field('is_active') isActive: boolean

  // Relations
  @children('consultations') consultationsAsPatient?: any
  @children('consultations') consultationsAsDoctor?: any
  @children('health_records') healthRecords?: any
  @children('prescriptions') prescriptionsAsPatient?: any
  @children('prescriptions') prescriptionsAsDoctor?: any
}

// Consultation Model
export class Consultation extends BaseModel {
  static table = 'consultations'
  static associations = {
    users: { type: 'belongs_to' as const, key: 'patient_id' },
    doctors: { type: 'belongs_to' as const, key: 'doctor_id' },
  }

  @field('patient_id') patientId: string
  @field('doctor_id') doctorId: string
  @date('scheduled_at') scheduledAt: Date
  @date('started_at') startedAt?: Date
  @date('ended_at') endedAt?: Date
  @field('consultation_type') consultationType: 'video' | 'audio' | 'offline' | 'text'
  @field('status') status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  @field('chief_complaint') chiefComplaint?: string
  @json('symptoms', sanitizeJson) symptoms?: any[]
  @field('diagnosis') diagnosis?: string
  @field('notes') notes?: string
  @field('prescription_id') prescriptionId?: string
  @json('media_files', sanitizeJson) mediaFiles?: string[]
  @field('urgency_level') urgencyLevel: number
  @field('created_offline') createdOffline: boolean

  // Relations
  @relation('users', 'patient_id') patient?: User
  @relation('users', 'doctor_id') doctor?: User
  @children('health_records') healthRecords?: any
}

// Health Record Model
export class HealthRecord extends BaseModel {
  static table = 'health_records'
  static associations = {
    users: { type: 'belongs_to' as const, key: 'patient_id' },
    consultations: { type: 'belongs_to' as const, key: 'consultation_id' },
  }

  @field('patient_id') patientId: string
  @field('record_type') recordType: 'consultation' | 'prescription' | 'lab_report' | 'vital_signs'
  @field('title') title: string
  @json('content', sanitizeJson) content: any
  @json('attachments', sanitizeJson) attachments?: string[]
  @field('doctor_id') doctorId?: string
  @field('consultation_id') consultationId?: string
  @field('is_critical') isCritical: boolean

  // Relations
  @relation('users', 'patient_id') patient?: User
  @relation('consultations', 'consultation_id') consultation?: Consultation
}

// Prescription Model
export class Prescription extends BaseModel {
  static table = 'prescriptions'
  static associations = {
    users: { type: 'belongs_to' as const, key: 'patient_id' },
    consultations: { type: 'belongs_to' as const, key: 'consultation_id' },
  }

  @field('patient_id') patientId: string
  @field('doctor_id') doctorId: string
  @field('consultation_id') consultationId?: string
  @json('medicines', sanitizeJson) medicines: any[]
  @field('instructions') instructions: string
  @date('valid_until') validUntil: Date
  @field('qr_code_data') qrCodeData?: string
  @field('digital_signature') digitalSignature: string
  @field('pharmacy_id') pharmacyId?: string
  @date('dispensed_at') dispensedAt?: Date

  // Relations
  @relation('users', 'patient_id') patient?: User
  @relation('users', 'doctor_id') doctor?: User
  @relation('consultations', 'consultation_id') consultation?: Consultation
}

// Medicine Model (Offline Database)
export class Medicine extends BaseModel {
  static table = 'medicines'

  @field('generic_name') genericName: string
  @json('brand_names', sanitizeJson) brandNames: string[]
  @field('composition') composition: string
  @json('dosage_forms', sanitizeJson) dosageForms: string[]
  @field('therapeutic_class') therapeuticClass: string
  @field('indications') indications: string
  @field('contraindications') contraindications: string
  @field('side_effects') sideEffects: string
  @json('drug_interactions', sanitizeJson) drugInteractions: string[]
  @field('pediatric_dose') pediatricDose?: string
  @field('adult_dose') adultDose?: string
  @field('pregnancy_category') pregnancyCategory?: string
  @field('last_updated') lastUpdated: number
}

// Pharmacy Inventory Model
export class PharmacyInventory extends BaseModel {
  static table = 'pharmacy_inventory'

  @field('pharmacy_id') pharmacyId: string
  @field('medicine_id') medicineId: string
  @field('medicine_name') medicineName: string
  @field('stock_quantity') stockQuantity: number
  @field('unit_price') unitPrice: number
  @date('expiry_date') expiryDate: Date
  @field('batch_number') batchNumber?: string
  @field('manufacturer') manufacturer?: string
  @field('otp_verified') otpVerified: boolean
  @field('last_updated') lastUpdated: number
  @field('reliability_score') reliabilityScore: number
}

// Symptom Analysis Model
export class SymptomAnalysis extends BaseModel {
  static table = 'symptom_analyses'

  @field('patient_id') patientId: string
  @json('symptoms_list', sanitizeJson) symptomsList: any[]
  @json('vital_signs', sanitizeJson) vitalSigns?: any
  @json('ai_analysis', sanitizeJson) aiAnalysis: any
  @field('urgency_level') urgencyLevel: number
  @json('recommended_actions', sanitizeJson) recommendedActions: string[]
  @json('possible_conditions', sanitizeJson) possibleConditions: string[]
  @field('confidence_score') confidenceScore: number
  @field('analysis_method') analysisMethod: 'offline_ai' | 'groq_api' | 'rule_based'
  @field('requires_doctor') requiresDoctor: boolean

  // Relations
  @relation('users', 'patient_id') patient?: User
}

// Sync Queue Model
export class SyncQueue extends BaseModel {
  static table = 'sync_queue'

  @field('table_name') tableName: string
  @field('record_id') recordId: string
  @field('operation') operation: 'INSERT' | 'UPDATE' | 'DELETE'
  @json('data_payload', sanitizeJson) dataPayload: any
  @field('priority') priority: number
  @field('retry_count') retryCount: number
  @field('max_retries') maxRetries: number
  @date('scheduled_at') scheduledAt?: Date
  @field('estimated_bandwidth') estimatedBandwidth?: number
  @json('dependencies', sanitizeJson) dependencies?: string[]
}

// Medical Knowledge Model
export class MedicalKnowledge extends BaseModel {
  static table = 'medical_knowledge'

  @field('category') category: 'symptoms' | 'conditions' | 'protocols'
  @field('code') code: string
  @field('name') name: string
  @field('description') description: string
  @field('severity_level') severityLevel?: number
  @json('treatment_protocols', sanitizeJson) treatmentProtocols?: any
  @json('emergency_actions', sanitizeJson) emergencyActions?: any
  @json('related_conditions', sanitizeJson) relatedConditions?: string[]
  @field('icd_code') icdCode?: string
  @field('version') version: number
  @field('last_updated') lastUpdated: number
}

// Export all models
export const allModels = [
  User,
  Consultation,
  HealthRecord,
  Prescription,
  Medicine,
  PharmacyInventory,
  SymptomAnalysis,
  SyncQueue,
  MedicalKnowledge,
]