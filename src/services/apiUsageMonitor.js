// API Usage Monitor - Track and limit API calls to prevent quota exhaustion
class ApiUsageMonitor {
  constructor() {
    this.dailyCalls = new Map(); // Track calls per day
    this.hourlyCalls = new Map(); // Track calls per hour
    this.lastReset = new Date();
    this.maxDailyCalls = 2500; // Conservative limit (3000 - 500 buffer)
    this.maxHourlyCalls = 150; // Conservative hourly limit
    this.loadUsageData();
  }

  // Load usage data from localStorage
  loadUsageData() {
    try {
      const stored = localStorage.getItem('apiUsageData');
      if (stored) {
        const data = JSON.parse(stored);
        this.dailyCalls = new Map(data.dailyCalls || []);
        this.hourlyCalls = new Map(data.hourlyCalls || []);
        this.lastReset = new Date(data.lastReset || Date.now());
      }
    } catch (error) {
      console.warn('Failed to load API usage data:', error);
    }
  }

  // Save usage data to localStorage
  saveUsageData() {
    try {
      const data = {
        dailyCalls: Array.from(this.dailyCalls.entries()),
        hourlyCalls: Array.from(this.hourlyCalls.entries()),
        lastReset: this.lastReset.toISOString()
      };
      localStorage.setItem('apiUsageData', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save API usage data:', error);
    }
  }

  // Reset counters if needed
  resetIfNeeded() {
    const now = new Date();
    const daysSinceReset = Math.floor((now - this.lastReset) / (1000 * 60 * 60 * 24));
    
    if (daysSinceReset >= 1) {
      console.log('🔄 Resetting daily API usage counters');
      this.dailyCalls.clear();
      this.hourlyCalls.clear();
      this.lastReset = now;
      this.saveUsageData();
    }
  }

  // Check if we can make an API call
  canMakeCall(apiType = 'general') {
    this.resetIfNeeded();
    
    const today = new Date().toDateString();
    const currentHour = new Date().getHours();
    
    const dailyCount = this.dailyCalls.get(today) || 0;
    const hourlyCount = this.hourlyCalls.get(currentHour) || 0;
    
    const canMakeDaily = dailyCount < this.maxDailyCalls;
    const canMakeHourly = hourlyCount < this.maxHourlyCalls;
    
    return {
      canMake: canMakeDaily && canMakeHourly,
      dailyCount,
      hourlyCount,
      dailyRemaining: this.maxDailyCalls - dailyCount,
      hourlyRemaining: this.maxHourlyCalls - hourlyCount,
      dailyLimit: this.maxDailyCalls,
      hourlyLimit: this.maxHourlyCalls
    };
  }

  // Record an API call
  recordCall(apiType = 'general') {
    this.resetIfNeeded();
    
    const today = new Date().toDateString();
    const currentHour = new Date().getHours();
    
    // Update daily count
    const dailyCount = this.dailyCalls.get(today) || 0;
    this.dailyCalls.set(today, dailyCount + 1);
    
    // Update hourly count
    const hourlyCount = this.hourlyCalls.get(currentHour) || 0;
    this.hourlyCalls.set(currentHour, hourlyCount + 1);
    
    this.saveUsageData();
    
    // Log usage if approaching limits
    const usage = this.canMakeCall(apiType);
    if (usage.dailyRemaining < 100) {
      console.warn(`⚠️ API Usage Warning: Only ${usage.dailyRemaining} daily calls remaining`);
    }
    if (usage.hourlyRemaining < 20) {
      console.warn(`⚠️ API Usage Warning: Only ${usage.hourlyRemaining} hourly calls remaining`);
    }
  }

  // Get current usage statistics
  getUsageStats() {
    this.resetIfNeeded();
    
    const today = new Date().toDateString();
    const currentHour = new Date().getHours();
    
    const dailyCount = this.dailyCalls.get(today) || 0;
    const hourlyCount = this.hourlyCalls.get(currentHour) || 0;
    
    return {
      daily: {
        used: dailyCount,
        remaining: this.maxDailyCalls - dailyCount,
        limit: this.maxDailyCalls,
        percentage: (dailyCount / this.maxDailyCalls) * 100
      },
      hourly: {
        used: hourlyCount,
        remaining: this.maxHourlyCalls - hourlyCount,
        limit: this.maxHourlyCalls,
        percentage: (hourlyCount / this.maxHourlyCalls) * 100
      },
      lastReset: this.lastReset
    };
  }

  // Check if we should skip API calls due to high usage
  shouldSkipApiCall(apiType = 'general') {
    const usage = this.canMakeCall(apiType);
    
    // Skip if we're at 90% of daily limit
    if (usage.dailyCount >= this.maxDailyCalls * 0.9) {
      console.log('🚫 Skipping API call: Daily limit at 90%');
      return true;
    }
    
    // Skip if we're at 80% of hourly limit
    if (usage.hourlyCount >= this.maxHourlyCalls * 0.8) {
      console.log('🚫 Skipping API call: Hourly limit at 80%');
      return true;
    }
    
    return false;
  }

  // Get usage warning message
  getUsageWarning() {
    const stats = this.getUsageStats();
    
    if (stats.daily.percentage >= 90) {
      return `High API usage: ${stats.daily.used}/${stats.daily.limit} daily calls used (${stats.daily.percentage.toFixed(1)}%)`;
    }
    
    if (stats.hourly.percentage >= 80) {
      return `High hourly usage: ${stats.hourly.used}/${stats.hourly.limit} hourly calls used (${stats.hourly.percentage.toFixed(1)}%)`;
    }
    
    return null;
  }
}

// Create singleton instance
export const apiUsageMonitor = new ApiUsageMonitor();

// Export for use in other services
export default apiUsageMonitor;
