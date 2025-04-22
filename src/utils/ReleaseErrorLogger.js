// ReleaseErrorLogger.js - Utility to help debug issues in release mode
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global error handler to catch JS errors
export const setupGlobalErrorHandler = () => {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Log to storage for debugging in release mode
    const errorMsg = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    logErrorToStorage('ERROR', errorMsg);
    
    // Call original console.error
    originalConsoleError.apply(console, args);
  };

  // Set up global error handler
  if (global.ErrorUtils) {
    const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
    
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      const errorInfo = {
        message: error.message || '',
        stack: error.stack || '',
        isFatal: isFatal ? 'yes' : 'no'
      };
      
      logErrorToStorage('CRASH', JSON.stringify(errorInfo));
      
      // Call original handler
      originalGlobalHandler(error, isFatal);
    });
  }
};

// Log startup events to track initialization sequence
export const logStartupEvent = async (componentName, eventName) => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${componentName} - ${eventName}`;
    
    // Get existing log
    let startupLog = [];
    try {
      const existingLog = await AsyncStorage.getItem('DEBUG_STARTUP_LOG');
      if (existingLog) {
        startupLog = JSON.parse(existingLog);
      }
    } catch (e) {
      // Reset if parse error
      startupLog = [];
    }
    
    // Add new entry and keep only last 50 entries
    startupLog.push(logEntry);
    if (startupLog.length > 50) {
      startupLog = startupLog.slice(startupLog.length - 50);
    }
    
    // Save back to storage
    await AsyncStorage.setItem('DEBUG_STARTUP_LOG', JSON.stringify(startupLog));
    
    console.log(`[STARTUP] ${componentName} - ${eventName}`);
  } catch (error) {
    // Don't throw errors from logging
    console.log('Error logging startup event:', error);
  }
};

// Log errors for later retrieval
export const logErrorToStorage = async (type, errorMessage) => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${type}: ${errorMessage}`;
    
    // Get existing errors
    let errorLog = [];
    try {
      const existingLog = await AsyncStorage.getItem('DEBUG_ERROR_LOG');
      if (existingLog) {
        errorLog = JSON.parse(existingLog);
      }
    } catch (e) {
      // Reset if parse error
      errorLog = [];
    }
    
    // Add new error and keep only last 20 errors
    errorLog.push(logEntry);
    if (errorLog.length > 20) {
      errorLog = errorLog.slice(errorLog.length - 20);
    }
    
    // Save back to storage
    await AsyncStorage.setItem('DEBUG_ERROR_LOG', JSON.stringify(errorLog));
    
    console.log(`[${type}] ${errorMessage}`);
  } catch (error) {
    // Don't throw errors from error logging
    console.log('Error logging to storage:', error);
  }
};

// Helper to safely execute code that might crash
export const safeExecute = (functionName, callback) => {
  try {
    return callback();
  } catch (error) {
    logErrorToStorage('SAFE_EXECUTE', `${functionName} failed: ${error.message}`);
    console.error(`Safe execute failed in ${functionName}:`, error);
    return null;
  }
};

// Function to retrieve logs for display
export const retrieveErrorLogs = async () => {
  try {
    const errorLog = await AsyncStorage.getItem('DEBUG_ERROR_LOG');
    const startupLog = await AsyncStorage.getItem('DEBUG_STARTUP_LOG');
    
    return {
      errors: errorLog ? JSON.parse(errorLog) : [],
      startup: startupLog ? JSON.parse(startupLog) : []
    };
  } catch (error) {
    console.error('Failed to retrieve logs:', error);
    return { errors: [], startup: [] };
  }
};

// Clear logs
export const clearLogs = async () => {
  try {
    await AsyncStorage.removeItem('DEBUG_ERROR_LOG');
    await AsyncStorage.removeItem('DEBUG_STARTUP_LOG');
    console.log('Debug logs cleared');
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
}; 