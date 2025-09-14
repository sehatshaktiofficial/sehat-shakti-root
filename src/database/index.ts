// Database initialization for Lok Sehat
import { Database } from '@nozbe/watermelondb'
// Use SQLite adapter for React Native
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import { databaseSchema } from './schema'
import { allModels } from './models'
import { Platform } from 'react-native'

// Create adapter with safe fallback to LokiJS when native SQLite is unavailable (e.g., Expo Go/Web)
let adapter: any
try {
  if (Platform.OS === 'web') {
    throw new Error('Forcing LokiJS on web platform')
  }
  adapter = new SQLiteAdapter({
    schema: databaseSchema,
    // Enable JSI for better performance in React Native
    jsi: true,
    // Disable experimental features for stability
    onSetUpError: error => {
      console.error('Database setup error (SQLiteAdapter):', error)
    }
  })
} catch (e) {
  console.warn('SQLiteAdapter unavailable, falling back to LokiJS adapter:', e)
  adapter = new (LokiJSAdapter as any)({
    schema: databaseSchema,
    // LokiJS adapter requires these flags; in React Native we avoid web worker & IndexedDB
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    onSetUpError: (error: any) => {
      console.error('Database setup error (LokiJSAdapter):', error)
    }
  })
}

// Initialize the database
export const database = new Database({
  adapter,
  modelClasses: allModels as any,
})

// Database service for common operations
export class DatabaseService {
  static database = database

  // Initialize database with default data
  static async initializeDatabase() {
    try {
      console.log('Initializing Lok Sehat database...')
      
      // Check if medical knowledge base exists
      const medicalKnowledge = await database.collections
        .get('medical_knowledge')
        .query()
        .fetch()

      if (medicalKnowledge.length === 0) {
        await this.seedMedicalKnowledge()
        console.log('Medical knowledge base seeded successfully')
      }

      // Check if medicine database exists
      const medicines = await database.collections
        .get('medicines')
        .query()
        .fetch()

      if (medicines.length === 0) {
        await this.seedMedicineDatabase()
        console.log('Medicine database seeded successfully')
      }

      console.log('Database initialization completed')
      return true
    } catch (error) {
      console.error('Database initialization failed:', error)
      return false
    }
  }

