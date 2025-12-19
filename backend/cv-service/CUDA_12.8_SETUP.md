# CUDA 12.8 Setup Instructions

If your GPU requires CUDA 12.8 specifically, follow these steps:

## Quick Setup (Recommended)

1. Create or update `.env` file in the project root:
   ```bash
   CUDA_VERSION=12.8.0-cudnn-runtime-ubuntu22.04
   ```

2. Rebuild the CV service:
   ```bash
   docker compose build cv-service
   docker compose up -d cv-service
   ```

## Option 1: Use Environment Variable (Easiest)

The docker-compose.yml supports a `CUDA_VERSION` environment variable:

1. Set in your `.env` file or export:
   ```bash
   export CUDA_VERSION=12.8.0-cudnn-runtime-ubuntu22.04
   ```

2. Rebuild:
   ```bash
   docker compose build cv-service
   ```

## Option 2: Check if CUDA 12.8 Image Exists

1. Check if CUDA 12.8 image exists:
   ```bash
   docker pull nvidia/cuda:12.8.0-cudnn-runtime-ubuntu22.04
   ```

2. If it exists, use the environment variable method above.

3. If runtime image doesn't exist, try devel image:
   ```bash
   export CUDA_VERSION=12.8.0-devel-ubuntu22.04
   docker compose build cv-service
   ```

## Option 3: Use Latest CUDA 12.x (Default)

The default uses CUDA 12.7.0, which should work with CUDA 12.8 runtime due to backward compatibility.

## Option 3: Build with Specific CUDA Version

If you need to ensure CUDA 12.8 specifically:

1. Check your host CUDA version:
   ```bash
   nvidia-smi
   ```

2. Update Dockerfile to match your host CUDA version

3. Rebuild the image:
   ```bash
   docker compose build cv-service
   ```

## Verification

After building, verify CUDA version:
```bash
docker compose exec cv-service python -c "import torch; print(f'CUDA version: {torch.version.cuda}'); print(f'CUDA available: {torch.cuda.is_available()}')"
```

## Notes

- PyTorch CUDA 12.4+ wheels are compatible with CUDA 12.8 runtime
- The Docker image CUDA version should match or be compatible with your host CUDA version
- If using CUDA 12.8, ensure NVIDIA Container Toolkit is updated on your host
