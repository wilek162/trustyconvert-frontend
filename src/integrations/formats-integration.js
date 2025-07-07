/**
 * Astro integration to fetch formats during the build process
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Formats integration for Astro
 * Fetches supported formats from the API during the build process
 */
export default function formatsIntegration() {
       return {
              name: 'formats-integration',
              hooks: {
                     'astro:build:start': async () => {
                            console.log('🔄 Fetching supported formats from API...');

                            try {
                                   // Get the absolute path to the script
                                   const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'fetch-formats.js');

                                   // Check if the script exists
                                   if (!fs.existsSync(scriptPath)) {
                                          console.error(`❌ Format fetch script not found at ${scriptPath}`);
                                          return;
                                   }

                                   // Execute the script using Node.js with ESM support
                                   const { stdout, stderr } = await execAsync(`node ${scriptPath}`);

                                   if (stdout) {
                                          console.log(stdout);
                                   }

                                   if (stderr) {
                                          console.error(stderr);
                                   }

                                   console.log('✅ Formats fetched successfully');
                            } catch (error) {
                                   console.error('❌ Failed to fetch formats:', error);
                                   console.log('⚠️ Build will continue with fallback mock formats');
                            }
                     }
              }
       };
} 