  // Seed medical knowledge base
  static async seedMedicalKnowledge() {
    const medicalKnowledgeData = [
      // Common symptoms
      {
        category: 'symptoms',
        code: 'fever',
        name: 'Fever',
        description: 'Elevated body temperature above normal (98.6°F/37°C)',
        severity_level: 5,
        treatment_protocols: JSON.stringify([
          'Rest and hydration',
          'Paracetamol 500mg every 6 hours',
          'Monitor temperature every 4 hours',
          'Seek medical attention if fever > 102°F'
        ]),
        emergency_actions: JSON.stringify([
          'If fever > 104°F, seek immediate medical attention',
          'If accompanied by difficulty breathing, call emergency'
        ]),
        version: 1,
        last_updated: Date.now()
      },
      {
        category: 'symptoms',
        code: 'headache',
        name: 'Headache',
        description: 'Pain in the head or upper neck',
        severity_level: 3,
        treatment_protocols: JSON.stringify([
          'Rest in quiet, dark room',
          'Paracetamol or ibuprofen',
          'Adequate hydration',
          'Cold or warm compress'
        ]),
        emergency_actions: JSON.stringify([
          'Sudden severe headache - seek immediate medical attention',
          'Headache with fever and neck stiffness - possible meningitis'
        ]),
        version: 1,
        last_updated: Date.now()
      },
      {
        category: 'symptoms',
        code: 'chest_pain',
        name: 'Chest Pain',
        description: 'Pain or discomfort in the chest area',
        severity_level: 9,
        treatment_protocols: JSON.stringify([
          'Do not ignore chest pain',
          'Immediate medical evaluation required',
          'Rest and avoid exertion'
        ]),
        emergency_actions: JSON.stringify([
          'Call emergency services immediately',
          'Chew aspirin if not allergic',
          'Stay calm and avoid physical activity'
        ]),
        version: 1,
        last_updated: Date.now()
      },
      {
        category: 'symptoms',
        code: 'difficulty_breathing',
        name: 'Difficulty Breathing',
        description: 'Shortness of breath or breathing problems',
        severity_level: 9,
        treatment_protocols: JSON.stringify([
          'Immediate medical attention required',
          'Sit upright to ease breathing',
          'Loosen tight clothing'
        ]),
        emergency_actions: JSON.stringify([
          'Call emergency services immediately',
          'If severe, consider ambulance',
          'Check for allergic reactions'
        ]),
        version: 1,
        last_updated: Date.now()
      },

      // Common conditions
      {
        category: 'conditions',
        code: 'common_cold',
        name: 'Common Cold',
        description: 'Viral infection of the upper respiratory tract',
        severity_level: 2,
        treatment_protocols: JSON.stringify([
          'Rest and plenty of fluids',
          'Paracetamol for aches and fever',
          'Warm salt water gargling',
          'Steam inhalation'
        ]),
        related_conditions: JSON.stringify(['fever', 'headache', 'cough']),
        icd_code: 'J00',
        version: 1,
        last_updated: Date.now()
      },
      {
        category: 'conditions',
        code: 'hypertension',
        name: 'High Blood Pressure',
        description: 'Elevated blood pressure (>140/90 mmHg)',
        severity_level: 7,
        treatment_protocols: JSON.stringify([
          'Regular blood pressure monitoring',
          'Low salt diet',
          'Regular exercise',
          'Medication as prescribed',
          'Weight management'
        ]),
        emergency_actions: JSON.stringify([
          'BP > 180/120 - seek immediate medical attention',
          'Severe headache with high BP - emergency'
        ]),
        icd_code: 'I10',
        version: 1,
        last_updated: Date.now()
      },

      // Emergency protocols
      {
        category: 'protocols',
        code: 'cardiac_emergency',
        name: 'Cardiac Emergency Protocol',
        description: 'Emergency response for suspected heart attack',
        severity_level: 10,
        emergency_actions: JSON.stringify([
          'Call emergency services immediately (108)',
          'Give aspirin if not allergic (300mg chewed)',
          'Keep patient calm and seated',
          'Loosen tight clothing',
          'Monitor breathing and pulse',
          'Be prepared for CPR if needed'
        ]),
        version: 1,
        last_updated: Date.now()
      },
      {
        category: 'protocols',
        code: 'respiratory_emergency',
        name: 'Respiratory Emergency Protocol',
        description: 'Emergency response for severe breathing difficulties',
        severity_level: 10,
        emergency_actions: JSON.stringify([
          'Call emergency services immediately',
          'Help patient sit upright',
          'Remove any airway obstructions',
          'Loosen tight clothing around neck/chest',
          'Stay with patient and monitor breathing',
          'Be ready to perform rescue breathing'
        ]),
        version: 1,
        last_updated: Date.now()
      }
    ]

    await database.write(async () => {
      for (const data of medicalKnowledgeData) {
        await database.collections
          .get('medical_knowledge')
          .create((record: any) => {
            Object.assign(record, data)
          })
      }
    })
  }

