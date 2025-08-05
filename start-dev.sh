#!/bin/bash

# Kill any existing processes
pkill -f vite
pkill -f electron

# Start React dev server in background
echo "Starting React development server..."
npm run dev:react > /dev/null 2>&1 &
REACT_PID=$!

# Wait for server to start
echo "Waiting for React server to start..."
sleep 5

# Check if server is running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "React server is running on port 5173"
    PORT=5173
elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "React server is running on port 5174"
    PORT=5174
elif curl -s http://localhost:5175 > /dev/null 2>&1; then
    echo "React server is running on port 5175"
    PORT=5175
else
    echo "React server is not accessible"
    kill $REACT_PID
    exit 1
fi

# Start Electron app
echo "Starting Electron app..."
npm run dev:electron

# Cleanup
kill $REACT_PID 