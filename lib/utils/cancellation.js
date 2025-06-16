/**
 * Request cancellation utility
 */
export class CancellationManager {
  constructor() {
    this.controllers = new Map();
  }

  create(key) {
    // Cancel existing request with same key
    this.cancel(key);
    
    const controller = new AbortController();
    this.controllers.set(key, controller);
    
    return controller.signal;
  }

  cancel(key) {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  cancelAll() {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }

  getSignal(key) {
    const controller = this.controllers.get(key);
    return controller?.signal;
  }
}