#!/bin/bash

# Test API Connection Script
# This script tests the API connection and integration

echo "Testing API connection..."

# Install required dependencies if not already installed
if ! npm list form-data &>/dev/null; then
  echo "Installing form-data package..."
  npm install --no-save form-data
fi

if ! npm list uuid &>/dev/null; then
  echo "Installing uuid package..."
  npm install --no-save uuid
fi

# Set environment variables for testing
export NODE_TLS_REJECT_UNAUTHORIZED=0
export API_URL=${API_URL:-"https://127.0.0.1:9443/api"}
export FRONTEND_ORIGIN=${FRONTEND_ORIGIN:-"https://localhost:4322"}

echo "Using API URL: $API_URL"
echo "Using Frontend Origin: $FRONTEND_ORIGIN"
echo ""

# Run the test script
node test-api-connection.js

# Check the exit code
if [ $? -eq 0 ]; then
  echo "Test completed."
else
  echo "Test failed with errors."
fi 