#!/bin/bash

echo "Cleaning up cache and node_modules/.vite..."
rm -rf node_modules/.vite

echo "Clearing browser cache might help - remember to do this manually"

echo "Restarting dev server with clean cache..."
pnpm run dev 