/**
 * Attaches interceptor group management methods to the axios instance
 * @param {Object} instance - The axios instance
 * @param {Object} interceptorManager - The interceptor manager utility
 */
export function attachInterceptorGroupManagement(instance, interceptorManager) {
  /**
   * Create a named group of interceptors
   * @param {string} groupName - Name of the group
   * @param {Array<string>} interceptorNames - Names of interceptors in the group
   */
  instance.createInterceptorGroup = function(groupName, interceptorNames) {
    interceptorManager.createGroup(groupName, interceptorNames);
    return instance;
  };

  /**
   * Enable a group of interceptors
   * @param {string} groupName - Name of the group to enable
   */
  instance.enableGroup = function(groupName) {
    interceptorManager.enableGroup(groupName, instance);
    return instance;
  };

  /**
   * Disable a group of interceptors
   * @param {string} groupName - Name of the group to disable
   */
  instance.disableGroup = function(groupName) {
    interceptorManager.disableGroup(groupName, instance);
    return instance;
  };

  /**
   * Get all interceptor groups
   * @returns {Array} List of group names
   */
  instance.getGroups = function() {
    return interceptorManager.getGroups();
  };

  /**
   * Add a conditional interceptor
   * @param {string} type - 'request' or 'response'
   * @param {Function} condition - Function that returns boolean
   * @param {Function} onFulfilled - Success handler
   * @param {Function} onRejected - Error handler (for response interceptors)
   */
  instance.addConditionalInterceptor = function(type, condition, onFulfilled, onRejected) {
    return interceptorManager.addConditionalInterceptor(
      instance,
      type,
      condition,
      onFulfilled,
      onRejected
    );
  };

  /**
   * Remove a conditional interceptor
   * @param {number} id - ID returned by addConditionalInterceptor
   */
  instance.removeConditionalInterceptor = function(id) {
    interceptorManager.removeConditionalInterceptor(id);
    return instance;
  };

  /**
   * Clear all conditional interceptors
   */
  instance.clearConditionalInterceptors = function() {
    interceptorManager.clearConditionalInterceptors();
    return instance;
  };

  /**
   * Get all conditional interceptors
   * @returns {Array} List of conditional interceptors
   */
  instance.getConditionalInterceptors = function() {
    return interceptorManager.getConditionalInterceptors();
  };

  /**
   * Check if an interceptor is enabled
   * @param {string} interceptorName - Name of the interceptor
   * @returns {boolean} Whether the interceptor is enabled
   */
  instance.isInterceptorEnabled = function(interceptorName) {
    return interceptorManager.isEnabled(interceptorName);
  };

  /**
   * Toggle an interceptor group
   * @param {string} groupName - Name of the group
   * @returns {boolean} New state of the group (enabled/disabled)
   */
  instance.toggleGroup = function(groupName) {
    const groups = interceptorManager.getGroups();
    const isEnabled = interceptorManager.isGroupEnabled(groupName);
    
    if (isEnabled) {
      instance.disableGroup(groupName);
    } else {
      instance.enableGroup(groupName);
    }
    
    return !isEnabled;
  };

  /**
   * Get group configuration
   * @param {string} groupName - Name of the group
   * @returns {Object} Group configuration with interceptors and state
   */
  instance.getGroupConfig = function(groupName) {
    return interceptorManager.getGroupConfig(groupName);
  };

  /**
   * Delete an interceptor group
   * @param {string} groupName - Name of the group to delete
   */
  instance.deleteGroup = function(groupName) {
    interceptorManager.deleteGroup(groupName);
    return instance;
  };
}