#!/bin/sh

# Set environment variables for local development
export PORT=5678
export NODE_FUNCTION_ALLOW_EXTERNAL=playwright
# check if port variable is set or go with default
if [ -z ${PORT+x} ]; then
  echo "PORT variable not defined, leaving N8N to default port."
else
  export N8N_PORT="$PORT"
  echo "N8N will start on '$PORT'"
fi

# Use SQLite as the database
export DB_TYPE=sqlite

# kickstart nodemation
echo "Starting virtual display..."
Xvfb :99 -screen 0 1024x768x24 &
export DISPLAY=:99
echo "Starting n8n..."
exec n8n