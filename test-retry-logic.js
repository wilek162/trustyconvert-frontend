/**
 * TrustyConvert Retry Logic Test Script
 * 
 * This script tests the centralized retry utility to ensure it works correctly
 * with different retry strategies and error conditions.
 */

// Simulate the retry utility for testing
const RETRY_STRATEGIES = {
  API_REQUEST: {
    maxRetries: 3,
    initialDelay: 10, // Use shorter delays for testing
    maxDelay: 100,
    backoffFactor: 2
  },
  CRITICAL: {
    maxRetries: 5,
    initialDelay: 10,
    maxDelay: 100,
    backoffFactor: 2
  },
  POLLING: {
    maxRetries: 10,
    initialDelay: 10,
    backoffFactor: 1
  }
};

/**
 * Calculate backoff delay
 */
function calculateBackoff(attempt, config) {
  const { initialDelay, maxDelay, backoffFactor } = config;
  const delay = initialDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Simplified withRetry function for testing
 */
async function withRetry(fn, config = {}) {
  const fullConfig = { ...RETRY_STRATEGIES.API_REQUEST, ...config };
  const { maxRetries, isRetryable = () => true, onRetry } = fullConfig;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const shouldRetry = attempt < maxRetries && 
        (isRetryable ? isRetryable(error) : true);
      
      if (!shouldRetry) {
        break;
      }
      
      if (onRetry) {
        onRetry(error, attempt + 1);
      }
      
      const delay = calculateBackoff(attempt, fullConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Test helpers
 */
function createFailingFunction(failCount, errorMessage = 'Test error') {
  let attempts = 0;
  return async () => {
    attempts++;
    if (attempts <= failCount) {
      throw new Error(`${errorMessage} (attempt ${attempts})`);
    }
    return `Success after ${attempts} attempts`;
  };
}

/**
 * Test cases
 */
async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  async function runTest(name, testFn) {
    console.log(`\n🧪 Running test: ${name}`);
    try {
      await testFn();
      console.log(`✅ Test passed: ${name}`);
      results.passed++;
      results.tests.push({ name, passed: true });
    } catch (error) {
      console.error(`❌ Test failed: ${name}`);
      console.error(`   Error: ${error.message}`);
      results.failed++;
      results.tests.push({ name, passed: false, error: error.message });
    }
  }
  
  // Test 1: Basic retry functionality
  await runTest('Basic retry functionality', async () => {
    const fn = createFailingFunction(2);
    const result = await withRetry(fn);
    if (result !== 'Success after 3 attempts') {
      throw new Error(`Expected "Success after 3 attempts", got "${result}"`);
    }
  });
  
  // Test 2: Exceeding max retries
  await runTest('Exceeding max retries', async () => {
    const fn = createFailingFunction(5);
    try {
      await withRetry(fn, { maxRetries: 3 });
      throw new Error('Expected function to throw, but it succeeded');
    } catch (error) {
      if (!error.message.includes('Test error')) {
        throw new Error(`Expected error message to include "Test error", got "${error.message}"`);
      }
    }
  });
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Total: ${results.passed + results.failed}`);
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
