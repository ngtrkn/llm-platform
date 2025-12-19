from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.routes import router
from app.api.cv_routes import router as cv_router

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router, prefix=settings.API_V1_STR, tags=["llm"])
app.include_router(cv_router, prefix=settings.API_V1_STR, tags=["computer-vision"])

# Mount static files for results
from pathlib import Path
results_dir = Path("uploads/results")
results_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/results", StaticFiles(directory=str(results_dir)), name="results")


@app.get("/")
async def root():
    return {
        "message": "LLM Platform API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
