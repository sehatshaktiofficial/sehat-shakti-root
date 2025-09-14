const { createClient } = require('@supabase/supabase-js');
const logger = require('../services/logger');

class DatabaseService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    this.testConnection();
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('doctors')
        .select('count', { count: 'exact', head: true });

      if (error) {
        logger.error('Database connection test failed:', error);
      } else {
        logger.info('Database connection established successfully');
      }
    } catch (error) {
      logger.error('Database connection error:', error);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from('doctors')
        .select('count', { count: 'exact', head: true });

      return {
        status: error ? 'unhealthy' : 'healthy',
        error: error?.message || null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Transaction wrapper
  async transaction(operations) {
    // Supabase doesn't have explicit transactions in the JS client
    // so we'll implement a simple rollback pattern
    const rollbackOperations = [];
    
    try {
      for (const operation of operations) {
        const result = await operation.execute();
        if (operation.rollback) {
          rollbackOperations.push(operation.rollback(result));
        }
      }
      return { success: true };
    } catch (error) {
      logger.error('Transaction failed, attempting rollback:', error);
      
      // Execute rollback operations in reverse order
      for (const rollback of rollbackOperations.reverse()) {
        try {
          await rollback();
        } catch (rollbackError) {
          logger.error('Rollback operation failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }
}

module.exports = { supabase: new DatabaseService().supabase };