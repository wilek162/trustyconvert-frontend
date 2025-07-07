/**
 * Test script to verify that the format data is loaded correctly for static routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const FORMATS_FILE = path.join(DATA_DIR, 'formats.json');

/**
 * Test that the formats file exists and is valid
 */
async function testFormatsFile() {
       console.log(`Testing formats file at ${FORMATS_FILE}...`);

       try {
              // Check if the file exists
              if (!fs.existsSync(FORMATS_FILE)) {
                     console.error(`❌ Formats file not found at ${FORMATS_FILE}`);
                     return false;
              }

              // Read the file
              const data = JSON.parse(fs.readFileSync(FORMATS_FILE, 'utf8'));

              // Validate the data
              if (!data || !data.success || !data.data || !Array.isArray(data.data.formats)) {
                     console.error('❌ Invalid formats data structure');
                     console.log('Data structure:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
                     return false;
              }

              // Check if there are any formats
              if (data.data.formats.length === 0) {
                     console.error('❌ No formats found in the data');
                     return false;
              }

              // Check if the formats have the required fields
              const format = data.data.formats[0];
              if (!format.id || !format.name || !Array.isArray(format.inputFormats) || !Array.isArray(format.outputFormats)) {
                     console.error('❌ Format data is missing required fields');
                     console.log('First format:', format);
                     return false;
              }

              // Count the number of possible conversion routes
              const conversionRoutes = data.data.formats.flatMap(format =>
                     format.outputFormats.map(targetFormat => `${format.id}-to-${targetFormat}`)
              );

              console.log(`✅ Formats file is valid`);
              console.log(`Found ${data.data.formats.length} formats`);
              console.log(`Found ${conversionRoutes.length} possible conversion routes`);
              console.log(`Example routes: ${conversionRoutes.slice(0, 5).join(', ')}...`);

              return true;
       } catch (error) {
              console.error('❌ Error testing formats file:', error);
              return false;
       }
}

// Run the test
testFormatsFile(); 