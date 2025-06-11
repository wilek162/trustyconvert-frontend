/**
 * Monitoring and Error Tracking
 * 
 * This module exports utilities for monitoring, error tracking,
 * and performance measurement throughout the application.
 */

// Re-export from init module
export {
  initializeMonitoring,
  initializeMocks,
  getErrorTracker,
  reportError,
} from './init';

// Re-export from performance module
export {
  measurePerformance,
  getPerformanceMetrics,
} from './performance';

// Initialize monitoring when imported
import { initializeMonitoring } from './init';

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  initializeMonitoring();
} 