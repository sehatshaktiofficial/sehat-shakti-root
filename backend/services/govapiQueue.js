// services/govApiQueue.js
const Queue = require('bull');
const axios = require('axios');
const logger = require('./logger');
const { cache } = require('./cache');

class GovApiQueueService {
  constructor() {
    this.queue = new Queue('government verification', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    this.setupQueue();
    this.setupProcessors();
  }

  setupQueue() {
    // Rate limiting: max 10 jobs per minute to avoid overwhelming gov server
    this.queue.process('verify-medical-id', 1, this.processVerification.bind(this));
    
    // Clean completed jobs after 24 hours
    this.queue.clean(24 * 60 * 60 * 1000, 'completed');
    this.queue.clean(24 * 60 * 60 * 1000, 'failed');
  }

  setupProcessors() {
    this.queue.on('completed', (job, result) => {
      logger.info(`Medical verification completed for job ${job.id}:`, result.doctorName);
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Medical verification failed for job ${job.id}:`, err.message);
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Medical verification stalled for job ${job.id}`);
    });
  }

  async processVerification(job) {
    const { registrationNo, smcId, doctorName, requestId } = job.data;
    
    try {
      // Add delay to prevent overwhelming government server
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await axios.get(process.env.GOV_API_BASE_URL, {
        params: {
          service: "getPaginatedDoctor",
          draw: 1,
          start: 0,
          length: 1,
          smcId: smcId
        },
        headers: {
          'User-Agent': 'TelemedNabha/1.0',
          'Accept': 'application/json'
        },
        timeout: 15000,
        maxRedirects: 3
      });

      const result = this.parseGovResponse(response.data, doctorName, registrationNo);
      
      // Cache the result for 1 hour
      const cacheKey = `medid_${registrationNo}_${smcId}`;
      cache.set(cacheKey, result, 3600);

      // Store result in cache with requestId for retrieval
      const resultKey = `verification_result_${requestId}`;
      cache.set(resultKey, result, 600); // 10 minutes

      return result;

    } catch (error) {
      logger.error(`Government API error for ${registrationNo}:`, error.message);
      
      // Store error result
      const errorResult = {
        isValid: false,
        error: 'verification_failed',
        message: 'Unable to verify with government database',
        timestamp: new Date().toISOString()
      };

      const resultKey = `verification_result_${requestId}`;
      cache.set(resultKey, errorResult, 600);

      throw error;
    }
  }

  parseGovResponse(govData, doctorName, registrationNo) {
    try {
      if (!govData || !govData.data || govData.data.length === 0) {
        return {
          isValid: false,
          error: 'not_found',
          message: 'Doctor not found in government records'
        };
      }

      const doctorRecord = govData.data[0];
      const [id, year, regNo, council, name, fatherName, viewLink] = doctorRecord;

      // Validate registration number and name match
      const isRegNoValid = regNo === registrationNo;
      const isNameValid = this.fuzzyNameMatch(name.toLowerCase().trim(), doctorName.toLowerCase().trim());

      return {
        isValid: isRegNoValid && isNameValid,
        doctorDetails: {
          registrationNumber: regNo,
          registrationYear: year,
          doctorName: name,
          fatherName: fatherName,
          council: council,
          governmentId: id
        },
        validation: {
          registrationNumberMatch: isRegNoValid,
          nameMatch: isNameValid
        },
        verifiedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error parsing government response:', error);
      return {
        isValid: false,
        error: 'parse_error',
        message: 'Error processing government response'
      };
    }
  }

  fuzzyNameMatch(govName, inputName) {
    // Remove common prefixes and suffixes
    const cleanGovName = govName.replace(/^(dr\.?|doctor)\s*/i, '').trim();
    const cleanInputName = inputName.replace(/^(dr\.?|doctor)\s*/i, '').trim();

    // Exact match
    if (cleanGovName === cleanInputName) return true;

    // Check if names contain each other
    if (cleanGovName.includes(cleanInputName) || cleanInputName.includes(cleanGovName)) {
      return true;
    }

    // Split and check word matches
    const govWords = cleanGovName.split(/\s+/);
    const inputWords = cleanInputName.split(/\s+/);

    let matchCount = 0;
    for (const inputWord of inputWords) {
      if (inputWord.length > 2 && govWords.some(govWord => 
        govWord.includes(inputWord) || inputWord.includes(govWord)
      )) {
        matchCount++;
      }
    }

    // At least 50% of words should match
    return (matchCount / inputWords.length) >= 0.5;
  }

  async addVerificationJob(registrationNo, smcId, doctorName) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = await this.queue.add('verify-medical-id', {
      registrationNo,
      smcId,
      doctorName,
      requestId,
      timestamp: new Date().toISOString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: 5,
      removeOnFail: 5
    });

    return { jobId: job.id, requestId };
  }

  async getVerificationResult(requestId) {
    const resultKey = `verification_result_${requestId}`;
    return cache.get(resultKey);
  }

  async getQueueStatus() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      health: waiting.length < 50 ? 'healthy' : 'overloaded'
    };
  }

  async clearQueue() {
    await this.queue.clean(0, 'waiting');
    await this.queue.clean(0, 'active');
    await this.queue.clean(0, 'completed');
    await this.queue.clean(0, 'failed');
  }
}

module.exports = new GovApiQueueService();