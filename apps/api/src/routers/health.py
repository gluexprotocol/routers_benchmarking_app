from fastapi import APIRouter

router = APIRouter()


@router.get("/", tags=["health"])
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}
