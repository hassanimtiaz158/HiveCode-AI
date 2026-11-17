import json
import logging
import re
from typing import Any, Dict, Optional, Tuple

import httpx

from app.core.config import settings

logger = logging.getLogger("app.core.llm")


def get_effective_llm_config() -> Tuple[str, str, str, str]:
    """
    Determines provider, model, api_key, and base_url automatically.
    - If key starts with 'sk-ant-' -> Anthropic (Claude 3.5 Haiku)
    - Otherwise -> Qwen (via OpenAI-compatible OpenRouter/custom endpoint)
    """
    api_key = (
        settings.anthropic_api_key
        or settings.llm_api_key
        or settings.qwen_api_key
        or ""
    ).strip()

    # Detect provider
    if api_key.startswith("sk-ant-"):
        provider = "anthropic"
        model = settings.llm_model if (settings.llm_model and "claude" in settings.llm_model) else "claude-3-5-haiku-20241022"
        base_url = "https://api.anthropic.com/v1"
    else:
        provider = "qwen"
        model = settings.llm_model if (settings.llm_model and "qwen" in settings.llm_model) else "qwen/qwen-2.5-coder-32b-instruct:free"
        base_url = settings.llm_base_url or "https://openrouter.ai/api/v1"

    return provider, model, api_key, base_url


def clean_json_text(text: str) -> str:
    """Strip markdown code fence wrappers from LLM output."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    json_mode: bool = True,
    fallback_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any] | str:
    """
    Unified LLM invocation wrapper.
    Seamlessly switches between Qwen (development) and Claude (production)
    based solely on the API key provided.
    """
    provider, model, api_key, base_url = get_effective_llm_config()
    logger.info(f"[LLM-OBSERVABILITY] 🤖 Invoking LLM: provider='{provider}', model='{model}'")

    if not api_key:
        logger.info("[LLM-OBSERVABILITY] ℹ️ No LLM_API_KEY detected; using deterministic heuristic fallback.")
        return fallback_data if (json_mode and fallback_data is not None) else (json.dumps(fallback_data) if fallback_data else "OK")

    try:
        raw_response_text = ""

        if provider == "anthropic":
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=api_key)
            response = await client.messages.create(
                model=model,
                max_tokens=2500,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            if response.content and len(response.content) > 0:
                raw_response_text = response.content[0].text

        else:
            # Qwen via OpenAI-compatible endpoint (e.g. OpenRouter)
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://voicetowebsite.ai",
                "X-Title": "Voice-to-Website AI",
            }
            payload: Dict[str, Any] = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            url = f"{base_url.rstrip('/')}/chat/completions"
            async with httpx.AsyncClient(timeout=45.0) as http_client:
                res = await http_client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                raw_response_text = data["choices"][0]["message"]["content"]

        if json_mode:
            cleaned = clean_json_text(raw_response_text)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                # Attempt regex search for embedded JSON object
                match = re.search(r"\{.*\}", cleaned, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                logger.warning(f"[LLM-OBSERVABILITY] ⚠️ JSON parse failed for output: {raw_response_text[:100]}... using fallback")
                return fallback_data if fallback_data is not None else {"raw": raw_response_text}

        return raw_response_text

    except Exception as exc:
        logger.warning(f"[LLM-OBSERVABILITY] ⚠️ LLM call to '{provider}' failed ({exc}); applying fallback response.")
        if json_mode and fallback_data is not None:
            return fallback_data
        raise exc
