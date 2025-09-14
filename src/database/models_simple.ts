// Simplified Database Models for LokSehat - No Decorators
import { Model } from '@nozbe/watermelondb'

// User Model - Handles Patients, Doctors, and Pharmacists
export class User extends Model {
  static table = 'users'
  
  static associations = {
    consultations_as_patient: { type: 'has_many' as const, foreignKey: 'patient_id' },
    consultations_as_doctor: { type: 'has_many' as const, foreignKey: 'doctor_id' },
    health_records: { type: 'has_many' as const, foreignKey: 'patient_id' },
    symptom_analyses: { type: 'has_many' as const, foreignKey: 'patient_id' },
  }

  // Basic properties - no decorators
  name!: string
  email!: string
  role!: 'patient' | 'doctor' | 'pharmacist' | 'admin'
  phoneNumber?: string
  profilePicture?: string
  specialization?: string
  licenseNumber?: string
  isVerified!: boolean
  isOnline!: boolean
  lastSeen?: number
  preferences?: any
  emergencyContact?: any
  locationData?: any
  dateOfBirth?: Date
  gender?: string
  createdAt?: Date
  updatedAt?: Date
}

// Consultation Model
export class Consultation extends Model {
  static table = 'consultations'
  
  static associations = {
    patient: { type: 'belongs_to' as const, key: 'patient_id' },
    doctor: { type: 'belongs_to' as const, key: 'doctor_id' },
  }

  patientId!: string
  doctorId!: string
  status!: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  type!: 'video' | 'audio' | 'chat' | 'emergency'
  scheduledAt?: Date
  startedAt?: Date
  endedAt?: Date
  symptoms?: string
  diagnosis?: string
  notes?: string
  prescriptionId?: string
  mediaFiles?: string[]
  urgencyLevel!: number
  createdOffline!: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Health Record Model
export class HealthRecord extends Model {
  static table = 'health_records'
  
  static associations = {
    patient: { type: 'belongs_to' as const, key: 'patient_id' },
    consultation: { type: 'belongs_to' as const, key: 'consultation_id' },
  }

  patientId!: string
  type!: 'vitals' | 'lab_results' | 'prescription' | 'diagnosis' | 'vaccination'
  title!: string
  data?: any
  attachments?: string[]
  recordDate?: Date
  consultationId?: string
  isCritical!: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Prescription Model
export class Prescription extends Model {
  static table = 'prescriptions'
  
  patientId!: string
  doctorId!: string
  consultationId?: string
  medicines!: any[]
  instructions?: string
  validUntil?: Date
  isDispensed!: boolean
  dispensedBy?: string
  dispensedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

// Medicine Model
export class Medicine extends Model {
  static table = 'medicines'
  
  name!: string
  genericName?: string
  brand?: string
  category!: string
  dosageForm!: string
  strength?: string
  indication?: string
  contraindications?: string[]
  sideEffects?: string[]
  dosageInstructions?: any
  price?: number
  availability!: 'available' | 'limited' | 'out_of_stock'
  requiresPrescription!: boolean
  manufacturer?: string
  expiryWarningDays?: number
  barcodeData?: string
  createdAt?: Date
  updatedAt?: Date
}

// Export all models
export const allModels = [
  User,
  Consultation,
  HealthRecord,
  Prescription,
  Medicine,
]