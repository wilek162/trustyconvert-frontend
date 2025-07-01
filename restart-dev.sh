#!/bin/bash

# Clean up cache
echo "Cleaning up cache and node_modules/.vite..."
rm -rf node_modules/.vite
rm -rf .astro
echo "Clearing browser cache might help - remember to do this manually"

# Check if we should use SSL
if [ "$1" == "--no-ssl" ]; then
  echo "Starting dev server without SSL..."
  npm run dev -- --port 4322 --host
else
  echo "Setting up SSL certificate handling for development..."
  echo "Restarting dev server with clean cache..."
  npm run dev
  
  # If the server fails to start, suggest running without SSL
  if [ $? -ne 0 ]; then
    echo "Failed to start with SSL. Try running with --no-ssl flag:"
    echo "./restart-dev.sh --no-ssl"
  fi
fi 