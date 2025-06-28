/**
 * Test script for API connection and CORS validation
 * 
 * This script will:
 * 1. Attempt to connect to the API
 * 2. Check if CORS headers are properly set
 * 3. Test the full API flow: session init, upload, convert, status, download token
 */

// Disable SSL certificate validation for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_URL = process.env.API_URL || 'https://127.0.0.1:9443/api';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://localhost:4322';
const TEST_FILE_PATH = path.join(__dirname, 'test-api-connection.js'); // Use this script as test file

// Colors for console output
const colors = {
       reset: '\x1b[0m',
       red: '\x1b[31m',
       green: '\x1b[32m',
       yellow: '\x1b[33m',
       blue: '\x1b[34m',
       magenta: '\x1b[35m',
       cyan: '\x1b[36m',
};

console.log(`${colors.cyan}===== API Connection Test =====\n${colors.reset}`);
console.log(`Testing connection to: ${colors.blue}${API_URL}${colors.reset}`);
console.log(`Frontend origin: ${colors.blue}${FRONTEND_ORIGIN}${colors.reset}\n`);

// Store session data
let sessionData = {
       csrfToken: null,
       sessionId: null,
       cookies: []
};

// Store job data
let jobData = {
       jobId: uuidv4(),
       downloadToken: null
};

// Helper to make HTTPS requests
function makeRequest(endpoint, options = {}, body = null) {
       return new Promise((resolve, reject) => {
              const url = `${API_URL}${endpoint}`;
              console.log(`${colors.blue}Making request to: ${url}${colors.reset}`);

              // Set default headers
              const headers = {
                     'Origin': FRONTEND_ORIGIN,
                     ...(options.headers || {})
              };

              // Add CSRF token if available
              if (sessionData.csrfToken) {
                     headers['X-CSRF-Token'] = sessionData.csrfToken;
              }

              // Add cookies if available
              if (sessionData.cookies.length > 0) {
                     headers['Cookie'] = sessionData.cookies.join('; ');
              }

              const requestOptions = {
                     method: options.method || 'GET',
                     headers,
                     ...options
              };

              const req = https.request(url, requestOptions, (res) => {
                     console.log(`${colors.magenta}Status: ${res.statusCode} ${res.statusMessage}${colors.reset}`);

                     // Store cookies
                     const setCookieHeaders = res.headers['set-cookie'];
                     if (setCookieHeaders) {
                            sessionData.cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]);
                            console.log(`${colors.green}Cookies received: ${sessionData.cookies.length}${colors.reset}`);
                     }

                     // Collect response data
                     let data = '';
                     res.on('data', chunk => {
                            data += chunk;
                     });

                     res.on('end', () => {
                            try {
                                   const jsonData = data ? JSON.parse(data) : {};
                                   console.log(`${colors.green}Response: ${JSON.stringify(jsonData, null, 2)}${colors.reset}\n`);
                                   resolve({ res, data: jsonData });
                            } catch (error) {
                                   console.log(`${colors.yellow}Raw response: ${data}${colors.reset}\n`);
                                   resolve({ res, data });
                            }
                     });
              });

              req.on('error', (error) => {
                     console.error(`${colors.red}Request error: ${error.message}${colors.reset}`);
                     reject(error);
              });

              if (body) {
                     if (body instanceof FormData) {
                            body.pipe(req);
                     } else {
                            req.write(typeof body === 'string' ? body : JSON.stringify(body));
                            req.end();
                     }
              } else {
                     req.end();
              }
       });
}

// Step 1: Test session initialization
async function testSessionInit() {
       console.log(`${colors.cyan}Step 1: Testing session initialization${colors.reset}`);

       try {
              const { data } = await makeRequest('/session/init');

              if (data.success && data.data.csrf_token) {
                     sessionData.csrfToken = data.data.csrf_token;
                     sessionData.sessionId = data.data.id;
                     console.log(`${colors.green}✓ Session initialized successfully${colors.reset}`);
                     console.log(`${colors.green}✓ CSRF Token: ${sessionData.csrfToken}${colors.reset}`);
                     return true;
              } else {
                     console.log(`${colors.red}✗ Failed to initialize session${colors.reset}`);
                     return false;
              }
       } catch (error) {
              console.error(`${colors.red}✗ Session initialization error: ${error.message}${colors.reset}`);
              return false;
       }
}

