import redis.asyncio as redis
import json
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def get_redis():
    return redis_client

async def set_session_active(session_id: str):
    await redis_client.set(f"session_active:{session_id}", "true", ex=3600)

async def remove_session(session_id: str):
    await redis_client.delete(f"session_active:{session_id}")

async def publish_flag(session_id: str, flag_data: dict):
    await redis_client.publish(f"session_flags:{session_id}", json.dumps(flag_data))

async def subscribe_flags(session_id: str):
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"session_flags:{session_id}")
    return pubsub
