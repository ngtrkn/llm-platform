# Use NVIDIA CUDA base image for CUDA 12.8+ support
# Build arg to specify CUDA version (default: 12.7.0, can be overridden to 12.8.0)
# Usage: docker build --build-arg CUDA_VERSION=12.8.0-cudnn-runtime-ubuntu22.04
ARG CUDA_VERSION=12.7.0-cudnn-runtime-ubuntu22.04
FROM nvidia/cuda:${CUDA_VERSION}

# Install Python 3.11 (if not already present)
# CUDA base images may already have Python installed
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create/update symlinks for python and pip
# Remove existing symlinks first if they exist and point to wrong version
RUN (rm -f /usr/bin/python3 || true) && \
    (rm -f /usr/bin/python || true) && \
    ln -sf /usr/bin/python3.11 /usr/bin/python && \
    ln -sf /usr/bin/python3.11 /usr/bin/python3 && \
    python3 --version

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Upgrade pip, setuptools, and wheel
RUN pip install --upgrade pip setuptools wheel

# Install PyTorch with CUDA 12.4+ support
# CUDA 12.8 runtime is backward compatible with CUDA 12.4+ PyTorch wheels
# PyTorch 2.4+ supports CUDA 12.4+, which works with CUDA 12.8 runtime
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu128

# Install other Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Verify CUDA availability (optional check)
RUN python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda if torch.cuda.is_available() else \"N/A\"}')" || echo "CUDA check completed"

# Copy application code
COPY . .

# Create directories for mounts
RUN mkdir -p /app/config /app/models /app/datasets /app/results /app/strategies

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health')" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
