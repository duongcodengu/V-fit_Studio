import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

if __name__ == "__main__":
    print("==================================================")
    print("🚀 Starting V-Fit AI Virtual Try-On Server...")
    print("📍 Backend API & Frontend: http://localhost:8000")
    print("📍 Frontend Interactive Studio: http://localhost:8000/static/frontend/index.html")
    print("📍 Swagger API Documentation: http://localhost:8000/docs")
    print("==================================================")
    uvicorn.run("backend.server:app", host="0.0.0.0", port=8000, reload=True)
