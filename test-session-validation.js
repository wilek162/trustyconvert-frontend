/**
 * Session Management Test Script
 * 
 * This script tests the session initialization, validation, and refresh functionality.
 */

// Import required modules
import { sessionManager } from './src/lib/api/sessionManager.js';
import { isSessionValid, getSessionExpiry } from './src/lib/stores/session.js';
import { apiClient } from './src/lib/api/client.js';

// Enable debug logging
const DEBUG = true;

// Log helper
function log(message, data = null) {
       const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
       console.log(`[${timestamp}] ${message}`);
       if (data && DEBUG) {
              console.log(JSON.stringify(data, null, 2));
       }
}

// Error log helper
function logError(message, error) {
       const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
       console.error(`[${timestamp}] ERROR: ${message}`);
       if (error) {
              console.error(error);
       }
}

// Sleep helper
function sleep(ms) {
       return new Promise(resolve => setTimeout(resolve, ms));
}

// Test session initialization
async function testSessionInitialization() {
       log('Testing session initialization...');

       try {
              // Initialize session
              await sessionManager.initialize(true);

              // Get session state
              const sessionState = sessionManager.getState();
              log('Session state after initialization:', sessionState);

              // Validate session
              const valid = isSessionValid();
              log(`Session is valid: ${valid}`);

              // Check expiry
              const expiry = getSessionExpiry();
              log(`Session expiry: ${expiry}`);

              if (!valid || !expiry) {
                     throw new Error('Session initialization failed - session is invalid or missing expiry');
              }

              return sessionState;
       } catch (error) {
              logError('Session initialization failed', error);
              throw error;
       }
}

// Test session refresh
async function testSessionRefresh() {
       log('Testing session refresh...');

       try {
              // Get initial session state
              const initialState = sessionManager.getState();
              log('Initial session state:', initialState);

              // Refresh session
              await sessionManager.checkRefresh();

              // Get updated session state
              const refreshedState = sessionManager.getState();
              log('Refreshed session state:', refreshedState);

              // Validate that session is still valid
              const valid = isSessionValid();
              log(`Session is valid after refresh: ${valid}`);

              if (!valid) {
                     throw new Error('Session is invalid after refresh');
              }

              return refreshedState;
       } catch (error) {
              logError('Session refresh failed', error);
              throw error;
       }
}

// Test API call with session
async function testApiCall() {
       log('Testing API call with session...');

       try {
              // Get supported formats (simple API call)
              const response = await apiClient.getSupportedFormats();
              log('API call successful:', { success: response.success });

              if (!response.success) {
                     throw new Error('API call failed');
              }

              return response;
       } catch (error) {
              logError('API call failed', error);
              throw error;
       }
}

// Main test function
async function runTests() {
       log('Starting session management tests...');

       try {
              // Test session initialization
              const sessionState = await testSessionInitialization();
              log('Session initialization test passed!', sessionState);

              // Wait a moment
              log('Waiting 3 seconds...');
              await sleep(3000);

              // Test session refresh
              const refreshedState = await testSessionRefresh();
              log('Session refresh test passed!', refreshedState);

              // Test API call
              const apiResponse = await testApiCall();
              log('API call test passed!', { success: apiResponse.success });

              log('All tests passed successfully!');
       } catch (error) {
              logError('Test suite failed', error);
              process.exit(1);
       }
}

// Run the tests
runTests().catch(error => {
       logError('Unhandled error in test suite', error);
       process.exit(1);
}); 