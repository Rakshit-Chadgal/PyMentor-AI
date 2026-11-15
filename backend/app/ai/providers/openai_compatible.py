import json
from collections.abc import AsyncIterator

import httpx

from app.ai.base import ChatTurn, StreamEvent
from app.core.errors import ProviderError, ProviderTimeoutError


class OpenAICompatibleProvider:
    name = "openai-compatible"

    def __init__(self, *, base_url: str, api_key: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def stream(
        self,
        messages: list[ChatTurn],
        *,
        model: str,
        max_output_tokens: int,
        response_schema: dict[str, object] | None,
        timeout: float,
    ) -> AsyncIterator[StreamEvent]:
        payload: dict[str, object] = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": max_output_tokens,
            "stream": True,
        }
        if response_schema is not None:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": "tutor_response", "schema": response_schema},
            }

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/chat/completions",
                    headers=self._headers(),
                    json=payload,
                ) as resp:
                    if resp.status_code >= 400:
                        body = await resp.aread()
                        raise ProviderError(
                            f"Provider returned {resp.status_code}: {body.decode('utf-8', 'ignore')[:200]}"
                        )

                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if raw == "[DONE]":
                            yield StreamEvent(kind="done")
                            return
                        try:
                            chunk = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {}).get("content")
                            if delta:
                                yield StreamEvent(kind="delta", text=str(delta))
                        usage = chunk.get("usage")
                        if isinstance(usage, dict):
                            yield StreamEvent(
                                kind="usage",
                                prompt_tokens=int(usage.get("prompt_tokens", 0)),
                                completion_tokens=int(usage.get("completion_tokens", 0)),
                            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError() from exc
        except httpx.HTTPError as exc:
            raise ProviderError(str(exc)) from exc

    async def complete_json(
        self,
        messages: list[ChatTurn],
        *,
        model: str,
        schema: dict[str, object],
        max_output_tokens: int,
        timeout: float,
    ) -> dict[str, object]:
        payload: dict[str, object] = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": max_output_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "tutor_response", "schema": schema},
            },
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers=self._headers(),
                    json=payload,
                )
                if resp.status_code >= 400:
                    raise ProviderError(f"Provider returned {resp.status_code}")
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                if not isinstance(result, dict):
                    raise ProviderError("Model response was not a JSON object")
                return result
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError() from exc
        except (httpx.HTTPError, KeyError, json.JSONDecodeError) as exc:
            raise ProviderError(str(exc)) from exc
