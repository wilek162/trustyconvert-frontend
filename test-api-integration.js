/**
 * TrustyConvert API Integration Test Script
 * 
 * This script tests the integration with the TrustyConvert backend API
 * following the API integration guide.
 * 
 * Usage: node test-api-integration.js
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_BASE_URL = process.env.API_URL || 'https://api.trustyconvert.com/api';
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');
const TARGET_FORMAT = 'pdf';

// Create a test file if it doesn't exist
if (!fs.existsSync(TEST_FILE_PATH)) {
       fs.writeFileSync(TEST_FILE_PATH, 'This is a test file for TrustyConvert API integration.');
       console.log(`Created test file: ${TEST_FILE_PATH}`);
}

// Store cookies between requests
const cookies = [];

/**
 * Make an API request with cookie handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - API response
 */
async function apiRequest(endpoint, options = {}) {
       const url = `${API_BASE_URL}${endpoint}`;

       // Add cookies to request
       if (cookies.length > 0) {
              options.headers = {
                     ...options.headers,
                     'Cookie': cookies.join('; ')
              };
       }

       console.log(`\n🔄 ${options.method || 'GET'} ${url}`);

       const response = await fetch(url, {
              ...options,
              credentials: 'include'
       });

       // Store cookies from response
       const setCookieHeader = response.headers.raw()['set-cookie'];
       if (setCookieHeader) {
              setCookieHeader.forEach(cookie => {
                     const cookieName = cookie.split('=')[0];
                     // Replace existing cookie or add new one
                     const cookieIndex = cookies.findIndex(c => c.startsWith(`${cookieName}=`));
                     if (cookieIndex >= 0) {
                            cookies[cookieIndex] = cookie.split(';')[0];
                     } else {
                            cookies.push(cookie.split(';')[0]);
                     }
              });
       }

       // Parse JSON response
       let data;
       try {
              data = await response.json();
       } catch (error) {
              console.error('Error parsing response:', error);
              return { success: false, error: 'Failed to parse response' };
       }

       // Log response summary
       console.log(`✅ Status: ${response.status} ${response.statusText}`);
       console.log(`📄 Response: ${JSON.stringify(data, null, 2)}`);

       return data;
}

/**
 * Run the complete API integration test
 */
async function runTest() {
       console.log('🚀 Starting TrustyConvert API Integration Test');

       try {
              // Step 1: Initialize session
              console.log('\n📌 Step 1: Initialize Session');
              const sessionResponse = await apiRequest('/session/init', {
                     method: 'GET'
              });

              if (!sessionResponse.success) {
                     throw new Error('Session initialization failed');
              }

              const csrfToken = sessionResponse.data.csrf_token;
              console.log(`🔑 CSRF Token: ${csrfToken}`);

              // Step 2: Upload file
              console.log('\n📌 Step 2: Upload File');
              const jobId = uuidv4();
              console.log(`📋 Job ID: ${jobId}`);

              const formData = new FormData();
              formData.append('file', fs.createReadStream(TEST_FILE_PATH));
              formData.append('job_id', jobId);

              const uploadResponse = await apiRequest('/upload', {
                     method: 'POST',
                     body: formData,
                     headers: {
                            'X-CSRF-Token': csrfToken
                     }
              });

              if (!uploadResponse.success) {
                     throw new Error('File upload failed');
              }

              // Step 3: Convert file
              console.log('\n📌 Step 3: Convert File');
              const convertResponse = await apiRequest('/convert', {
                     method: 'POST',
                     headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                     },
                     body: JSON.stringify({
                            job_id: jobId,
                            target_format: TARGET_FORMAT
                     })
              });

              if (!convertResponse.success) {
                     throw new Error('File conversion failed');
              }

              // Step 4: Poll job status
              console.log('\n📌 Step 4: Poll Job Status');
              let jobStatus;
              let attempts = 0;
              const MAX_ATTEMPTS = 10;

              while (attempts < MAX_ATTEMPTS) {
                     attempts++;
                     console.log(`\n🔄 Polling attempt ${attempts}/${MAX_ATTEMPTS}`);

                     const statusResponse = await apiRequest(`/job_status?job_id=${jobId}`, {
                            method: 'GET'
                     });

                     if (!statusResponse.success) {
                            throw new Error('Failed to get job status');
                     }

                     jobStatus = statusResponse.data.status;
                     console.log(`📊 Status: ${jobStatus}`);

                     if (jobStatus === 'completed') {
                            break;
                     } else if (jobStatus === 'failed') {
                            throw new Error(`Conversion failed: ${statusResponse.data.error_message || 'Unknown error'}`);
                     }

                     // Wait before next poll
                     console.log('⏳ Waiting 2 seconds before next poll...');
                     await new Promise(resolve => setTimeout(resolve, 2000));
              }

              if (jobStatus !== 'completed') {
                     throw new Error('Job did not complete within the expected time');
              }

              // Step 5: Get download token
              console.log('\n📌 Step 5: Get Download Token');
              const tokenResponse = await apiRequest('/download_token', {
                     method: 'POST',
                     headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                     },
                     body: JSON.stringify({
                            job_id: jobId
                     })
              });

              if (!tokenResponse.success) {
                     throw new Error('Failed to get download token');
              }

              const downloadToken = tokenResponse.data.download_token;
              console.log(`🎟️ Download Token: ${downloadToken}`);

              // Step 6: Generate download URL
              const downloadUrl = `${API_BASE_URL}/download?token=${downloadToken}`;
              console.log(`\n📌 Step 6: Download URL Generated`);
              console.log(`🔗 Download URL: ${downloadUrl}`);

              // Step 7: Close session
              console.log('\n📌 Step 7: Close Session');
              const closeResponse = await apiRequest('/session/close', {
                     method: 'POST',
                     headers: {
                            'X-CSRF-Token': csrfToken
                     }
              });

              if (!closeResponse.success) {
                     throw new Error('Failed to close session');
              }

              console.log('\n✅ API Integration Test Completed Successfully');

       } catch (error) {
              console.error(`\n❌ Test Failed: ${error.message}`);
              process.exit(1);
       }
}

// Run the test
runTest(); 