#!/bin/bash

# TrustyConvert API Integration Test Script
# Tests the connection to the TrustyConvert API with proper error handling

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set API URL from environment or use default
API_URL=${PUBLIC_API_URL:-"https://api.trustyconvert.com/api"}
IGNORE_SSL=${NODE_ENV:-"development"}

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}===== TrustyConvert API Integration Test =====\n${NC}"
echo -e "Testing connection to: ${BLUE}${API_URL}${NC}"

# Create a temporary file for testing upload
TEMP_FILE="test-file-$$.txt"
echo "This is a test file for API testing." > $TEMP_FILE

# Generate a UUID for job tracking
JOB_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || python -c "import uuid; print(uuid.uuid4())")
echo -e "Job ID: ${CYAN}${JOB_ID}${NC}"

# Store cookies and tokens
COOKIE_JAR="cookie-jar-$$.txt"
CSRF_TOKEN=""
DOWNLOAD_TOKEN=""

# Cleanup function
cleanup() {
  echo -e "\n${BLUE}Cleaning up...${NC}"
  rm -f $TEMP_FILE $COOKIE_JAR
  echo -e "${GREEN}✓ Temporary files removed${NC}"
}

# Error handling function
handle_error() {
  echo -e "${RED}✗ ERROR: $1${NC}"
  echo -e "${YELLOW}Response: $2${NC}"
  cleanup
  exit 1
}

# Set trap to ensure cleanup on exit
trap cleanup EXIT

# Test session initialization
echo -e "\n${MAGENTA}1. Testing session initialization...${NC}"
if [ "$IGNORE_SSL" = "development" ]; then
  CURL_SSL_OPTS="--insecure"
  echo -e "${YELLOW}⚠ Development mode: SSL verification disabled${NC}"
else
  CURL_SSL_OPTS=""
fi

SESSION_RESPONSE=$(curl $CURL_SSL_OPTS -s -c $COOKIE_JAR "${API_URL}/session/init")
if [ $? -ne 0 ]; then
  handle_error "Failed to connect to API" "$SESSION_RESPONSE"
fi

# Extract CSRF token from response
CSRF_TOKEN=$(echo $SESSION_RESPONSE | grep -o '"csrf_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  handle_error "Failed to get CSRF token" "$SESSION_RESPONSE"
fi

echo -e "${GREEN}✓ Session initialized successfully${NC}"
echo -e "${GREEN}✓ CSRF Token: ${CYAN}$CSRF_TOKEN${NC}"

# Test file upload
echo -e "\n${MAGENTA}2. Testing file upload...${NC}"
echo -e "Uploading file: ${CYAN}$TEMP_FILE${NC}"
echo -e "File size: ${CYAN}$(wc -c < $TEMP_FILE) bytes${NC}"

UPLOAD_RESPONSE=$(curl $CURL_SSL_OPTS -s -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -F "file=@$TEMP_FILE" \
  -F "job_id=$JOB_ID" \
  "${API_URL}/upload")

if [ $? -ne 0 ]; then
  handle_error "Failed to upload file" "$UPLOAD_RESPONSE"
fi

# Check for success in response
if ! echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
  handle_error "Upload returned error" "$UPLOAD_RESPONSE"
fi

echo -e "${GREEN}✓ File uploaded successfully${NC}"
echo -e "${YELLOW}Response: $UPLOAD_RESPONSE${NC}"

# Test file conversion
echo -e "\n${MAGENTA}3. Testing file conversion...${NC}"
echo -e "Converting file with job ID: ${CYAN}$JOB_ID${NC}"
echo -e "Target format: ${CYAN}pdf${NC}"

CONVERT_RESPONSE=$(curl $CURL_SSL_OPTS -s -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"job_id\":\"$JOB_ID\",\"target_format\":\"pdf\"}" \
  "${API_URL}/convert")

if [ $? -ne 0 ]; then
  handle_error "Failed to start conversion" "$CONVERT_RESPONSE"
fi

# Check for success in response
if ! echo "$CONVERT_RESPONSE" | grep -q '"success":true'; then
  handle_error "Conversion returned error" "$CONVERT_RESPONSE"
fi

echo -e "${GREEN}✓ Conversion started successfully${NC}"
echo -e "${YELLOW}Response: $CONVERT_RESPONSE${NC}"

# Test job status with polling
echo -e "\n${MAGENTA}4. Testing job status with polling...${NC}"
MAX_POLLS=10
POLL_COUNT=0
COMPLETED=false

while [ $POLL_COUNT -lt $MAX_POLLS ] && [ "$COMPLETED" = "false" ]; do
  POLL_COUNT=$((POLL_COUNT + 1))
  echo -e "\n${BLUE}Poll attempt $POLL_COUNT/$MAX_POLLS${NC}"
  
  STATUS_RESPONSE=$(curl $CURL_SSL_OPTS -s -b $COOKIE_JAR -c $COOKIE_JAR \
    "${API_URL}/job_status?job_id=$JOB_ID")
  
  if [ $? -ne 0 ]; then
    handle_error "Failed to get job status" "$STATUS_RESPONSE"
  fi
  
  # Extract status from response
  STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9.]*' | cut -d':' -f2)
  
  echo -e "${GREEN}✓ Status: ${CYAN}$STATUS${NC}"
  if [ ! -z "$PROGRESS" ]; then
    echo -e "${GREEN}✓ Progress: ${CYAN}$PROGRESS%${NC}"
  fi
  
  # Check if completed or failed
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    COMPLETED=true
    echo -e "${GREEN}✓ Final status: ${CYAN}$STATUS${NC}"
  else
    echo -e "${YELLOW}Waiting 2 seconds before next poll...${NC}"
    sleep 2
  fi
done

if [ "$COMPLETED" = "false" ]; then
  handle_error "Max polling attempts reached without completion" "$STATUS_RESPONSE"
fi

# Test download token
echo -e "\n${MAGENTA}5. Testing download token...${NC}"
TOKEN_RESPONSE=$(curl $CURL_SSL_OPTS -s -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"job_id\":\"$JOB_ID\"}" \
  "${API_URL}/download_token")

if [ $? -ne 0 ]; then
  handle_error "Failed to get download token" "$TOKEN_RESPONSE"
fi

# Check for success and extract token
if ! echo "$TOKEN_RESPONSE" | grep -q '"success":true'; then
  handle_error "Download token request returned error" "$TOKEN_RESPONSE"
fi

DOWNLOAD_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"download_token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$DOWNLOAD_TOKEN" ]; then
  handle_error "Failed to extract download token" "$TOKEN_RESPONSE"
fi

echo -e "${GREEN}✓ Download token received: ${CYAN}$DOWNLOAD_TOKEN${NC}"
echo -e "${YELLOW}Response: $TOKEN_RESPONSE${NC}"

# Close session
echo -e "\n${MAGENTA}6. Testing session close...${NC}"
CLOSE_RESPONSE=$(curl $CURL_SSL_OPTS -s -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -X POST \
  "${API_URL}/session/close")

if [ $? -ne 0 ]; then
  handle_error "Failed to close session" "$CLOSE_RESPONSE"
fi

# Check for success in response
if ! echo "$CLOSE_RESPONSE" | grep -q '"success":true'; then
  handle_error "Session close returned error" "$CLOSE_RESPONSE"
fi

echo -e "${GREEN}✓ Session closed successfully${NC}"
echo -e "${YELLOW}Response: $CLOSE_RESPONSE${NC}"

echo -e "\n${MAGENTA}✓ API integration test completed successfully!${NC}"
echo -e "All endpoints are functioning as expected." 