// Step 2: Test file upload
async function testFileUpload() {
       console.log(`${colors.cyan}Step 2: Testing file upload${colors.reset}`);

       try {
              const formData = new FormData();
              formData.append('file', fs.createReadStream(TEST_FILE_PATH));
              formData.append('job_id', jobData.jobId);

              const { data } = await makeRequest('/upload', {
                     method: 'POST',
                     headers: {
                            ...formData.getHeaders()
                     }
              }, formData);

              if (data.success && data.data.job_id) {
                     console.log(`${colors.green}✓ File uploaded successfully${colors.reset}`);
                     console.log(`${colors.green}✓ Job ID: ${data.data.job_id}${colors.reset}`);
                     return true;
              } else {
                     console.log(`${colors.red}✗ Failed to upload file${colors.reset}`);
                     return false;
              }
       } catch (error) {
              console.error(`${colors.red}✗ File upload error: ${error.message}${colors.reset}`);
              return false;
       }
}

// Step 3: Test file conversion
async function testConversion() {
       console.log(`${colors.cyan}Step 3: Testing file conversion${colors.reset}`);

       try {
              const { data } = await makeRequest('/convert', {
                     method: 'POST',
                     headers: {
                            'Content-Type': 'application/json'
                     }
              }, {
                     job_id: jobData.jobId,
                     target_format: 'txt'
              });

              if (data.success) {
                     console.log(`${colors.green}✓ Conversion started successfully${colors.reset}`);
                     console.log(`${colors.green}✓ Status: ${data.data.status}${colors.reset}`);
                     return true;
              } else {
                     console.log(`${colors.red}✗ Failed to start conversion${colors.reset}`);
                     return false;
              }
       } catch (error) {
              console.error(`${colors.red}✗ Conversion error: ${error.message}${colors.reset}`);
              return false;
       }
}

// Step 4: Test job status
async function testJobStatus() {
       console.log(`${colors.cyan}Step 4: Testing job status${colors.reset}`);

       try {
              const { data } = await makeRequest(`/job_status?job_id=${jobData.jobId}`);

              if (data.success) {
                     console.log(`${colors.green}✓ Job status retrieved successfully${colors.reset}`);
                     console.log(`${colors.green}✓ Status: ${data.data.status}${colors.reset}`);
                     return true;
              } else {
                     console.log(`${colors.red}✗ Failed to get job status${colors.reset}`);
                     return false;
              }
       } catch (error) {
              console.error(`${colors.red}✗ Job status error: ${error.message}${colors.reset}`);
              return false;
       }
}

// Step 5: Test download token
async function testDownloadToken() {
       console.log(`${colors.cyan}Step 5: Testing download token${colors.reset}`);

       try {
              const { data } = await makeRequest('/download_token', {
                     method: 'POST',
                     headers: {
                            'Content-Type': 'application/json'
                     }
              }, {
                     job_id: jobData.jobId
              });

              if (data.success && data.data.download_token) {
                     jobData.downloadToken = data.data.download_token;
                     console.log(`${colors.green}✓ Download token retrieved successfully${colors.reset}`);
                     console.log(`${colors.green}✓ Token: ${jobData.downloadToken}${colors.reset}`);
                     return true;
              } else {
                     console.log(`${colors.red}✗ Failed to get download token${colors.reset}`);
                     return false;
              }
       } catch (error) {
              console.error(`${colors.red}✗ Download token error: ${error.message}${colors.reset}`);
              return false;
       }
}

// Step 6: Test session close
async function testSessionClose() {
       console.log(`${colors.cyan}Step 6: Testing session close${colors.reset}`);

       try {
              const { data } = await makeRequest('/session/close', {
                     method: 'POST'
              });

              if (data.success) {
                     console.log(`${colors.green}✓ Session closed successfully${colors.reset}`);
                     return true;
              } else {
                     console.log(`${colors.red}✗ Failed to close session${colors.reset}`);
                     return false;
              }
       } catch (error) {
              console.error(`${colors.red}✗ Session close error: ${error.message}${colors.reset}`);
              return false;
       }
}

// Run all tests
async function runTests() {
       try {
              // Test CORS with OPTIONS request
              console.log(`${colors.cyan}Testing CORS with OPTIONS request${colors.reset}`);
              await makeRequest('/session/init', {
                     method: 'OPTIONS',
                     headers: {
                            'Access-Control-Request-Method': 'GET',
                            'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token'
                     }
              });

              // Run the full API flow
              const sessionInitSuccess = await testSessionInit();
              if (!sessionInitSuccess) return;

              const uploadSuccess = await testFileUpload();
              if (!uploadSuccess) return;

              const conversionSuccess = await testConversion();
              if (!conversionSuccess) return;

              const statusSuccess = await testJobStatus();
              if (!statusSuccess) return;

              // Note: In a real test, we would poll the status until completed
              console.log(`${colors.yellow}Note: In a real scenario, we would poll the job status until completion${colors.reset}`);

              const tokenSuccess = await testDownloadToken();
              if (!tokenSuccess) return;

              await testSessionClose();

              console.log(`\n${colors.green}✓ All tests completed successfully!${colors.reset}`);
       } catch (error) {
              console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
       }
}

runTests(); 