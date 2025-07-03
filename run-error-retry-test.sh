#!/bin/bash

# Script to run the error retry system tests

echo "Running Error Retry System Tests..."
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run the tests."
    exit 1
fi

# Run the test script
node test/error-retry-test.js

echo "===================================="
echo "Tests completed!" 