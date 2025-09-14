// State Medical Council Service
// Manages SMC data and provides verification services

class SMCService {
  constructor() {
    this.smcData = {
      // Punjab State Medical Council
      18: {
        id: 18,
        name: 'Punjab State Medical Council',
        state: 'Punjab',
        code: 'PSMC',
        website: 'https://psmc.punjab.gov.in',
        address: 'SCO 1-2, Sector 17-C, Chandigarh, 160017',
        phone: '+91-172-2700123',
        email: 'info@psmc.punjab.gov.in',
        isActive: true,
        verificationSupported: true
      }
      // Additional SMCs can be added here in the future
    };
  }

  // Get all available SMCs
  getAllSMCs() {
    return Object.values(this.smcData).filter(smc => smc.isActive);
  }

  // Get SMC by ID
  getSMCById(smcId) {
    return this.smcData[smcId] || null;
  }

  // Get SMCs by state
  getSMCsByState(state) {
    return Object.values(this.smcData).filter(smc => 
      smc.isActive && smc.state.toLowerCase() === state.toLowerCase()
    );
  }

  // Validate SMC ID
  isValidSMCId(smcId) {
    return this.smcData[smcId] && this.smcData[smcId].isActive;
  }

  // Get SMC verification status
  getVerificationStatus(smcId) {
    const smc = this.getSMCById(smcId);
    if (!smc) {
      return {
        supported: false,
        message: 'SMC not found or inactive'
      };
    }

    return {
      supported: smc.verificationSupported,
      message: smc.verificationSupported 
        ? 'Verification supported' 
        : 'Verification not yet supported for this SMC',
      smc: smc
    };
  }

  // Format SMC data for frontend
  formatSMCForFrontend(smc) {
    return {
      id: smc.id,
      name: smc.name,
      state: smc.state,
      code: smc.code,
      website: smc.website,
      address: smc.address,
      phone: smc.phone,
      email: smc.email
    };
  }

  // Get formatted list for dropdown
  getSMCListForDropdown() {
    return this.getAllSMCs().map(smc => ({
      value: smc.id,
      label: `${smc.name} (${smc.state})`,
      code: smc.code,
      state: smc.state
    }));
  }
}

module.exports = new SMCService();
