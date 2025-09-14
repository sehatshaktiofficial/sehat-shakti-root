// WatermelonDB Schema for Lok Sehat - Offline-First Medical Database
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const databaseSchema = appSchema({
  version: 1,
  tables: [
    // Users table (Patients, Doctors, Pharmacists)
    tableSchema({
      name: 'users',
      columns: [
        { name: 'phone_number', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'role', type: 'string', isIndexed: true }, // 'patient', 'doctor', 'pharmacist'
        { name: 'email', type: 'string', isOptional: true },
        { name: 'date_of_birth', type: 'string', isOptional: true },
        { name: 'gender', type: 'string', isOptional: true },
        { name: 'village', type: 'string', isOptional: true },
        { name: 'preferred_language', type: 'string' },
        { name: 'emergency_contacts', type: 'string', isOptional: true }, // JSON
        { name: 'profile_picture', type: 'string', isOptional: true },
        { name: 'encrypted_data', type: 'string', isOptional: true },
        { name: 'last_sync', type: 'number', isOptional: true },
        { name: 'needs_sync', type: 'boolean' },
        { name: 'created_offline', type: 'boolean' },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Consultations table
    tableSchema({
      name: 'consultations',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'doctor_id', type: 'string', isIndexed: true },
        { name: 'scheduled_at', type: 'number' },
        { name: 'started_at', type: 'number', isOptional: true },
        { name: 'ended_at', type: 'number', isOptional: true },
        { name: 'consultation_type', type: 'string' }, // 'video', 'audio', 'offline', 'text'
        { name: 'status', type: 'string' }, // 'scheduled', 'in_progress', 'completed', 'cancelled'
        { name: 'chief_complaint', type: 'string', isOptional: true },
        { name: 'symptoms', type: 'string', isOptional: true }, // JSON
        { name: 'diagnosis', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'prescription_id', type: 'string', isOptional: true },
        { name: 'media_files', type: 'string', isOptional: true }, // JSON array
        { name: 'urgency_level', type: 'number' }, // 1-10 scale
        { name: 'sync_status', type: 'string' }, // 'pending', 'syncing', 'synced', 'conflict'
        { name: 'created_offline', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Health Records table
    tableSchema({
      name: 'health_records',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'record_type', type: 'string' }, // 'consultation', 'prescription', 'lab_report', 'vital_signs'
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' }, // JSON content
        { name: 'attachments', type: 'string', isOptional: true }, // JSON array
        { name: 'doctor_id', type: 'string', isOptional: true },
        { name: 'consultation_id', type: 'string', isOptional: true },
        { name: 'is_critical', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Prescriptions table
    tableSchema({
      name: 'prescriptions',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'doctor_id', type: 'string', isIndexed: true },
        { name: 'consultation_id', type: 'string', isOptional: true },
        { name: 'medicines', type: 'string' }, // JSON array
        { name: 'instructions', type: 'string' },
        { name: 'valid_until', type: 'number' },
        { name: 'qr_code_data', type: 'string', isOptional: true },
        { name: 'digital_signature', type: 'string' },
        { name: 'pharmacy_id', type: 'string', isOptional: true },
        { name: 'dispensed_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Medicine Database (offline cache)
    tableSchema({
      name: 'medicines',
      columns: [
        { name: 'generic_name', type: 'string', isIndexed: true },
        { name: 'brand_names', type: 'string' }, // JSON array
        { name: 'composition', type: 'string' },
        { name: 'dosage_forms', type: 'string' }, // JSON array
        { name: 'therapeutic_class', type: 'string' },
        { name: 'indications', type: 'string' },
        { name: 'contraindications', type: 'string' },
        { name: 'side_effects', type: 'string' },
        { name: 'drug_interactions', type: 'string' }, // JSON array
        { name: 'pediatric_dose', type: 'string', isOptional: true },
        { name: 'adult_dose', type: 'string', isOptional: true },
        { name: 'pregnancy_category', type: 'string', isOptional: true },
        { name: 'last_updated', type: 'number' },
      ]
    }),

    // Pharmacy Inventory table
    tableSchema({
      name: 'pharmacy_inventory',
      columns: [
        { name: 'pharmacy_id', type: 'string', isIndexed: true },
        { name: 'medicine_id', type: 'string', isIndexed: true },
        { name: 'medicine_name', type: 'string' },
        { name: 'stock_quantity', type: 'number' },
        { name: 'unit_price', type: 'number' },
        { name: 'expiry_date', type: 'number' },
        { name: 'batch_number', type: 'string', isOptional: true },
        { name: 'manufacturer', type: 'string', isOptional: true },
        { name: 'otp_verified', type: 'boolean' },
        { name: 'last_updated', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'reliability_score', type: 'number' }, // 0-1 based on data freshness
      ]
    }),

    // Symptom Analysis table
    tableSchema({
      name: 'symptom_analyses',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'symptoms_list', type: 'string' }, // JSON array
        { name: 'vital_signs', type: 'string', isOptional: true }, // JSON
        { name: 'ai_analysis', type: 'string' }, // JSON result
        { name: 'urgency_level', type: 'number' },
        { name: 'recommended_actions', type: 'string' }, // JSON array
        { name: 'possible_conditions', type: 'string' }, // JSON array
        { name: 'confidence_score', type: 'number' },
        { name: 'analysis_method', type: 'string' }, // 'offline_ai', 'groq_api', 'rule_based'
        { name: 'requires_doctor', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ]
    }),

    // Sync Queue table for offline operations
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string', isIndexed: true },
        { name: 'record_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string' }, // 'INSERT', 'UPDATE', 'DELETE'
        { name: 'data_payload', type: 'string' }, // JSON data
        { name: 'priority', type: 'number' }, // 1=critical, 2=high, 3=normal
        { name: 'retry_count', type: 'number' },
        { name: 'max_retries', type: 'number' },
        { name: 'scheduled_at', type: 'number', isOptional: true },
        { name: 'estimated_bandwidth', type: 'number', isOptional: true },
        { name: 'dependencies', type: 'string', isOptional: true }, // JSON array
        { name: 'created_at', type: 'number' },
      ]
    }),

    // Offline Medical Knowledge Base
    tableSchema({
      name: 'medical_knowledge',
      columns: [
        { name: 'category', type: 'string', isIndexed: true }, // 'symptoms', 'conditions', 'protocols'
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'severity_level', type: 'number', isOptional: true },
        { name: 'treatment_protocols', type: 'string', isOptional: true }, // JSON
        { name: 'emergency_actions', type: 'string', isOptional: true }, // JSON
        { name: 'related_conditions', type: 'string', isOptional: true }, // JSON
        { name: 'icd_code', type: 'string', isOptional: true },
        { name: 'version', type: 'number' },
        { name: 'last_updated', type: 'number' },
      ]
    }),
  ]
})