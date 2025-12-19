# Frequently Asked Questions (FAQ)

Common issues, solutions, and troubleshooting guide for the AI Platform.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Docker & CV Service Issues](#docker--cv-service-issues)
3. [CUDA & GPU Issues](#cuda--gpu-issues)
4. [Configuration Issues](#configuration-issues)
5. [API & Backend Issues](#api--backend-issues)
6. [Frontend Issues](#frontend-issues)
7. [General Troubleshooting](#general-troubleshooting)

## Installation Issues

### Q: Failed to build installable wheels for grpcio

**Problem**: `grpcio` fails to build during installation.

**Solution**:
1. Install build dependencies:
   ```bash
   sudo apt-get install build-essential python3-dev
   # Or on RHEL/CentOS:
   sudo yum install gcc python3-devel
   ```

2. Upgrade pip and install grpcio separately:
   ```bash
   pip install --upgrade pip setuptools wheel
   pip install "grpcio>=1.49.1,<=1.58.0"
   ```

3. Or use the fix script:
   ```bash
   ./fix-grpc-install.sh
   ```

**Root Cause**: `pymilvus 2.3.4` requires `grpcio<=1.58.0`, which may not have pre-built wheels for Python 3.12.

**Fix Applied**: Upgraded `pymilvus` to `>=2.6.0` which supports newer `grpcio` versions with Python 3.12 wheels.

---

### Q: Package 'libgl1-mesa-glx' has no installation candidate in Docker

**Problem**: Docker build fails with missing `libgl1-mesa-glx` package.

**Solution**: The package name changed in newer Debian/Ubuntu versions. The Dockerfile now uses `libgl1` instead.

**Fix Applied**: Updated Dockerfile to use `libgl1` (modern package name) instead of deprecated `libgl1-mesa-glx`.

---

### Q: ln: failed to create symbolic link '/usr/bin/python3': File exists

**Problem**: Docker build fails when creating Python symlinks.

**Solution**: The CUDA base image already has Python installed. The Dockerfile now handles existing symlinks properly.

**Fix Applied**: Updated Dockerfile to remove existing symlinks before creating new ones using `rm -f` and `ln -sf`.

---

### Q: pydantic_settings error parsing CORS_ORIGINS

**Problem**: `SettingsError: error parsing value for field "CORS_ORIGINS"` when starting backend.

**Solution**: 
1. Ensure `.env` file has comma-separated format:
   ```env
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

2. The config now automatically parses comma-separated strings to lists.

**Fix Applied**: Added `field_validator` to parse comma-separated strings from `.env` files into Python lists.

---

## Docker & CV Service Issues

### Q: Error: could not select device driver "nvidia" with capabilities: [[gpu]]

**Problem**: Docker Compose fails to start CV service with GPU support.

**Solution**:
1. **Option 1**: Comment out GPU section in `docker-compose.yml` (use CPU):
   ```yaml
   # deploy:
   #   resources:
   #     reservations:
   #       devices:
   #         - driver: nvidia
   #           count: all
   #           capabilities: [gpu]
   ```

2. **Option 2**: Install NVIDIA Container Toolkit:
   ```bash
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   sudo apt-get update && sudo apt-get install -y nvidia-docker2
   sudo systemctl restart docker
   ```

**Note**: GPU support is optional. The CV service works fine on CPU, just slower.

---

### Q: Detection failed: Network Error / CV service unavailable

**Problem**: Cannot connect to CV service from frontend or backend.

**Solutions**:

1. **Check CV service is running**:
   ```bash
   docker compose ps cv-service
   docker compose logs cv-service
   ```

2. **Verify CV_SERVICE_URL in backend/.env**:
   - If backend runs in Docker: `CV_SERVICE_URL=http://cv-service:8001`
   - If backend runs locally: `CV_SERVICE_URL=http://localhost:8001`

3. **Check health endpoint**:
   ```bash
   curl http://localhost:8001/health
   curl http://localhost:8000/api/v1/cv/health
   ```

4. **Verify CORS configuration**:
   - Ensure frontend URL is in `CORS_ORIGINS` in `backend/.env`
   - Default: `CORS_ORIGINS=http://localhost:3000,http://localhost:5173`

**Fix Applied**: Added health status indicator in UI with 1-second refresh rate to show CV service status.

---

### Q: Detection error: CV service error (500): Internal Server Error

**Problem**: CV service returns 500 error during detection.

**Solutions**:

1. **Check CV service logs**:
   ```bash
   docker compose logs cv-service --tail 50
   ```

2. **Common causes**:
   - NumPy/PyTorch serialization issues (fixed)
   - Model loading errors
   - CUDA/GPU issues
   - Out of memory

3. **Restart CV service**:
   ```bash
   docker compose restart cv-service
   ```

**Fix Applied**: Fixed JSON serialization issues with numpy types in detection responses.

---

## CUDA & GPU Issues

### Q: GPU requires CUDA >= 12.8

**Problem**: Need CUDA 12.8+ for your GPU.

**Solution**:

1. **Set CUDA_VERSION in .env**:
   ```env
   CUDA_VERSION=12.8.0-cudnn-runtime-ubuntu22.04
   ```

2. **Or use build arg**:
   ```bash
   docker compose build cv-service --build-arg CUDA_VERSION=12.8.0-cudnn-runtime-ubuntu22.04
   ```

3. **If 12.8.0 doesn't exist**, try:
   - `12.7.0-cudnn-runtime-ubuntu22.04`
   - `12.6.0-cudnn-runtime-ubuntu22.04`
   - Or use devel image: `12.8.0-devel-ubuntu22.04`

**Note**: PyTorch CUDA 12.4+ wheels are compatible with CUDA 12.8 runtime.

**Documentation**: See `backend/cv-service/CUDA_12.8_SETUP.md` for detailed instructions.

---

### Q: How to verify CUDA is working in CV service?

**Solution**:
```bash
docker compose exec cv-service python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda}'); print(f'GPU count: {torch.cuda.device_count()}')"
```

Expected output:
```
CUDA available: True
CUDA version: 12.4 (or higher)
GPU count: 1 (or more)
```

---

## Configuration Issues

### Q: CORS errors in browser console

**Problem**: CORS policy errors when accessing API from frontend.

**Solution**:
1. Check `CORS_ORIGINS` in `backend/.env`:
   ```env
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

2. Ensure frontend URL matches exactly (including port)

3. Restart backend after changing `.env`

**Fix Applied**: Config now properly parses comma-separated CORS origins.

---

### Q: Backend can't connect to CV service

**Problem**: Backend shows "CV service unavailable" errors.

**Solution**:
1. **If backend runs locally** (not in Docker):
   ```env
   CV_SERVICE_URL=http://localhost:8001
   ```

2. **If backend runs in Docker**:
   ```env
   CV_SERVICE_URL=http://cv-service:8001
   ```

3. Verify CV service is accessible:
   ```bash
   curl http://localhost:8001/health
   ```

---

## API & Backend Issues

### Q: ModuleNotFoundError: No module named 'pydantic_settings'

**Problem**: Backend fails to start with missing module error.

**Solution**:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

Ensure you're using the virtual environment.

---

### Q: ValueError: 'numpy.float32' object is not iterable

**Problem**: Detection API returns 500 error with numpy serialization issues.

**Solution**: Fixed in latest version. Ensure you have the latest code.

**Fix Applied**: Added JSON serialization helpers to convert numpy types to native Python types.

---

### Q: pymilvus version conflict with grpcio

**Problem**: Dependency conflict between pymilvus and grpcio versions.

**Solution**: Upgraded `pymilvus` to `>=2.6.0` which supports newer grpcio versions.

**Fix Applied**: Updated `requirements.txt` to use `pymilvus>=2.6.0`.

---

## Frontend Issues

### Q: Health status shows "CV Service Offline" but service is running

**Problem**: Health check fails even though CV service is accessible.

**Solutions**:
1. Check backend can reach CV service:
   ```bash
   curl http://localhost:8000/api/v1/cv/health
   ```

2. Verify `CV_SERVICE_URL` in backend `.env` is correct

3. Check browser console for network errors

4. Verify CORS is configured correctly

**Fix Applied**: Added detailed error messages in health status indicator.

---

### Q: Bounding boxes not displaying on image

**Problem**: Detection works but no visual boxes appear.

**Solutions**:
1. Check if "Show Boxes" button is enabled (should be green)

2. Verify detection results contain bounding box data:
   - Check browser console for detection results
   - Ensure `detections.detections` array has items with `bbox` property

3. Try refreshing the page

**Fix Applied**: Added bounding box visualization with opacity and color coding.

---

## General Troubleshooting

### Q: How to check if all services are running?

**Solution**:
```bash
# Check Docker services
docker compose ps

# Check backend
curl http://localhost:8000/health

# Check CV service
curl http://localhost:8001/health

# Check frontend (should load in browser)
curl http://localhost:3000
```

---

### Q: How to view logs for debugging?

**Solution**:
```bash
# Backend logs (if running in terminal, check terminal output)
# Or check system logs

# CV service logs
docker compose logs cv-service

# All Docker services logs
docker compose logs

# Follow logs in real-time
docker compose logs -f cv-service
```

---

### Q: Port already in use errors

**Problem**: Port 8000, 8001, or 3000 is already in use.

**Solution**:
```bash
# Find process using port
lsof -i :8000
lsof -i :8001
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change ports in configuration
```

---

### Q: How to completely reset the installation?

**Solution**:
```bash
# Stop all services
docker compose down

# Remove volumes (deletes data)
docker compose down -v

# Remove Python venv
rm -rf backend/venv

# Remove node_modules
rm -rf frontend/node_modules

# Remove Docker images
docker rmi llm-platform-cv-service

# Reinstall
./install.sh
```

---

### Q: Where are detection results saved?

**Solution**:
- Detection results: `backend/uploads/results/detection/`
- Annotated images: Same directory with original filename
- Accessible via: `http://localhost:8000/static/results/detection/<filename>`

---

### Q: How to update dependencies?

**Solution**:
```bash
# Backend
cd backend
source venv/bin/activate
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm update

# CV Service (rebuild Docker image)
docker compose build cv-service --no-cache
```

---

## Getting More Help

1. **Check Documentation**:
   - `README.md` - Overview
   - `INSTALLATION.md` - Detailed setup
   - `CV_GUIDE.md` - CV features
   - `DOCKER_CV_GUIDE.md` - Docker setup

2. **Check Logs**:
   - Backend: Terminal output or logs
   - CV Service: `docker compose logs cv-service`
   - Frontend: Browser console (F12)

3. **Verify Setup**:
   - Run `./install.sh` again
   - Check `SETUP_CHECKLIST.md`

4. **API Documentation**:
   - Backend API: http://localhost:8000/docs
   - CV Service: http://localhost:8001/docs (if available)

---

## Common Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `grpcio build failed` | Missing build tools | Install `build-essential python3-dev` |
| `libgl1-mesa-glx not found` | Old package name | Use `libgl1` (already fixed) |
| `CORS_ORIGINS parsing error` | Config format issue | Use comma-separated string (already fixed) |
| `CV service unavailable` | Wrong URL or service down | Check `CV_SERVICE_URL` and service status |
| `nvidia driver not found` | GPU support not installed | Install nvidia-docker2 or disable GPU |
| `numpy.float32 not iterable` | Serialization issue | Fixed in latest version |
| `Port already in use` | Another service using port | Kill process or change port |

---

Last Updated: 2024-12-11
