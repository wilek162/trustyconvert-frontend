#!/bin/bash

# TrustyConvert Session Management Test Script
# 
# This script tests the session management implementation in the frontend
# by running a series of commands to verify session handling and CSRF protection.

# Set up colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_URL:-"https://api.trustyconvert.com/api"}
FRONTEND_URL=${FRONTEND_URL:-"https://localhost:4322"}

echo -e "${YELLOW}Starting session management tests...${NC}"
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"

# Function to check if the frontend is running
check_frontend() {
  echo -e "${YELLOW}Checking if frontend is running...${NC}"
  
  # Try to connect to the frontend
  curl -s -k "$FRONTEND_URL" > /dev/null
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
    return 0
  else
    echo -e "${RED}✗ Frontend is not running. Please start it with 'npm run dev'${NC}"
    return 1
  fi
}

# Function to check browser console logs for CSRF errors
check_csrf_errors() {
  echo -e "${YELLOW}Checking for CSRF errors in browser console...${NC}"
  
  # This is a placeholder - in a real implementation, you would use a headless browser
  # or browser automation tool like Playwright or Puppeteer to check console logs
  
  echo -e "${YELLOW}Note: Manual verification required. Please check browser console for CSRF errors.${NC}"
}

# Function to test session initialization
test_session_init() {
  echo -e "${YELLOW}Testing session initialization...${NC}"
  
  # Use curl to make a request to the frontend and check for session cookie
  RESPONSE=$(curl -s -k -I "$FRONTEND_URL")
  
  if echo "$RESPONSE" | grep -q "Set-Cookie"; then
    echo -e "${GREEN}✓ Session cookies are being set${NC}"
  else
    echo -e "${RED}✗ No session cookies detected${NC}"
    return 1
  fi
  
  return 0
}

# Function to test API requests with session
test_api_requests() {
  echo -e "${YELLOW}Testing API requests with session...${NC}"
  
  # This would normally use a headless browser to:
  # 1. Load the frontend
  # 2. Wait for session initialization
  # 3. Make API requests
  # 4. Verify responses
  
  echo -e "${YELLOW}Note: For complete testing, use the Node.js test script: node test-session-management.js${NC}"
  
  # Run the Node.js test script if available
  if [ -f "test-session-management.js" ]; then
    echo -e "${YELLOW}Running Node.js test script...${NC}"
node test-session-management.js

if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ API session tests passed${NC}"
      return 0
    else
      echo -e "${RED}✗ API session tests failed${NC}"
      return 1
    fi
  else
    echo -e "${RED}✗ test-session-management.js not found${NC}"
    return 1
  fi
}

# Function to test session persistence
test_session_persistence() {
  echo -e "${YELLOW}Testing session persistence...${NC}"
  
  # This is a placeholder - in a real implementation, you would:
  # 1. Create a session
  # 2. Store some data
  # 3. Reload the page
  # 4. Verify the data is still available
  
  echo -e "${YELLOW}Note: Manual verification required. Please check session persistence in the browser.${NC}"
}

# Function to test CSRF protection
test_csrf_protection() {
  echo -e "${YELLOW}Testing CSRF protection...${NC}"
  
  # This is a placeholder - in a real implementation, you would:
  # 1. Make a request without a CSRF token
  # 2. Verify it fails
  # 3. Make a request with an invalid CSRF token
  # 4. Verify it fails
  # 5. Make a request with a valid CSRF token
  # 6. Verify it succeeds
  
  echo -e "${YELLOW}Note: For complete CSRF testing, use the Node.js test script: node test-session-management.js${NC}"
}

# Main test execution
main() {
  # Check if frontend is running
  check_frontend
  if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend not running, aborting tests${NC}"
  exit 1
fi 
  
  # Run tests
  test_session_init
  test_api_requests
  test_session_persistence
  test_csrf_protection
  check_csrf_errors
  
  echo -e "${GREEN}All tests completed!${NC}"
  echo -e "${YELLOW}Note: Some tests require manual verification in the browser.${NC}"
  echo -e "${YELLOW}Please check the browser console for any CSRF or session errors.${NC}"
}

# Run the main function
main 