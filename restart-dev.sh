#!/bin/bash

# Function to kill existing dev server processes
kill_existing_servers() {
  echo "Checking for existing dev server processes..."
  if [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
    # Windows - using taskkill
    tasklist | findstr "node.exe" > /dev/null
    if [ $? -eq 0 ]; then
      echo "Killing existing Node processes..."
      taskkill //F //IM node.exe > /dev/null 2>&1
    fi
  else
    # Unix-like systems
    lsof -i :4322-4324 | grep LISTEN | awk '{print $2}' | xargs -r kill -9
  fi
  echo "Waiting for ports to be released..."
  sleep 2
}

# Clean up processes and cache
kill_existing_servers
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