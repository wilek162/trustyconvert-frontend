/**
 * API Integration Test
 * 
 * This script tests the API integration from the command line.
 * It validates the API responses and makes sure they match our type definitions.
 */

// Import required modules
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Configuration
const USE_MOCK_API = true; // Set to false to use the real API
const MOCK_API_URL = 'http://localhost:3000';
const REAL_API_URL = 'https://api.trustyconvert.com';
const API_URL = USE_MOCK_API ? MOCK_API_URL : REAL_API_URL;
const DEBUG = true;

// Utility functions
function log(message, data) {
  if (DEBUG) {
    console.log(`[API-TEST] ${message}`, data || '');
  }
}

function logError(message, error) {
  console.error(`[API-TEST] ${message}`, error || '');
}

// Make a request to the API
function makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    // Only disable certificate validation for HTTPS requests
    if (url.protocol === 'https:') {
      options.rejectUnauthorized = false;
    }

    // Choose http or https module based on URL protocol
    const requestModule = url.protocol === 'https:' ? https : http;
    
    const req = requestModule.request(url, options, (res) => {
      let responseData = '';
      
      // Store cookies from response
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        log('Received cookies:', cookies);
      }

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({ 
            status: res.statusCode, 
            data: jsonResponse,
            cookies: cookies
          });
        } catch (error) {
          // If response is not JSON, log the raw response
          log('Raw response:', responseData);
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Extract cookie value from Set-Cookie header
function extractCookieValue(cookies, cookieName) {
  if (!cookies || !Array.isArray(cookies)) {
    return null;
  }
  
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Test functions
async function testSessionInitialization() {
  log('Testing session initialization');
  
  try {
    // According to the API docs, the endpoint is GET /session/init
    const response = await makeRequest('/session/init', 'GET');
    
    log('Session initialization response:', response);
    
    // Validate response structure against our type definitions
    if (response.status !== 200) {
      logError('Session initialization failed with status:', response.status);
      return false;
    }
    
    if (!response.data.success) {
      logError('Session initialization returned success=false:', response.data);
      return false;
    }
    
    // Extract session ID and CSRF token from cookies
    const sessionId = extractCookieValue(response.cookies, 'trustyconvert_session_id');
    const csrfToken = extractCookieValue(response.cookies, 'csrftoken') || 
                     (response.data.data && response.data.data.csrf_token);
    
    if (!sessionId || !csrfToken) {
      logError('Session initialization missing session ID or CSRF token:', {
        sessionId: sessionId ? 'present' : 'missing',
        csrfToken: csrfToken ? 'present' : 'missing'
      });
      return false;
    }
    
    log('Session initialization successful', {
      sessionId: sessionId.substring(0, 5) + '...',
      csrfToken: csrfToken.substring(0, 5) + '...'
    });
    
    return {
      csrfToken,
      sessionId
    };
  } catch (error) {
    logError('Session initialization error:', error);
    return false;
  }
}

async function testGetFormats(sessionData) {
  log('Testing get formats');
  
  try {
    // According to the API docs, the endpoint is GET /convert/formats and doesn't require authentication
    const response = await makeRequest('/convert/formats', 'GET');
    
    log('Get formats response:', response);
    
    // Validate response structure
    if (response.status !== 200) {
      logError('Get formats failed with status:', response.status);
      return false;
    }
    
    if (!response.data.success) {
      logError('Get formats returned success=false:', response.data);
      return false;
    }
    
    // Check if formats data exists in the response
    const formats = response.data.data && response.data.data.data;
    
    if (!formats || !Array.isArray(formats)) {
      logError('Get formats missing formats array:', response.data);
      return false;
    }
    
    log('Get formats successful, found', formats.length, 'formats');
    return formats;
  } catch (error) {
    logError('Get formats error:', error);
    return false;
  }
}

async function testFileUpload(sessionData, filePath, targetFormat) {
  log('Testing file upload');
  
  if (!sessionData || !sessionData.csrfToken) {
    logError('Missing session data for file upload test');
    return false;
  }
  
  if (!fs.existsSync(filePath)) {
    logError('File not found:', filePath);
    return false;
  }
  
  // Generate a unique job ID
  const jobId = uuidv4();
  log('Generated job ID:', jobId);
  
  try {
    // For the mock API, we'll simulate the file upload with a simple POST request
    // In a real implementation, we would use FormData and properly upload the file
    const response = await makeRequest('/upload', 'POST', {
      job_id: jobId,
      file_content: 'This is a test file for conversion',
      filename: path.basename(filePath)
    }, {
      'X-CSRF-Token': sessionData.csrfToken,
      'Cookie': `trustyconvert_session_id=${sessionData.sessionId}`
    });
    
    log('Upload response:', response);
    
    // Validate response structure
    if (response.status !== 201) {
      logError('Upload failed with status:', response.status);
      return false;
    }
    
    if (!response.data.success) {
      logError('Upload returned success=false:', response.data);
      return false;
    }
    
    if (!response.data.data || !response.data.data.job_id) {
      logError('Upload missing job_id:', response.data);
      return false;
    }
    
    log('Upload successful, job ID:', response.data.data.job_id);
    return response.data.data.job_id;
  } catch (error) {
    logError('Upload error:', error);
    return false;
  }
}

async function testConvertFile(sessionData, jobId, targetFormat) {
  log('Testing file conversion');
  
  if (!sessionData || !sessionData.csrfToken) {
    logError('Missing session data for conversion test');
    return false;
  }
  
  if (!jobId) {
    logError('Missing job ID for conversion test');
    return false;
  }
  
  try {
    const response = await makeRequest('/convert', 'POST', {
      job_id: jobId,
      target_format: targetFormat
    }, {
      'X-CSRF-Token': sessionData.csrfToken,
      'Cookie': `trustyconvert_session_id=${sessionData.sessionId}`
    });
    
    log('Convert response:', response);
    
    // Validate response structure
    if (response.status !== 202) {
      logError('Convert failed with status:', response.status);
      return false;
    }
    
    if (!response.data.success) {
      logError('Convert returned success=false:', response.data);
      return false;
    }
    
    if (!response.data.data || !response.data.data.task_id) {
      logError('Convert missing task_id:', response.data);
      return false;
    }
    
    log('Convert successful, task ID:', response.data.data.task_id);
    return response.data.data.task_id;
  } catch (error) {
    logError('Convert error:', error);
    return false;
  }
}

async function testJobStatus(sessionData, jobId) {
  log('Testing job status');
  
  if (!sessionData || !sessionData.sessionId) {
    logError('Missing session data for job status test');
    return false;
  }
  
  if (!jobId) {
    logError('Missing job ID for status test');
    return false;
  }
  
  try {
    const response = await makeRequest(`/job_status?job_id=${jobId}`, 'GET', null, {
      'Cookie': `trustyconvert_session_id=${sessionData.sessionId}`
    });
    
    log('Job status response:', response);
    
    // Validate response structure
    if (response.status !== 200) {
      logError('Job status failed with status:', response.status);
      return false;
    }
    
    if (!response.data.success) {
      logError('Job status returned success=false:', response.data);
      return false;
    }
    
    if (!response.data.data || !response.data.data.status) {
      logError('Job status missing status field:', response.data);
      return false;
    }
    
    log('Job status successful, status:', response.data.data.status);
    return response.data.data;
  } catch (error) {
    logError('Job status error:', error);
    return false;
  }
}

async function testDownloadToken(sessionData, jobId) {
  log('Testing download token');
  
  if (!sessionData || !sessionData.csrfToken) {
    logError('Missing session data for download token test');
    return false;
  }
  
  if (!jobId) {
    logError('Missing job ID for download token test');
    return false;
  }
  
  try {
    const response = await makeRequest('/download_token', 'POST', {
      job_id: jobId
    }, {
      'X-CSRF-Token': sessionData.csrfToken,
      'Cookie': `trustyconvert_session_id=${sessionData.sessionId}`
    });
    
    log('Download token response:', response);
    
    // Validate response structure
    if (response.status !== 201) {
      logError('Download token failed with status:', response.status);
      return false;
    }
    
    if (!response.data.success) {
      logError('Download token returned success=false:', response.data);
      return false;
    }
    
    if (!response.data.data || !response.data.data.download_token) {
      logError('Download token missing token field:', response.data);
      return false;
    }
    
    log('Download token successful, token:', response.data.data.download_token);
    return response.data.data.download_token;
  } catch (error) {
    logError('Download token error:', error);
    return false;
  }
}

async function testCloseSession(sessionData) {
  log('Testing session close');
  
  if (!sessionData || !sessionData.csrfToken) {
    logError('Missing session data for session close test');
    return false;
  }
  
  try {
    const response = await makeRequest('/session/close', 'POST', {}, {
      'X-CSRF-Token': sessionData.csrfToken,
      'Cookie': `trustyconvert_session_id=${sessionData.sessionId}`
    });
    
    log('Session close response:', response);
    
    // Validate response structure
    if (response.status !== 200) {
      logError('Session close failed with status:', response.status);
      return false;
    }
    
    if (!response.data.success) {
      logError('Session close returned success=false:', response.data);
      return false;
    }
    
    log('Session close successful');
    return true;
  } catch (error) {
    logError('Session close error:', error);
    return false;
  }
}

// Main test function
async function runTests() {
  log('Starting API integration tests');
  log(`Using ${USE_MOCK_API ? 'mock' : 'real'} API at ${API_URL}`);
  
  // Test session initialization
  const sessionData = await testSessionInitialization();
  if (!sessionData) {
    logError('Session initialization failed, aborting tests');
    return;
  }
  
  // Test getting formats
  const formats = await testGetFormats(sessionData);
  if (!formats) {
    logError('Get formats failed, aborting tests');
    return;
  }
  
  // Create a test file
  const testFilePath = path.join(__dirname, 'test-file.txt');
  fs.writeFileSync(testFilePath, 'This is a test file for conversion.');
  
  // Test file upload
  const jobId = await testFileUpload(sessionData, testFilePath, 'pdf');
  if (!jobId) {
    logError('File upload failed, aborting tests');
    return;
  }
  
  // Test file conversion
  const taskId = await testConvertFile(sessionData, jobId, 'pdf');
  if (!taskId) {
    logError('File conversion failed, aborting tests');
    return;
  }
  
  // Test job status
  const jobStatus = await testJobStatus(sessionData, jobId);
  if (!jobStatus) {
    logError('Job status check failed, aborting tests');
    return;
  }
  
  // If job is not completed, poll until it is
  if (jobStatus.status !== 'completed') {
    log('Job is not completed yet, status:', jobStatus.status);
    log('Waiting for job to complete...');
    
    // Simple polling mechanism
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 2000; // 2 seconds
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const updatedStatus = await testJobStatus(sessionData, jobId);
      if (!updatedStatus) {
        logError('Job status check failed during polling');
        break;
      }
      
      log('Current job status:', updatedStatus.status);
      
      if (updatedStatus.status === 'completed') {
        log('Job completed successfully');
        break;
      }
      
      if (updatedStatus.status === 'failed') {
        logError('Job failed:', updatedStatus.error);
        break;
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      logError('Job did not complete within the expected time');
      return;
    }
  }
  
  // Test download token
  const downloadToken = await testDownloadToken(sessionData, jobId);
  if (!downloadToken) {
    logError('Download token failed, aborting tests');
    return;
  }
  
  // Test session close
  const sessionClosed = await testCloseSession(sessionData);
  if (!sessionClosed) {
    logError('Session close failed');
  }
  
  // Clean up
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  
  const uploadResponsePath = path.join(__dirname, 'upload-response.json');
  if (fs.existsSync(uploadResponsePath)) {
    fs.unlinkSync(uploadResponsePath);
  }
  
  log('API integration tests completed');
}

// Run the tests
runTests().catch(error => {
  logError('Test runner error:', error);
}); 