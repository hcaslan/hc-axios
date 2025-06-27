/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
};

/**
 * Attaches circuit breaker functionality to the axios instance
 * @param {Object} instance - The axios instance
 */
export function attachCircuitBreaker(instance) {
  /**
   * Request with circuit breaker pattern
   * @param {Object} options - Circuit breaker options
   * @param {number} options.failureThreshold - Number of failures before opening circuit
   * @param {number} options.resetTimeout - Time in ms before attempting to close circuit
   * @param {number} options.monitoringPeriod - Time window for counting failures
   * @param {Function} options.isFailure - Custom function to determine if response is a failure
   * @returns {Object} - The axios instance
   */
  instance.withCircuitBreaker = function (options = {}) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 60000,
      isFailure = (error) => true,
    } = options;

    // Circuit breaker state
    let failures = 0;
    let lastFailureTime = 0;
    let state = CircuitState.CLOSED;
    let halfOpenRequests = 0;
    const maxHalfOpenRequests = 1;

    // Store original request method
    const originalRequest = instance.request.bind(instance);

    // Override request method
    instance.request = async function (config) {
      const now = Date.now();

      // Reset failures after monitoring period
      if (now - lastFailureTime > monitoringPeriod) {
        failures = 0;
      }

      // Check circuit breaker state
      if (state === CircuitState.OPEN) {
        if (now - lastFailureTime > resetTimeout) {
          state = CircuitState.HALF_OPEN;
          halfOpenRequests = 0;
        } else {
          const error = new Error("Circuit breaker is OPEN");
          error.code = "ECIRCUITOPEN";
          error.circuitBreakerState = state;
          throw error;
        }
      }

      // In half-open state, limit concurrent requests
      if (
        state === CircuitState.HALF_OPEN &&
        halfOpenRequests >= maxHalfOpenRequests
      ) {
        const error = new Error(
          "Circuit breaker is HALF_OPEN - request limit reached"
        );
        error.code = "ECIRCUITHALFOPEN";
        error.circuitBreakerState = state;
        throw error;
      }
      const initialState = state;
      try {
        if (state === CircuitState.HALF_OPEN) {
          halfOpenRequests++;
        }

        const response = await originalRequest(config);

        // Reset on success in half-open state
        if (state === CircuitState.HALF_OPEN) {
          state = CircuitState.CLOSED;
          failures = 0;
          halfOpenRequests = 0;
        }

        return response;
      } catch (error) {
        // Check if this error should be counted as a failure
        if (isFailure(error)) {
          failures++;
          lastFailureTime = now;

          if (failures >= failureThreshold) {
            state = CircuitState.OPEN;
          }
        }

        // Add circuit breaker info to error using the state when request was made
        error.circuitBreakerState = initialState;
        error.circuitBreakerFailures = failures;

        throw error;
      } finally {
        if (initialState === CircuitState.HALF_OPEN) {
          halfOpenRequests--;
        }
      }
    };

    // Add method to get circuit breaker status
    instance.getCircuitBreakerStatus = function () {
      return {
        state,
        failures,
        lastFailureTime,
        isOpen: state === CircuitState.OPEN,
        isHalfOpen: state === CircuitState.HALF_OPEN,
        isClosed: state === CircuitState.CLOSED,
      };
    };

    // Add method to manually reset circuit breaker
    instance.resetCircuitBreaker = function () {
      state = CircuitState.CLOSED;
      failures = 0;
      lastFailureTime = 0;
      halfOpenRequests = 0;
      return instance;
    };

    // Add method to manually open circuit breaker
    instance.openCircuitBreaker = function () {
      state = CircuitState.OPEN;
      lastFailureTime = Date.now();
      return instance;
    };

    return instance;
  };
}
