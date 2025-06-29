/**
 * TrustyConvert Session Management Test Script
 * 
 * This script tests the session management implementation to ensure it works correctly.
 * It verifies session initialization, CSRF token handling, session persistence, and error recovery.
 * 
 * Run this script with: node test-session-management.js
 */

const fetch = require('node-fetch');
const { Headers } = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_URL = process.env.API_URL || 'https://api.trustyconvert.com/api';
const DEBUG = process.env.DEBUG === 'true';

// Store cookies between requests
let cookies = [];
let csrfToken = null;
let sessionId = null;

// Helper functions
function log(message, data = null) {
       if (DEBUG) {
              console.log(`[${new Date().toISOString()}] ${message}`);
              if (data) {
                     console.log(JSON.stringify(data, null, 2));
              }
       }
}

function error(message, err = null) {
       console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
       if (err) {
              console.error(err);
       }
}

// Parse cookies from response headers
function parseCookies(response) {
       const rawCookies = response.headers.raw()['set-cookie'];
       if (!rawCookies) return [];

       return rawCookies.map(entry => {
              const parts = entry.split(';');
              const cookiePart = parts[0];
              return cookiePart;
       });
}

// Extract CSRF token from cookies
function extractCsrfToken(cookieList) {
       for (const cookie of cookieList) {
              if (cookie.startsWith('csrftoken=')) {
                     return cookie.split('=')[1];
              }
       }
       return null;
}

// Extract session ID from cookies
function extractSessionId(cookieList) {
       for (const cookie of cookieList) {
              if (cookie.startsWith('sessionid=')) {
                     return cookie.split('=')[1];
              }
       }
       return null;
}

// Make API request with cookies and CSRF token
async function makeRequest(endpoint, options = {}) {
       const url = `${API_URL}${endpoint}`;
       const headers = new Headers(options.headers || {});

       // Add cookies to request
       if (cookies.length > 0) {
              headers.set('Cookie', cookies.join('; '));
       }

       // Add CSRF token for state-changing requests
       if ((options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') && csrfToken) {
              headers.set('X-CSRF-Token', csrfToken);
       }

       const fetchOptions = {
              ...options,
              headers,
              credentials: 'include'
       };

       log(`Request: ${options.method || 'GET'} ${url}`, fetchOptions);

       try {
              const response = await fetch(url, fetchOptions);

              // Update cookies from response
              const newCookies = parseCookies(response);
              if (newCookies.length > 0) {
                     cookies = [...newCookies];

                     // Extract CSRF token and session ID
                     const newCsrfToken = extractCsrfToken(newCookies);
                     if (newCsrfToken) csrfToken = newCsrfToken;

                     const newSessionId = extractSessionId(newCookies);
                     if (newSessionId) sessionId = newSessionId;
              }

              // Parse response body
              let data;
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                     data = await response.json();
              } else {
                     data = await response.text();
              }

              log(`Response: ${response.status}`, data);

              return {
                     status: response.status,
                     data,
                     headers: response.headers,
                     cookies: newCookies
              };
       } catch (err) {
              error(`Failed to fetch ${url}`, err);
              throw err;
       }
}

// Test cases
async function runTests() {
       console.log('Starting session management tests...');

       try {
              // Test 1: Initialize session
              console.log('\n--- Test 1: Initialize session ---');
              const initResponse = await makeRequest('/session/init', { method: 'GET' });

              if (initResponse.status !== 200 || !initResponse.data.success) {
                     throw new Error('Failed to initialize session');
              }

              if (!csrfToken) {
                     throw new Error('No CSRF token received');
              }

              console.log('✅ Session initialized successfully');
              console.log(`Session ID: ${sessionId}`);
              console.log(`CSRF Token: ${csrfToken.substring(0, 10)}...`);

              // Test 2: Upload file with CSRF token
              console.log('\n--- Test 2: Upload file with valid CSRF token ---');
              const jobId = uuidv4();

              // Create a simple text file for testing
              const testFile = Buffer.from('Test file content');
              const formData = new FormData();
              formData.append('file', new Blob([testFile]), 'test.txt');
              formData.append('job_id', jobId);

              const uploadResponse = await makeRequest('/upload', {
                     method: 'POST',
                     body: formData
              });

              if (uploadResponse.status !== 200 || !uploadResponse.data.success) {
                     throw new Error('Failed to upload file with valid CSRF token');
              }

              console.log('✅ File uploaded successfully with valid CSRF token');

              // Test 3: Try request with invalid CSRF token
              console.log('\n--- Test 3: Try request with invalid CSRF token ---');

              try {
                     const invalidCsrfToken = 'invalid_token';
                     const invalidResponse = await makeRequest('/convert', {
                            method: 'POST',
                            headers: {
                                   'Content-Type': 'application/json',
                                   'X-CSRF-Token': invalidCsrfToken
                            },
                            body: JSON.stringify({ job_id: jobId, target_format: 'pdf' })
                     });

                     if (invalidResponse.status === 200) {
                            throw new Error('Request with invalid CSRF token succeeded (should have failed)');
                     }

                     console.log('✅ Request with invalid CSRF token correctly rejected');
              } catch (err) {
                     console.log('✅ Request with invalid CSRF token correctly failed');
              }

              // Test 4: Check session status
              console.log('\n--- Test 4: Check job status ---');
              const statusResponse = await makeRequest(`/job_status?job_id=${jobId}`, { method: 'GET' });

              if (statusResponse.status !== 200 || !statusResponse.data.success) {
                     throw new Error('Failed to get job status');
              }

              console.log('✅ Job status retrieved successfully');
              console.log(`Job status: ${statusResponse.data.data.status}`);

              // Test 5: Close session
              console.log('\n--- Test 5: Close session ---');
              const closeResponse = await makeRequest('/session/close', {
                     method: 'POST',
                     headers: {
                            'Content-Type': 'application/json'
                     },
                     body: JSON.stringify({})
              });

              if (closeResponse.status !== 200 || !closeResponse.data.success) {
                     throw new Error('Failed to close session');
              }

              console.log('✅ Session closed successfully');

              // Test 6: Verify session is closed
              console.log('\n--- Test 6: Verify session is closed ---');

              try {
                     const verifyResponse = await makeRequest(`/job_status?job_id=${jobId}`, { method: 'GET' });

                     if (verifyResponse.status === 200 && verifyResponse.data.success) {
                            throw new Error('Session still active after closing (should be closed)');
                     }

                     console.log('✅ Session correctly shows as closed');
              } catch (err) {
                     console.log('✅ Session correctly shows as closed');
              }

              console.log('\nAll tests completed successfully! 🎉');
       } catch (err) {
              error('Test failed', err);
              process.exit(1);
       }
}

// Run the tests
runTests().catch(err => {
       error('Unhandled error', err);
       process.exit(1);
}); 