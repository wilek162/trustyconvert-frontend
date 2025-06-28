/**
 * TrustyConvert API Integration Test Script
 * 
 * This script tests the API integration according to the API Integration Guide.
 * It verifies session initialization, file upload, conversion, status polling, and download.
 */

// Import required modules
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_BASE_URL = process.env.API_URL || 'https://api.trustyconvert.com/api';
const TEST_FILE_PATH = path.join(__dirname, 'test-files', 'sample.pdf');
const TARGET_FORMAT = 'docx';
const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLING_ATTEMPTS = 30; // 1 minute max

// Store cookies and CSRF token
let cookies = [];
let csrfToken = null;
let sessionId = null;
let jobId = null;
let downloadToken = null;

// Helper function to extract cookies from response headers
function extractCookies(headers) {
       const cookieHeader = headers.get('set-cookie');
       if (cookieHeader) {
              return cookieHeader.split(',').map(cookie => cookie.split(';')[0]);
       }
       return [];
}

// Helper function to extract CSRF token from cookies
function extractCsrfToken(cookieArray) {
       const csrfCookie = cookieArray.find(cookie => cookie.startsWith('XSRF-TOKEN='));
       if (csrfCookie) {
              return csrfCookie.split('=')[1];
       }
       return null;
}

// Helper function for API requests with cookies
async function apiRequest(endpoint, options = {}) {
       const url = `${API_BASE_URL}${endpoint}`;

       // Add cookies to headers
       const headers = options.headers || {};
       if (cookies.length > 0) {
              headers['Cookie'] = cookies.join('; ');
       }

       // Add CSRF token for state-changing requests
       if (['POST', 'PUT', 'DELETE'].includes(options.method) && csrfToken) {
              headers['X-CSRF-Token'] = csrfToken;
       }

       const fetchOptions = {
              ...options,
              headers,
              credentials: 'include'
       };

       console.log(`Making ${options.method || 'GET'} request to ${endpoint}`);

       const response = await fetch(url, fetchOptions);

       // Update cookies from response
       const newCookies = extractCookies(response.headers);
       if (newCookies.length > 0) {
              cookies = [...cookies, ...newCookies];
              const newCsrfToken = extractCsrfToken(newCookies);
              if (newCsrfToken) {
                     csrfToken = newCsrfToken;
                     console.log('Updated CSRF token:', csrfToken);
              }
       }

       return response;
}

// Test steps
async function runTests() {
       try {
              console.log('Starting API integration tests...');

              // Step 1: Initialize session
              console.log('\n=== Step 1: Initialize Session ===');
              const sessionResponse = await apiRequest('/session/init', { method: 'GET' });

              if (!sessionResponse.ok) {
                     throw new Error(`Session initialization failed: ${sessionResponse.status} ${sessionResponse.statusText}`);
              }

              const sessionData = await sessionResponse.json();
              console.log('Session initialized successfully');
              console.log('Session ID:', sessionData.data.id);
              console.log('CSRF Token:', csrfToken);
              sessionId = sessionData.data.id;

              // Step 2: Upload file
              console.log('\n=== Step 2: Upload File ===');

              // Create a unique job ID
              jobId = uuidv4();
              console.log('Generated Job ID:', jobId);

              // Check if test file exists
              if (!fs.existsSync(TEST_FILE_PATH)) {
                     throw new Error(`Test file not found: ${TEST_FILE_PATH}`);
              }

              // Create form data with file and job_id
              const formData = new FormData();
              formData.append('file', fs.createReadStream(TEST_FILE_PATH));
              formData.append('job_id', jobId);

              const uploadResponse = await apiRequest('/upload', {
                     method: 'POST',
                     body: formData,
                     headers: formData.getHeaders()
              });

              if (!uploadResponse.ok) {
                     throw new Error(`File upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
              }

              const uploadData = await uploadResponse.json();
              console.log('File uploaded successfully');
              console.log('Upload response:', JSON.stringify(uploadData, null, 2));

              // Step 3: Convert file
              console.log('\n=== Step 3: Convert File ===');
              const convertResponse = await apiRequest('/convert', {
                     method: 'POST',
                     headers: {
                            'Content-Type': 'application/json'
                     },
                     body: JSON.stringify({
                            job_id: jobId,
                            target_format: TARGET_FORMAT
                     })
              });

              if (!convertResponse.ok) {
                     throw new Error(`Conversion request failed: ${convertResponse.status} ${convertResponse.statusText}`);
              }

              const convertData = await convertResponse.json();
              console.log('Conversion started successfully');
              console.log('Conversion response:', JSON.stringify(convertData, null, 2));

              // Step 4: Poll for job status
              console.log('\n=== Step 4: Poll for Job Status ===');
              let statusData = null;
              let attempts = 0;

              while (attempts < MAX_POLLING_ATTEMPTS) {
                     console.log(`Polling attempt ${attempts + 1}/${MAX_POLLING_ATTEMPTS}...`);

                     const statusResponse = await apiRequest(`/job_status?job_id=${jobId}`, { method: 'GET' });

                     if (!statusResponse.ok) {
                            console.error(`Status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
                            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
                            attempts++;
                            continue;
                     }

                     statusData = await statusResponse.json();
                     console.log('Status:', statusData.data.status);
                     console.log('Progress:', statusData.data.progress || 0);

                     if (['completed', 'failed'].includes(statusData.data.status)) {
                            break;
                     }

                     await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
                     attempts++;
              }

              if (!statusData || !['completed', 'failed'].includes(statusData.data.status)) {
                     throw new Error('Job status polling timed out or failed');
              }

              if (statusData.data.status === 'failed') {
                     throw new Error(`Conversion failed: ${statusData.data.error_message || 'Unknown error'}`);
              }

              console.log('Conversion completed successfully');

              // Step 5: Get download token
              console.log('\n=== Step 5: Get Download Token ===');
              const tokenResponse = await apiRequest('/download_token', {
                     method: 'POST',
                     headers: {
                            'Content-Type': 'application/json'
                     },
                     body: JSON.stringify({ job_id: jobId })
              });

              if (!tokenResponse.ok) {
                     throw new Error(`Download token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
              }

              const tokenData = await tokenResponse.json();
              downloadToken = tokenData.data.download_token;
              console.log('Download token received successfully');
              console.log('Token:', downloadToken);
              console.log('Expires at:', tokenData.data.expires_at);

              // Step 6: Download file (simulate only)
              console.log('\n=== Step 6: Download File ===');
              console.log(`Download URL: ${API_BASE_URL}/download?token=${downloadToken}`);
              console.log('Skipping actual download for this test');

              // Step 7: Close session
              console.log('\n=== Step 7: Close Session ===');
              const closeResponse = await apiRequest('/session/close', { method: 'POST' });

              if (!closeResponse.ok) {
                     throw new Error(`Session close failed: ${closeResponse.status} ${closeResponse.statusText}`);
              }

              const closeData = await closeResponse.json();
              console.log('Session closed successfully');

              console.log('\n✅ All tests passed successfully!');

       } catch (error) {
              console.error('\n❌ Test failed:', error.message);
              process.exit(1);
       }
}

// Run tests
runTests(); 