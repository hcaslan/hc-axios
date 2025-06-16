/**
 * Request queue utility for managing concurrent requests
 */
export class RequestQueue {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.running = 0;
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        request: requestFn,
        resolve,
        reject
      });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { request, resolve, reject } = this.queue.shift();
    this.running++;

    try {
      const result = await request();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}