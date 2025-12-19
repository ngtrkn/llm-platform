# Documentation Index

Complete documentation for the AI Platform.

## Getting Started

1. **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide (5 minutes)
   - Fastest way to get up and running
   - Essential commands and first steps

2. **[INSTALLATION.md](INSTALLATION.md)** - Complete installation guide
   - Detailed installation steps
   - Prerequisites and requirements
   - Configuration options
   - Troubleshooting

3. **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** - Setup verification
   - Checklist to verify installation
   - Verification steps
   - Common issues

## Feature Documentation

4. **[README.md](README.md)** - Main documentation
   - Feature overview
   - Project structure
   - API endpoints
   - Usage examples

5. **[CV_GUIDE.md](CV_GUIDE.md)** - Computer Vision guide
   - Object detection usage
   - Model training guide
   - Dataset format requirements
   - Training strategies

6. **[DOCKER_CV_GUIDE.md](DOCKER_CV_GUIDE.md)** - Docker CV service
   - Docker architecture
   - Volume mounts
   - Configuration updates
   - Training strategies
   - GPU support

7. **[DOCKER_MIGRATION.md](DOCKER_MIGRATION.md)** - Docker migration details
   - Architecture changes
   - Migration steps
   - Benefits and rationale

## Installation Scripts

- **install.sh** - Automated installation script
  ```bash
  chmod +x install.sh
  ./install.sh
  ```

- **start-all.sh** - Start all services
  ```bash
  ./start-all.sh
  ```

- **start-backend.sh** - Start backend only
- **start-frontend.sh** - Start frontend only

## Quick Reference

### Installation

```bash
# Automated (recommended)
./install.sh

# Manual
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd ../frontend && npm install
docker-compose build cv-service
```

### Configuration

**Backend** (`backend/.env`):
- Add at least one LLM API key
- Configure database URLs (optional)
- Set CV service URL

**CV Service** (`backend/cv-service/config/.env`):
- Training parameters
- Model settings
- Device configuration

### Starting Services

```bash
# All services
./start-all.sh

# Separately
docker-compose up -d          # Databases + CV service
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- CV Service: http://localhost:8001

## Architecture

### Components

1. **Main Backend** (FastAPI)
   - LLM services
   - Database connections
   - API routing
   - CV service client

2. **CV Service** (Docker)
   - Object detection
   - Model training
   - Ultralytics/YOLO

3. **Frontend** (React)
   - LLM chat interface
   - Object detection UI
   - Training management

4. **Databases** (Docker)
   - PostgreSQL
   - MongoDB
   - Milvus

## Common Tasks

### Add LLM Provider

1. Edit `backend/app/services/llm_service.py`
2. Create provider class inheriting from `LLMProvider`
3. Implement `generate()` and `chat()` methods
4. Register in `LLMService._initialize_providers()`

### Add Database Provider

1. Edit `backend/app/services/database_service.py`
2. Create provider class inheriting from `DatabaseProvider`
3. Implement required methods
4. Register in `DatabaseService._initialize_providers()`

### Create Training Strategy

1. Create YAML file in `backend/cv-service/strategies/`
2. Define training parameters
3. Use strategy name when training via API

### Update CV Configuration

1. Edit `backend/cv-service/config/.env`
2. Or update `docker-compose.yml` environment variables
3. Restart CV service: `docker-compose restart cv-service`

## Troubleshooting

For detailed troubleshooting, see **[FAQ.md](FAQ.md)** - Comprehensive FAQ with solutions to common issues.

### Quick Troubleshooting

**Services Not Starting**:
- Check prerequisites: Python, Node.js, Docker
- Verify ports are not in use
- Check logs: `docker-compose logs`
- Review error messages

**API Keys Not Working**:
- Verify keys are correct
- Check `.env` file is in correct location
- Restart backend after changing `.env`

**CV Service Issues**:
- Check Docker is running
- Verify CV service is up: `docker-compose ps cv-service`
- Check logs: `docker-compose logs cv-service`
- Test connectivity: `curl http://localhost:8001/health`
- See FAQ for CV service connection issues

**Common Issues**:
- grpcio build failures → See FAQ
- CORS errors → See FAQ
- GPU/CUDA issues → See FAQ
- Detection errors → See FAQ

## Support

For issues:
1. **Check [FAQ.md](FAQ.md)** - Most common issues and solutions
2. Check relevant documentation file
3. Review logs
4. Verify setup checklist
5. Check API documentation

## Documentation Files

- **[README.md](README.md)** - Main overview and quick start
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute quick start guide
- **[INSTALLATION.md](INSTALLATION.md)** - Complete installation guide
- **[FEATURES.md](FEATURES.md)** - Feature list and capabilities
- **[FAQ.md](FAQ.md)** - Frequently asked questions and troubleshooting ⭐
- **[CV_GUIDE.md](CV_GUIDE.md)** - Computer Vision features guide
- **[DOCKER_CV_GUIDE.md](DOCKER_CV_GUIDE.md)** - Docker CV service guide
- **[DOCKER_MIGRATION.md](DOCKER_MIGRATION.md)** - Docker architecture details

## Contributing

When adding features:
1. Update relevant documentation
2. Add examples
3. Update API documentation
4. Test installation process
