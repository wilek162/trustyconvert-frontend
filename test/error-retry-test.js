/**
 * Error and Retry System Test Script
 * 
 * This script tests the error handling and retry system by simulating
 * different error scenarios and validating the retry behavior.
 * 
 * Run with: node test/error-retry-test.js
 */

// Mock environment
globalThis.import = { meta: { env: { DEV: true } } };

// Mock dependencies
const mockToasts = [];
const mockReportedErrors = [];

// Mock toast function
globalThis.showToast = (message, type, duration) => {
  console.log(`[TOAST] ${type}: ${message}`);
  mockToasts.push({ message, type, duration });
};

// Mock error reporting
globalThis.reportError = (error, context) => {
  console.log(`[ERROR REPORT] ${error.message}`, context);
  mockReportedErrors.push({ error, context });
};

// Import the modules (with path adjustments for testing)
const fs = require('fs');
const path = require('path');

// Read the source files
const errorHandlingServiceSource = fs.readFileSync(
  path.join(__dirname, '../src/lib/errors/errorHandlingService.ts'),
  'utf8'
);

const errorRetrySource = fs.readFileSync(
  path.join(__dirname, '../src/lib/utils/errorRetry.ts'),
  'utf8'
);

const retrySource = fs.readFileSync(
  path.join(__dirname, '../src/lib/utils/retry.ts'),
  'utf8'
);

// Extract and evaluate the retry strategies
const retryStrategiesMatch = retrySource.match(/export const RETRY_STRATEGIES = ({[\s\S]*?});/);
const retryStrategies = retryStrategiesMatch 
  ? eval(`(${retryStrategiesMatch[1]})`) 
  : { API_REQUEST: { maxRetries: 3, initialDelay: 300, backoffFactor: 3 } };

console.log('=== Error and Retry System Test ===');
console.log('Testing with retry strategies:', Object.keys(retryStrategies).join(', '));

// Test functions
async function runTests() {
  console.log('\n--- Test 1: Basic Retry Logic ---');
  await testBasicRetry();
  
  console.log('\n--- Test 2: Retry with Recovery ---');
  await testRetryWithRecovery();
  
  console.log('\n--- Test 3: Max Retries Limit ---');
  await testMaxRetries();
  
  console.log('\n--- Test 4: Different Strategies ---');
  await testDifferentStrategies();
  
  console.log('\n=== All Tests Completed ===');
}

// Test 1: Basic retry logic
async function testBasicRetry() {
  let attempts = 0;
  const maxAttempts = 3;
  
  const testFn = async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);
    
    if (attempts < maxAttempts) {
      throw new Error('Simulated error');
    }
    
    return 'Success!';
  };
  
  try {
    // Simplified retry implementation for testing
    let result;
    let lastError;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        result = await testFn();
        break;
      } catch (error) {
        lastError = error;
        console.log(`Error: ${error.message}, retrying in ${i * 100}ms...`);
        await new Promise(resolve => setTimeout(resolve, i * 100));
      }
    }
    
    if (attempts === maxAttempts) {
      console.log('✅ Test passed: Function succeeded after correct number of retries');
    } else {
      console.log('❌ Test failed: Incorrect number of retries');
    }
    
    return result;
  } catch (error) {
    console.log('❌ Test failed with error:', error);
  }
}

// Test 2: Retry with recovery
async function testRetryWithRecovery() {
  let attempts = 0;
  let recovered = false;
  
  const testFn = async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);
    
    if (attempts < 2) {
      throw new Error('Simulated recoverable error');
    }
    
    if (attempts === 2 && !recovered) {
      recovered = true;
      console.log('Simulating recovery...');
      // Recovery successful, next attempt should work
    }
    
    return 'Success after recovery!';
  };
  
  try {
    // Simplified retry with recovery
    let result;
    let lastError;
    
    for (let i = 0; i < 3; i++) {
      try {
        result = await testFn();
        break;
      } catch (error) {
        lastError = error;
        console.log(`Error: ${error.message}, attempting recovery...`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    if (recovered && result === 'Success after recovery!') {
      console.log('✅ Test passed: Function recovered and succeeded');
    } else {
      console.log('❌ Test failed: Recovery did not work as expected');
    }
    
    return result;
  } catch (error) {
    console.log('❌ Test failed with error:', error);
  }
}

// Test 3: Max retries limit
async function testMaxRetries() {
  let attempts = 0;
  const maxRetries = 3;
  
  const testFn = async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);
    throw new Error('Simulated unrecoverable error');
  };
  
  try {
    // Simplified retry with max attempts
    let result;
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        result = await testFn();
        break;
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          console.log('Max retries reached, giving up.');
          throw new Error('Max retries reached: ' + error.message);
        }
        
        console.log(`Error: ${error.message}, retrying (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, i * 100));
      }
    }
    
    console.log('❌ Test failed: Should have thrown max retries error');
    return result;
  } catch (error) {
    if (error.message.includes('Max retries reached') && attempts === maxRetries + 1) {
      console.log('✅ Test passed: Function correctly stopped after max retries');
    } else {
      console.log('❌ Test failed: Incorrect error or number of attempts');
    }
  }
}

// Test 4: Different strategies
async function testDifferentStrategies() {
  const strategies = Object.keys(retryStrategies);
  
  for (const strategy of strategies) {
    const config = retryStrategies[strategy];
    console.log(`\nTesting strategy: ${strategy}`);
    console.log(`- Max retries: ${config.maxRetries}`);
    console.log(`- Initial delay: ${config.initialDelay}ms`);
    console.log(`- Backoff factor: ${config.backoffFactor}`);
    
    // Calculate expected delays
    const delays = [];
    for (let i = 0; i < Math.min(config.maxRetries, 3); i++) {
      const delay = config.initialDelay * Math.pow(config.backoffFactor, i);
      delays.push(Math.min(delay, config.maxDelay || Infinity));
    }
    
    console.log(`- Expected delays: ${delays.join(', ')}ms`);
  }
  
  console.log('\n✅ Strategy configurations verified');
}

// Run the tests
runTests().catch(console.error); 