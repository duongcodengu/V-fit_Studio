import sys
import os
from pathlib import Path
import uvicorn
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Add root directory and Controller directory to Python search path
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(ROOT_DIR / ".env")

if __name__ == "__main__":
    print("==================================================")
    print("🚀 Starting V-Fit AI Virtual Try-On Server...")
    print("📍 Backend API & Frontend: http://localhost:8000")
    print("📍 Frontend Interactive Studio: http://localhost:8000/static/frontend/index.html")
    print("📍 Swagger API Documentation: http://localhost:8000/docs")
    print("==================================================")
    uvicorn.run("Controller.server:app", host="0.0.0.0", port=8000, reload=True)
