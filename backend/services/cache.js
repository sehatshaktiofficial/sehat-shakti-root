const NodeCache = require('node-cache');
const logger = require('./logger');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes default
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.cache.on('set', (key, value) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      logger.debug(`Cache DELETE: ${key}`);
    });

    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });
  }

  set(key, value, ttl) {
    try {
      return this.cache.set(key, value, ttl);
    } catch (error) {
      logger.error('Cache SET error:', error);
      return false;
    }
  }

  get(key) {
    try {
      return this.cache.get(key);
    } catch (error) {
      logger.error('Cache GET error:', error);
      return undefined;
    }
  }

  del(key) {
    try {
      return this.cache.del(key);
    } catch (error) {
      logger.error('Cache DELETE error:', error);
      return 0;
    }
  }

  has(key) {
    try {
      return this.cache.has(key);
    } catch (error) {
      logger.error('Cache HAS error:', error);
      return false;
    }
  }

  flush() {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache FLUSH error:', error);
      return false;
    }
  }

  getStats() {
    try {
      return this.cache.getStats();
    } catch (error) {
      logger.error('Cache STATS error:', error);
      return {};
    }
  }

  keys() {
    try {
      return this.cache.keys();
    } catch (error) {
      logger.error('Cache KEYS error:', error);
      return [];
    }
  }

  // Utility methods for common patterns
  getOrSet(key, fetchFunction, ttl = 600) {
    try {
      let value = this.get(key);
      
      if (value === undefined) {
        value = fetchFunction();
        this.set(key, value, ttl);
      }
      
      return value;
    } catch (error) {
      logger.error('Cache GET_OR_SET error:', error);
      return undefined;
    }
  }

  increment(key, delta = 1) {
    try {
      const current = this.get(key) || 0;
      const newValue = current + delta;
      this.set(key, newValue);
      return newValue;
    } catch (error) {
      logger.error('Cache INCREMENT error:', error);
      return 0;
    }
  }

  setMultiple(obj, ttl) {
    try {
      return this.cache.mset(obj, ttl);
    } catch (error) {
      logger.error('Cache SET_MULTIPLE error:', error);
      return false;
    }
  }

  getMultiple(keys) {
    try {
      return this.cache.mget(keys);
    } catch (error) {
      logger.error('Cache GET_MULTIPLE error:', error);
      return {};
    }
  }
}

module.exports = { cache: new CacheService() };