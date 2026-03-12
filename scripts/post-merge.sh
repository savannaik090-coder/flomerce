#!/bin/bash
set -e

echo "Running post-merge setup..."

echo "Installing root dependencies..."
npm install --yes 2>/dev/null || npm install

echo "Installing platform frontend dependencies..."
cd frontend/src/platform && npm install --yes 2>/dev/null || npm install
cd ../../..

echo "Installing storefront frontend dependencies..."
cd frontend/src/storefront && npm install --yes 2>/dev/null || npm install
cd ../../..

echo "Building platform and storefront..."
node build.js

echo "Post-merge setup complete."
