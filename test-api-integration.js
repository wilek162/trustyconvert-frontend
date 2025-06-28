/**
 * TrustyConvert API Integration Test Script
 * 
 * This script tests the API integration by simulating the frontend flow:
 * 1. Initialize session and get CSRF token
 * 2. Upload a test file
 * 3. Convert the file
 * 4. Poll for job status
 * 5. Get download token
 * 6. Close session
 * 
 * Usage: node test-api-integration.js
 */

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_BASE_URL = process.env.PUBLIC_API_URL || 'https://api.trustyconvert.com/api';
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');
const TARGET_FORMAT = 'pdf';
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLLS = 30; // Maximum number of status polls

// Create test file if it doesn't exist
if (!fs.existsSync(TEST_FILE_PATH)) {
       fs.writeFileSync(TEST_FILE_PATH, 'This is a test file for API integration testing.');
       console.log('Created test file:', TEST_FILE_PATH);
}

// Colors for console output
const colors = {
       reset: '\x1b[0m',
       red: '\x1b[31m',
       green: '\x1b[32m',
       yellow: '\x1b[33m',
       blue: '\x1b[34m',
       magenta: '\x1b[35m',
       cyan: '\x1b[36m'
};

// State
let csrfToken = null;
let cookies = [];
let jobId = uuidv4();

/**
 * Make API request with proper error handling
 */
async function apiRequest(endpoint, options = {}) {
       const url = `${API_BASE_URL}${endpoint}`;

       // Add CSRF token if available
       if (csrfToken && options.method !== 'GET') {
              options.headers = {
                     ...options.headers,
                     'X-CSRF-Token': csrfToken
              };
       }

       // Add cookies if available
       if (cookies.length > 0) {
              options.headers = {
                     ...options.headers,
                     'Cookie': cookies.join('; ')
              };
       }

       // Always include credentials
       options.credentials = 'include';

       try {
              console.log(`${colors.blue}> Requesting:${colors.reset} ${options.method || 'GET'} ${url}`);
              const response = await fetch(url, options);

              // Store cookies from response
              const setCookieHeader = response.headers.raw()['set-cookie'];
              if (setCookieHeader) {
                     cookies = setCookieHeader.map(cookie => cookie.split(';')[0]);
                     console.log(`${colors.cyan}> Cookies received:${colors.reset}`, cookies);
              }

              // Parse response
              let data;
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                     data = await response.json();
              } else {
                     data = await response.text();
              }

              // Handle error responses
              if (!response.ok) {
                     throw new Error(`API error (${response.status}): ${JSON.stringify(data)}`);
              }

              // Extract CSRF token if present in response
              if (data && data.data && data.data.csrf_token) {
                     csrfToken = data.data.csrf_token;
                     console.log(`${colors.cyan}> CSRF token received:${colors.reset}`, csrfToken);
              }

              return { response, data };
       } catch (error) {
              console.error(`${colors.red}ERROR:${colors.reset} ${error.message}`);
              throw error;
       }
}

/**
 * Initialize session
 */
async function initSession() {
       console.log(`\n${colors.magenta}=== Initializing Session ===${colors.reset}`);
       const { data } = await apiRequest('/session/init');
       console.log(`${colors.green}✓ Session initialized${colors.reset}`, data.data);
       return data;
}

/**
 * Upload file
 */
async function uploadFile() {
       console.log(`\n${colors.magenta}=== Uploading File ===${colors.reset}`);

       const formData = new FormData();
       formData.append('file', fs.createReadStream(TEST_FILE_PATH));
       formData.append('job_id', jobId);

       const { data } = await apiRequest('/upload', {
              method: 'POST',
              body: formData,
              headers: formData.getHeaders()
       });

       console.log(`${colors.green}✓ File uploaded${colors.reset}`, data.data);
       return data;
}

/**
 * Convert file
 */
async function convertFile() {
       console.log(`\n${colors.magenta}=== Converting File ===${colors.reset}`);

       const { data } = await apiRequest('/convert', {
              method: 'POST',
              body: JSON.stringify({ job_id: jobId, target_format: TARGET_FORMAT }),
              headers: { 'Content-Type': 'application/json' }
       });

       console.log(`${colors.green}✓ Conversion started${colors.reset}`, data.data);
       return data;
}

/**
 * Poll job status
 */
async function pollJobStatus() {
       console.log(`\n${colors.magenta}=== Polling Job Status ===${colors.reset}`);

       let pollCount = 0;
       let completed = false;

       while (!completed && pollCount < MAX_POLLS) {
              pollCount++;
              console.log(`\n${colors.blue}Poll attempt ${pollCount}/${MAX_POLLS}${colors.reset}`);

              const { data } = await apiRequest(`/job_status?job_id=${jobId}`);
              console.log(`${colors.green}✓ Status:${colors.reset}`, data.data.status);

              if (data.data.status === 'completed' || data.data.status === 'failed') {
                     completed = true;
                     console.log(`${colors.green}✓ Final status:${colors.reset}`, data.data);
                     return data;
              }

              // Wait before next poll
              await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
       }

       throw new Error('Max polling attempts reached without completion');
}

/**
 * Get download token
 */
async function getDownloadToken() {
       console.log(`\n${colors.magenta}=== Getting Download Token ===${colors.reset}`);

       const { data } = await apiRequest('/download_token', {
              method: 'POST',
              body: JSON.stringify({ job_id: jobId }),
              headers: { 'Content-Type': 'application/json' }
       });

       console.log(`${colors.green}✓ Download token received${colors.reset}`, data.data);
       return data;
}

/**
 * Close session
 */
async function closeSession() {
       console.log(`\n${colors.magenta}=== Closing Session ===${colors.reset}`);

       const { data } = await apiRequest('/session/close', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
       });

       console.log(`${colors.green}✓ Session closed${colors.reset}`, data.data);
       return data;
}

/**
 * Run the test flow
 */
async function runTest() {
       try {
              console.log(`${colors.magenta}=== TrustyConvert API Integration Test ===${colors.reset}`);
              console.log(`${colors.blue}> API URL:${colors.reset} ${API_BASE_URL}`);
              console.log(`${colors.blue}> Job ID:${colors.reset} ${jobId}`);
              console.log(`${colors.blue}> Test file:${colors.reset} ${TEST_FILE_PATH}`);
              console.log(`${colors.blue}> Target format:${colors.reset} ${TARGET_FORMAT}`);

              await initSession();
              await uploadFile();
              await convertFile();
              await pollJobStatus();
              await getDownloadToken();
              await closeSession();

              console.log(`\n${colors.green}=== Test completed successfully ===${colors.reset}`);
       } catch (error) {
              console.error(`\n${colors.red}=== Test failed ===${colors.reset}`);
              console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
              process.exit(1);
       }
}

// Run the test
runTest(); 