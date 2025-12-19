#!/bin/bash

# Quick fix script for grpcio installation issues

set -e

echo "Fixing grpcio installation issue..."

# Check if we're in a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Warning: Not in a virtual environment. Activating backend/venv if it exists..."
    if [ -d "backend/venv" ]; then
        source backend/venv/bin/activate
    else
        echo "Error: No virtual environment found. Please run ./install.sh first or create a venv."
        exit 1
    fi
fi

# Upgrade pip, setuptools, and wheel
echo "Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel

# Install build dependencies if on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Checking for build dependencies..."
    if ! python3 -c "import sysconfig; sysconfig.get_config_var('CC')" 2>/dev/null; then
        echo "Installing build dependencies..."
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update && sudo apt-get install -y build-essential python3-dev
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y gcc python3-devel
        elif command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y gcc python3-devel
        fi
    fi
fi

# Upgrade pymilvus to a version that supports newer grpcio with Python 3.12 wheels
echo "Upgrading pymilvus to latest version for Python 3.12 compatibility..."
pip install --upgrade "pymilvus>=2.6.0"

# Now install other requirements
echo "Installing other requirements..."
if [ -f "backend/requirements.txt" ]; then
    pip install -r backend/requirements.txt
fi

echo "Done! grpcio should now be installed correctly."
