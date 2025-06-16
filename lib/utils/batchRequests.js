/**
 * Batch request utility for combining multiple requests
 */
export class BatchRequestManager {
  constructor(instance, { 
    batchSize = 10, 
    delay = 100,
    endpoint = '/batch'
  } = {}) {
    this.instance = instance;
    this.batchSize = batchSize;
    this.delay = delay;
    this.endpoint = endpoint;
    this.queue = [];
    this.processing = false;
  }

  async add(config) {
    return new Promise((resolve, reject) => {
      this.queue.push({ config, resolve, reject });
      
      if (!this.processing) {
        setTimeout(() => this.processBatch(), this.delay);
        this.processing = true;
      }
    });
  }

  async processBatch() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const requests = batch.map(item => ({
        method: item.config.method || 'GET',
        url: item.config.url,
        data: item.config.data,
        params: item.config.params,
        headers: item.config.headers
      }));

      const response = await this.instance.post(this.endpoint, { requests });
      
      // Resolve individual promises with their corresponding responses
      response.data.forEach((result, index) => {
        if (result.success) {
          batch[index].resolve(result);
        } else {
          batch[index].reject(new Error(result.error));
        }
      });
      
    } catch (error) {
      // Reject all promises in the batch
      batch.forEach(item => item.reject(error));
    }

    // Continue processing if there are more items
    if (this.queue.length > 0) {
      setTimeout(() => this.processBatch(), this.delay);
    } else {
      this.processing = false;
    }
  }
}