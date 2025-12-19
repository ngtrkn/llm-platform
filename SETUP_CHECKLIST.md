# Setup Checklist

Use this checklist to ensure everything is properly configured.

## Pre-Installation

- [ ] Python 3.8+ installed (`python3 --version`)
- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Docker installed (optional, for CV features)
- [ ] Docker Compose installed (optional, for CV features)
- [ ] Git installed (if cloning repository)

## Installation

- [ ] Ran `./install.sh` or completed manual installation
- [ ] Backend virtual environment created
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] CV service Docker image built

## Configuration

### Backend Configuration (`backend/.env`)

- [ ] `.env` file created from `.env.example`
- [ ] At least one LLM API key configured:
  - [ ] `OPENAI_API_KEY` set
  - [ ] OR `GEMINI_API_KEY` set
  - [ ] OR `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` set
- [ ] `CV_SERVICE_URL` configured (default: `http://cv-service:8001`)
- [ ] Database URLs configured (optional):
  - [ ] PostgreSQL settings
  - [ ] MongoDB URL
  - [ ] Milvus settings

### CV Service Configuration

- [ ] `backend/cv-service/config/.env` created (optional)
- [ ] Training strategies directory exists: `backend/cv-service/strategies/`
- [ ] Upload directories created:
  - [ ] `backend/uploads/models/`
  - [ ] `backend/uploads/datasets/`
  - [ ] `backend/uploads/results/`

## Verification

### Services Running

- [ ] Docker services running (`docker-compose ps`)
- [ ] Backend server running (`curl http://localhost:8000/health`)
- [ ] Frontend server running (http://localhost:3000)
- [ ] CV service running (`curl http://localhost:8001/health`)

### Functionality Tests

- [ ] **LLM Chat**:
  - [ ] Can select LLM provider
  - [ ] Can send messages
  - [ ] Receives responses
  - [ ] Conversations save (if database configured)

- [ ] **Object Detection**:
  - [ ] Can upload image
  - [ ] Detection works
  - [ ] Results displayed
  - [ ] Annotated image downloadable

- [ ] **Model Training**:
  - [ ] Can upload dataset
  - [ ] Training starts
  - [ ] Training projects listed
  - [ ] Models accessible after training

## Post-Installation

- [ ] Read main documentation (`README.md`)
- [ ] Read installation guide (`INSTALLATION.md`)
- [ ] Read CV guide (`CV_GUIDE.md`)
- [ ] Read Docker CV guide (`DOCKER_CV_GUIDE.md`)
- [ ] Created training strategies (optional)
- [ ] Configured custom models (optional)

## Troubleshooting Checklist

If something doesn't work:

- [ ] Check all services are running
- [ ] Check logs: `docker-compose logs`
- [ ] Verify API keys are correct
- [ ] Check ports are not in use
- [ ] Verify Docker is running
- [ ] Check file permissions
- [ ] Review error messages in logs

## Production Checklist (if deploying)

- [ ] Environment variables set (not `.env` files)
- [ ] HTTPS configured
- [ ] Reverse proxy configured (nginx, etc.)
- [ ] Production WSGI server configured (gunicorn, etc.)
- [ ] Frontend built for production (`npm run build`)
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Logging configured
- [ ] Security headers configured
- [ ] Rate limiting configured

## Quick Commands Reference

```bash
# Start everything
./start-all.sh

# Start separately
./start-backend.sh
./start-frontend.sh
docker-compose up -d

# Check status
docker-compose ps
curl http://localhost:8000/health
curl http://localhost:8001/health

# View logs
docker-compose logs -f cv-service
docker-compose logs -f postgres

# Stop everything
docker-compose down
# Then Ctrl+C for backend/frontend
```

## Support

If you encounter issues:
1. Check the troubleshooting section in `INSTALLATION.md`
2. Review logs: `docker-compose logs`
3. Check API documentation: http://localhost:8000/docs
4. Verify all checklist items are completed
