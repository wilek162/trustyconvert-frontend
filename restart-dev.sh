#!/bin/bash

# Clean up cache
echo "Cleaning up cache and node_modules/.vite..."
rm -rf .astro node_modules/.vite
echo "Clearing browser cache might help - remember to do this manually"

# Set up SSL certificate handling for development
echo "Setting up SSL certificate handling for development..."
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Set environment variables for development
export PUBLIC_API_URL=https://api.trustyconvert.com/api
export PUBLIC_ENVIRONMENT=development

# Restart the dev server
echo "Restarting dev server with clean cache..."
npm run dev 