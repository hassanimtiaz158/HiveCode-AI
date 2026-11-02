import time
from collections import defaultdict
from typing import Dict, List

from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self):
        self._history: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds

        # Discard expired timestamps
        valid_timestamps = [ts for ts in self._history[key] if ts > window_start]
        self._history[key] = valid_timestamps

        if len(valid_timestamps) >= max_requests:
            return False

        self._history[key].append(now)
        return True

    def reset(self):
        """Clear all tracking buckets (useful for test isolation)."""
        self._history.clear()


limiter = SlidingWindowRateLimiter()


def rate_limit(max_requests: int, window_seconds: int, key_prefix: str = ""):
    """FastAPI route dependency enforcing sliding-window rate limits per client IP."""
    async def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        rate_key = f"{key_prefix}:{client_ip}"

        if not limiter.is_allowed(rate_key, max_requests, window_seconds):
            wait_mins = max(1, window_seconds // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many attempts. Please wait {wait_mins} minute{'s' if wait_mins > 1 else ''} before trying again.",
            )
    return dependency
