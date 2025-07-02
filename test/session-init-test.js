/**
 * Session Initialization Test Script
 * 
 * This script can be run in the browser console to test session initialization
 * and help diagnose issues with CSRF token handling.
 */

// Test session initialization directly
async function testSessionInit() {
  console.group('Session Initialization Test');
  
  try {
    // Get references to key modules
    const sessionManager = window.sessionManager || (await import('/src/lib/services/sessionManager')).default;
    const client = window.client || (await import('/src/lib/api/client')).default;
    
    // Log initial state
    console.log('Initial session state:', sessionManager.getSessionState());
    
    // Reset session to start fresh
    await sessionManager.resetSession();
    console.log('After reset:', sessionManager.getSessionState());
    
    // Try to initialize session
    console.log('Initializing session...');
    const success = await sessionManager.initSession(true);
    
    // Log results
    console.log('Initialization success:', success);
    console.log('Final session state:', sessionManager.getSessionState());
    console.log('Has CSRF token:', sessionManager.hasCsrfToken());
    console.log('Session initialized:', sessionManager.getSessionState().sessionInitialized);
    
    if (!success) {
      console.error('Session initialization failed');
    } else {
      console.log('Session initialization succeeded');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
  
  console.groupEnd();
}

// Test CORS configuration
async function testCorsConfig() {
  console.group('CORS Configuration Test');
  
  try {
    // Get API config
    const apiConfig = window.apiConfig || (await import('/src/lib/api/config')).default;
    
    console.log('API Base URL:', apiConfig.baseUrl);
    console.log('Frontend Origin:', apiConfig.frontendDomain);
    console.log('API Domain:', apiConfig.apiDomain);
    
    // Test preflight request
    console.log('Testing OPTIONS request to API...');
    const response = await fetch(apiConfig.baseUrl + '/health', {
      method: 'OPTIONS',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-CSRF-Token,Content-Type'
      }
    });
    
    console.log('OPTIONS response status:', response.status);
    console.log('Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('Access-Control-Allow-Credentials:', response.headers.get('Access-Control-Allow-Credentials'));
    console.log('Access-Control-Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'));
    
  } catch (error) {
    console.error('CORS test error:', error);
  }
  
  console.groupEnd();
}

// Run the tests
async function runTests() {
  await testCorsConfig();
  await testSessionInit();
  console.log('Tests completed');
}

// Export for browser console use
window.testSessionInit = testSessionInit;
window.testCorsConfig = testCorsConfig;
window.runSessionTests = runTests;

console.log('Session test utilities loaded. Run window.runSessionTests() to execute tests.'); 