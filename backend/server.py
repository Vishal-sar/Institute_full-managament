from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from db import create_indexes
from seed import seed_all
from routes_auth import router as auth_router
from routes_public import router as public_router
from routes_admin import router as admin_router
from routes_portal import router as portal_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="EduPrime Academy API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "EduPrime Academy API", "status": "ok"}


api_router.include_router(auth_router)
api_router.include_router(public_router)
api_router.include_router(admin_router)
api_router.include_router(portal_router)
app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "")
allowed = [o for o in [frontend_url, "http://localhost:3000"] if o]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await create_indexes()
    try:
        await seed_all()
    except Exception as e:  # noqa
        logger.error(f"Seeding error: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    from db import client
    client.close()
