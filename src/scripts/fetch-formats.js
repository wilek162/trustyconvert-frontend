/**
 * Script to fetch supported formats from the API at build time
 * This script is meant to be run during the build process
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths
const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
       fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Define the API URL from environment variables or use default
const API_URL = process.env.PUBLIC_API_URL || 'https://api.trustyconvert.com/api';
const FORMATS_ENDPOINT = `${API_URL}/convert/formats`;

/**
 * Validate JSON structure to ensure it's valid
 * @param {Object} data - The data to validate
 * @returns {boolean} - Whether the data is valid
 */
function validateJsonStructure(data) {
       try {
              // Basic structure validation
              if (!data || typeof data !== 'object') return false;

              // Check for required fields
              if (data.success !== true) return false;
              if (!data.data || typeof data.data !== 'object') return false;
              if (!Array.isArray(data.data.formats)) return false;

              // Validate each format
              for (const format of data.data.formats) {
                     if (!format.id || !format.name) return false;
                     if (!Array.isArray(format.inputFormats) || !Array.isArray(format.outputFormats)) return false;
              }

              return true;
       } catch (error) {
              console.error('Error validating JSON structure:', error);
              return false;
       }
}

/**
 * Fetch formats from the API
 */
async function fetchFormats() {
       console.log(`Fetching formats from ${FORMATS_ENDPOINT}...`);

       try {
              const response = await fetch(FORMATS_ENDPOINT, {
                     method: 'GET',
                     headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                     },
              });

              if (!response.ok) {
                     throw new Error(`Failed to fetch formats: ${response.status} ${response.statusText}`);
              }

              const responseData = await response.json();

              // Check if the response follows the expected structure
              if (!responseData.success || !responseData.data || !responseData.data.formats) {
                     throw new Error('Invalid format data received from API');
              }

              // Validate the JSON structure
              if (!validateJsonStructure(responseData)) {
                     throw new Error('Invalid JSON structure in API response');
              }

              // Save the formats to a JSON file - keep the full response structure
              const formatsFile = path.join(DATA_DIR, 'formats.json');
              fs.writeFileSync(formatsFile, JSON.stringify(responseData, null, 2));

              console.log(`✅ Formats saved to ${formatsFile}`);
              return responseData;
       } catch (error) {
              console.error('Error fetching formats:', error);

              // If there's an error, create a placeholder file to indicate the fetch failed
              const errorFile = path.join(DATA_DIR, 'formats-error.json');
              fs.writeFileSync(errorFile, JSON.stringify({
                     error: true,
                     message: error.message,
                     timestamp: new Date().toISOString()
              }, null, 2));

              console.log(`⚠️ Error saved to ${errorFile}`);
              return null;
       }
}

// Execute the script
fetchFormats(); 