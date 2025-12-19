#!/bin/bash
# Quick script to download models NOW to the mounted directory
# Run this on the host to download models immediately

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="${SCRIPT_DIR}/uploads/models"

echo "=========================================="
echo "Downloading Models NOW to: $MODELS_DIR"
echo "=========================================="

# Create directory
mkdir -p "$MODELS_DIR"

# Check if we're in a container or on host
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
    echo "Running inside container, using Python from container..."
    python3 /app/download_models.py "$MODELS_DIR"
else
    echo "Running on host, checking for Python..."
    
    # Check if ultralytics is available
    if python3 -c "import ultralytics" 2>/dev/null; then
        echo "Using host Python with ultralytics..."
        python3 << EOF
import sys
sys.path.insert(0, '${SCRIPT_DIR}/cv-service')
from download_models import download_models
from pathlib import Path
download_models(Path('${MODELS_DIR}'))
EOF
    else
        echo "Ultralytics not found. Installing..."
        pip3 install ultralytics requests tqdm --quiet
    fi
    
    # Run download using the script from cv-service
    echo "Running download script..."
    python3 << 'PYTHON_SCRIPT'
import sys
import os
from pathlib import Path

# Add cv-service to path
cv_service_dir = Path('${SCRIPT_DIR}') / 'cv-service'
sys.path.insert(0, str(cv_service_dir))

# Import and run download
from download_models import download_models

models_dir = Path('${MODELS_DIR}')
print(f"Downloading models to: {models_dir}")
download_models(models_dir)
PYTHON_SCRIPT
fi

echo ""
echo "=========================================="
echo "Models downloaded to: $MODELS_DIR"
ls -lh "$MODELS_DIR"/*.pt 2>/dev/null | awk '{print "  -", $9, "(" $5 ")"}' || echo "  (check for errors above)"
echo "=========================================="
