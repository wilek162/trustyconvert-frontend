#!/bin/bash

# Build the project with debug flags
echo "Building with debug flags..."

# Set environment variables for debugging
export DEBUG=true
export DEBUG_FORMAT_LOADING=true
export NODE_ENV=production

# Run the build
echo "Running build..."
pnpm run build

# Serve the built site
echo "Starting preview server..."
pnpm run preview

# Instructions for testing
echo "Open http://localhost:4321 in your browser to test the build"
echo "Check the console for format loading debug messages" 