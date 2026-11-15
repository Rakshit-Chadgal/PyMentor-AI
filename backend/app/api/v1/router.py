from fastapi import APIRouter

from app.api.v1 import auth, conversations, executions, health, personalization, practice

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(conversations.router)
api_router.include_router(executions.router)
api_router.include_router(personalization.router)
api_router.include_router(practice.router)
