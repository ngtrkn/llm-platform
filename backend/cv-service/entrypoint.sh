#!/bin/bash
# Don't exit on error - we want to start the service even if some models fail to download
set +e

echo "=========================================="
echo "CV Service Container Starting..."
echo "=========================================="

# Ensure models directory exists
MODELS_DIR=${MODELS_DIR:-/app/models}
mkdir -p "$MODELS_DIR"

echo "Models directory: $MODELS_DIR"
echo "Checking if directory is writable..."
touch "$MODELS_DIR/.test_write" 2>/dev/null && rm "$MODELS_DIR/.test_write" && echo "✓ Directory is writable" || echo "⚠ Directory may not be writable"

# Check if we have models in the image (from build) that need to be copied to volume
IMAGE_MODELS_DIR="/app/models"
if [ -d "$IMAGE_MODELS_DIR" ] && [ "$(ls -A $IMAGE_MODELS_DIR/*.pt 2>/dev/null)" ]; then
    echo ""
    echo "Found models in image. Checking if volume needs models..."
    VOLUME_MODEL_COUNT=$(find "$MODELS_DIR" -name "*.pt" 2>/dev/null | wc -l)
    if [ "$VOLUME_MODEL_COUNT" -eq 0 ]; then
        echo "Volume is empty. Copying models from image to volume..."
        cp -v "$IMAGE_MODELS_DIR"/*.pt "$MODELS_DIR"/ 2>/dev/null || echo "Could not copy models from image"
    fi
fi

# List current models before download
echo ""
echo "Models currently in directory:"
ls -lh "$MODELS_DIR"/*.pt 2>/dev/null | awk '{print "  -", $9, "(" $5 ")"}' || echo "  (no models found)"

# Download default models if they don't exist
echo ""
echo "=========================================="
echo "Downloading default models..."
echo "=========================================="

# Check if models directory is empty or has very few models
MODEL_COUNT=$(find "$MODELS_DIR" -name "*.pt" 2>/dev/null | wc -l)
echo "Current model count: $MODEL_COUNT"

if [ "$MODEL_COUNT" -lt 5 ]; then
    echo "Models directory is empty or has few models. Downloading..."
    python3 /app/download_models.py "$MODELS_DIR"
    DOWNLOAD_EXIT_CODE=$?
else
    echo "Models directory already has models. Skipping download."
    DOWNLOAD_EXIT_CODE=0
fi

echo ""
echo "=========================================="
if [ $DOWNLOAD_EXIT_CODE -eq 0 ]; then
    echo "✓ Model download completed successfully"
elif [ $DOWNLOAD_EXIT_CODE -eq 1 ]; then
    echo "⚠ Some models failed to download, but continuing..."
    echo "  Models will be downloaded automatically on first use"
else
    echo "⚠ Model download had issues, but continuing..."
fi

# List models after download
echo ""
echo "Models in directory after download:"
ls -lh "$MODELS_DIR"/*.pt 2>/dev/null | awk '{print "  -", $9, "(" $5 ")"}' || echo "  (no models found)"

echo "=========================================="
echo "Starting CV Service..."
echo "=========================================="

# Start the application (use exec to replace shell process)
exec uvicorn main:app --host 0.0.0.0 --port 8001
