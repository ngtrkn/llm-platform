#!/bin/bash

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    local missing=0
    
    if ! command_exists python3; then
        print_error "Python 3 is not installed"
        missing=1
    else
        python_version=$(python3 --version 2>&1 | awk '{print $2}')
        print_success "Python 3 found: $python_version"
    fi
    
    if ! command_exists node; then
        print_error "Node.js is not installed"
        missing=1
    else
        node_version=$(node --version)
        print_success "Node.js found: $node_version"
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed"
        missing=1
    else
        npm_version=$(npm --version)
        print_success "npm found: $npm_version"
    fi
    
    if ! command_exists docker; then
        print_warning "Docker is not installed (required for CV service)"
        print_warning "Install Docker: https://docs.docker.com/get-docker/"
    else
        docker_version=$(docker --version)
        print_success "Docker found: $docker_version"
    fi
    
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_warning "Docker Compose is not installed (required for CV service)"
        print_warning "Install Docker Compose: https://docs.docker.com/compose/install/"
    else
        print_success "Docker Compose found"
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Please install missing prerequisites and run the script again"
        exit 1
    fi
}

# Setup backend
setup_backend() {
    print_info "Setting up backend..."
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    print_info "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip, setuptools, and wheel
    print_info "Upgrading pip, setuptools, and wheel..."
    pip install --upgrade pip setuptools wheel >/dev/null 2>&1
    
    # Check if build tools are needed for grpcio
    print_info "Checking for build dependencies..."
    if ! python3 -c "import sysconfig; sysconfig.get_config_var('CC')" 2>/dev/null; then
        print_warning "Build tools may be required. Installing system dependencies..."
        if command_exists apt-get; then
            sudo apt-get update >/dev/null 2>&1 && \
            sudo apt-get install -y build-essential python3-dev >/dev/null 2>&1 || \
            print_warning "Could not install build dependencies automatically. Please install manually: sudo apt-get install build-essential python3-dev"
        elif command_exists yum; then
            sudo yum install -y gcc python3-devel >/dev/null 2>&1 || \
            print_warning "Could not install build dependencies automatically. Please install manually: sudo yum install gcc python3-devel"
        elif command_exists dnf; then
            sudo dnf install -y gcc python3-devel >/dev/null 2>&1 || \
            print_warning "Could not install build dependencies automatically. Please install manually: sudo dnf install gcc python3-devel"
        fi
    fi
    
    # Install dependencies
    print_info "Installing backend dependencies..."
    pip install -r requirements.txt
    
    # Copy .env.example to .env if .env doesn't exist
    if [ ! -f ".env" ]; then
        print_info "Creating .env file from .env.example..."
        cp .env.example .env
        print_warning "Please edit backend/.env and add your API keys and database configuration"
    else
        print_success ".env file already exists"
    fi
    
    # Create upload directories
    print_info "Creating upload directories..."
    mkdir -p uploads/{models,datasets,results,temp}
    mkdir -p cv-service/{strategies,config}
    
    cd ..
    print_success "Backend setup complete!"
}

# Setup frontend
setup_frontend() {
    print_info "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    else
        print_info "Frontend dependencies already installed"
    fi
    
    cd ..
    print_success "Frontend setup complete!"
}

# Setup CV service (Docker)
setup_cv_service() {
    print_info "Setting up CV service (Docker)..."
    
    if ! command_exists docker; then
        print_warning "Docker not found. Skipping CV service setup."
        print_warning "Install Docker to use CV features: https://docs.docker.com/get-docker/"
        return
    fi
    
    if ! docker ps >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker and run the script again."
        return
    fi
    
    # Build CV service image
    print_info "Building CV service Docker image..."
    docker-compose build cv-service || docker compose build cv-service
    
    print_success "CV service setup complete!"
}

# Create startup scripts
create_startup_scripts() {
    print_info "Creating startup scripts..."
    
    # Backend startup script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
source venv/bin/activate
echo "Starting backend server on http://localhost:8000"
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
EOF
    
    # Frontend startup script
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/frontend"
echo "Starting frontend server on http://localhost:3000"
npm run dev
EOF
    
    # Full stack startup script
    cat > start-all.sh << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting all services..."
echo ""

# Start databases and CV service with Docker Compose
echo "Starting Docker services (databases + CV service)..."
cd "$SCRIPT_DIR"
docker-compose up -d || docker compose up -d

echo "Waiting for services to be ready..."
sleep 5

# Start backend
echo "Starting backend..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "Services started!"
echo "=========================================="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose down || docker compose down; exit" INT TERM
wait
EOF
    
    chmod +x start-backend.sh start-frontend.sh start-all.sh
    
    print_success "Startup scripts created!"
}

# Main installation
main() {
    echo ""
    echo "=========================================="
    echo "  AI Platform Installation Script"
    echo "=========================================="
    echo ""
    
    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Check prerequisites
    check_prerequisites
    echo ""
    
    # Setup backend
    setup_backend
    echo ""
    
    # Setup frontend
    setup_frontend
    echo ""
    
    # Setup CV service
    setup_cv_service
    echo ""
    
    # Create startup scripts
    create_startup_scripts
    echo ""
    
    # Final instructions
    echo "=========================================="
    print_success "Installation complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Edit backend/.env and add your API keys:"
    echo "   - OPENAI_API_KEY (or GEMINI_API_KEY, or AZURE_OPENAI_*)"
    echo "   - Database credentials (optional but recommended)"
    echo ""
    echo "2. Start services:"
    echo "   - Quick start: ./start-all.sh"
    echo "   - Or separately:"
    echo "     ./start-backend.sh  (in one terminal)"
    echo "     ./start-frontend.sh (in another terminal)"
    echo ""
    echo "3. Access the application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:8000"
    echo "   - API Docs: http://localhost:8000/docs"
    echo ""
    echo "For more information, see README.md"
    echo ""
}

# Run main function
main
