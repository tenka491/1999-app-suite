#!/bin/bash
for app in apps/*; do
  echo "Starting dev for $app..."
  cd "$app" && npm install && npm run dev &
  cd ../..
done
wait