  // Seed medicine database with common medicines
  static async seedMedicineDatabase() {
    const medicinesData = [
      {
        generic_name: 'Paracetamol',
        brand_names: JSON.stringify(['Tylenol', 'Calpol', 'Dolo', 'Panadol']),
        composition: 'Acetaminophen',
        dosage_forms: JSON.stringify(['Tablet', 'Syrup', 'Injection']),
        therapeutic_class: 'Analgesic, Antipyretic',
        indications: 'Fever, pain relief, headache',
        contraindications: 'Severe liver disease, allergy to paracetamol',
        side_effects: 'Generally safe, rare: skin rash, liver damage with overdose',
        drug_interactions: JSON.stringify(['Warfarin', 'Alcohol']),
        pediatric_dose: '10-15 mg/kg every 4-6 hours',
        adult_dose: '500-1000mg every 4-6 hours, max 4g/day',
        pregnancy_category: 'B',
        last_updated: Date.now()
      },
      {
        generic_name: 'Ibuprofen',
        brand_names: JSON.stringify(['Advil', 'Brufen', 'Combiflam']),
        composition: 'Ibuprofen',
        dosage_forms: JSON.stringify(['Tablet', 'Syrup', 'Gel']),
        therapeutic_class: 'NSAID, Anti-inflammatory',
        indications: 'Pain, inflammation, fever',
        contraindications: 'Peptic ulcer, severe heart failure, allergy to NSAIDs',
        side_effects: 'Stomach upset, heartburn, dizziness, increased bleeding risk',
        drug_interactions: JSON.stringify(['Warfarin', 'ACE inhibitors', 'Methotrexate']),
        pediatric_dose: '5-10 mg/kg every 6-8 hours',
        adult_dose: '200-400mg every 4-6 hours, max 1.2g/day',
        pregnancy_category: 'C (D in third trimester)',
        last_updated: Date.now()
      },
      {
        generic_name: 'Amoxicillin',
        brand_names: JSON.stringify(['Amoxil', 'Augmentin', 'Mox']),
        composition: 'Amoxicillin',
        dosage_forms: JSON.stringify(['Capsule', 'Syrup', 'Injection']),
        therapeutic_class: 'Antibiotic, Penicillin',
        indications: 'Bacterial infections, respiratory tract infections',
        contraindications: 'Allergy to penicillin, mononucleosis',
        side_effects: 'Nausea, diarrhea, skin rash, allergic reactions',
        drug_interactions: JSON.stringify(['Oral contraceptives', 'Methotrexate']),
        pediatric_dose: '20-40 mg/kg/day in divided doses',
        adult_dose: '250-500mg every 8 hours',
        pregnancy_category: 'B',
        last_updated: Date.now()
      },
      {
        generic_name: 'Omeprazole',
        brand_names: JSON.stringify(['Prilosec', 'Omez', 'Gastrogyl']),
        composition: 'Omeprazole',
        dosage_forms: JSON.stringify(['Capsule', 'Injection']),
        therapeutic_class: 'Proton Pump Inhibitor',
        indications: 'Acid reflux, peptic ulcer, GERD',
        contraindications: 'Allergy to omeprazole',
        side_effects: 'Headache, nausea, diarrhea, abdominal pain',
        drug_interactions: JSON.stringify(['Clopidogrel', 'Warfarin', 'Phenytoin']),
        pediatric_dose: '0.5-1 mg/kg once daily',
        adult_dose: '20-40mg once daily before breakfast',
        pregnancy_category: 'C',
        last_updated: Date.now()
      },
      {
        generic_name: 'Metformin',
        brand_names: JSON.stringify(['Glucophage', 'Glycomet', 'Diabex']),
        composition: 'Metformin Hydrochloride',
        dosage_forms: JSON.stringify(['Tablet', 'Extended Release Tablet']),
        therapeutic_class: 'Antidiabetic, Biguanide',
        indications: 'Type 2 diabetes mellitus',
        contraindications: 'Kidney disease, liver disease, heart failure',
        side_effects: 'Nausea, diarrhea, metallic taste, vitamin B12 deficiency',
        drug_interactions: JSON.stringify(['Alcohol', 'Contrast dyes', 'Furosemide']),
        pediatric_dose: 'Not recommended under 10 years',
        adult_dose: '500-850mg twice daily with meals',
        pregnancy_category: 'B',
        last_updated: Date.now()
      }
    ]

    await database.write(async () => {
      for (const data of medicinesData) {
        await database.collections
          .get('medicines')
          .create((record: any) => {
            Object.assign(record, data)
          })
      }
    })
  }

  // Clear all data (for development/testing)
  static async clearAllData() {
    await database.write(async () => {
      await database.unsafeResetDatabase()
    })
  }

  // Get database statistics
  static async getDatabaseStats() {
    const stats = {
      users: await database.collections.get('users').query().fetchCount(),
      consultations: await database.collections.get('consultations').query().fetchCount(),
      prescriptions: await database.collections.get('prescriptions').query().fetchCount(),
      medicines: await database.collections.get('medicines').query().fetchCount(),
      healthRecords: await database.collections.get('health_records').query().fetchCount(),
      medicalKnowledge: await database.collections.get('medical_knowledge').query().fetchCount(),
    }
    return stats
  }
}

export default database