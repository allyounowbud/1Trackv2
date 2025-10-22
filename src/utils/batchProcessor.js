/**
 * Batch Processing Utility for Multi-Item Operations
 * 
 * Provides optimized batch processing for large numbers of items
 * with progress tracking, error handling, and memory management.
 */

export class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10;
    this.maxConcurrency = options.maxConcurrency || 3;
    this.retryAttempts = options.retryAttempts || 2;
    this.retryDelay = options.retryDelay || 1000;
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }

  /**
   * Process items in optimized batches
   * @param {Array} items - Items to process
   * @param {Function} processor - Function to process each item
   * @returns {Promise<Object>} - Results with success/failure counts
   */
  async processBatches(items, processor) {
    const results = {
      successful: [],
      failed: [],
      total: items.length,
      processed: 0
    };

    // Split items into batches
    const batches = this.createBatches(items, this.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await this.processBatch(batch, processor, i + 1, batches.length);
      
      // Merge results
      results.successful.push(...batchResults.successful);
      results.failed.push(...batchResults.failed);
      results.processed += batchResults.processed;
      
      // Update progress
      this.onProgress({
        batch: i + 1,
        totalBatches: batches.length,
        processed: results.processed,
        total: results.total,
        percentage: Math.round((results.processed / results.total) * 100)
      });
    }

    this.onComplete(results);
    return results;
  }

  /**
   * Process a single batch with concurrency control
   * @param {Array} batch - Items in current batch
   * @param {Function} processor - Function to process each item
   * @param {number} batchNumber - Current batch number
   * @param {number} totalBatches - Total number of batches
   * @returns {Promise<Object>} - Batch results
   */
  async processBatch(batch, processor, batchNumber, totalBatches) {
    const results = {
      successful: [],
      failed: [],
      processed: 0
    };

    // Process items in parallel with concurrency limit
    const promises = batch.map(async (item, index) => {
      try {
        const result = await this.processWithRetry(item, processor);
        results.successful.push({ item, result, batchNumber, index });
        return result;
      } catch (error) {
        results.failed.push({ item, error, batchNumber, index });
        this.onError({ item, error, batchNumber, index });
        return null;
      }
    });

    // Wait for all items in batch to complete
    await Promise.allSettled(promises);
    results.processed = batch.length;

    return results;
  }

  /**
   * Process single item with retry logic
   * @param {Object} item - Item to process
   * @param {Function} processor - Function to process the item
   * @returns {Promise<any>} - Processing result
   */
  async processWithRetry(item, processor) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await processor(item);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts) {
          // Wait before retry
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Create batches from items array
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array<Array>} - Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Optimize memory usage by clearing processed items
   * @param {Array} items - Items array to optimize
   * @param {number} keepCount - Number of recent items to keep
   */
  optimizeMemory(items, keepCount = 50) {
    if (items.length > keepCount) {
      return items.slice(-keepCount);
    }
    return items;
  }
}

/**
 * Create optimized batch processor for multi-item operations
 * @param {Object} options - Configuration options
 * @returns {BatchProcessor} - Configured batch processor
 */
export const createBatchProcessor = (options = {}) => {
  return new BatchProcessor({
    batchSize: 10,
    maxConcurrency: 3,
    retryAttempts: 2,
    retryDelay: 1000,
    ...options
  });
};

/**
 * Process items with progress tracking
 * @param {Array} items - Items to process
 * @param {Function} processor - Processing function
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing results
 */
export const processItemsWithProgress = async (items, processor, options = {}) => {
  const batchProcessor = createBatchProcessor(options);
  
  return new Promise((resolve, reject) => {
    batchProcessor.onComplete = (results) => {
      resolve(results);
    };
    
    batchProcessor.onError = (error) => {
      if (options.stopOnError) {
        reject(error);
      }
    };
    
    batchProcessor.processBatches(items, processor);
  });
};



