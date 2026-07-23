import os
import httpx

REQUEST_TIMEOUT = 30.0


async def call_gemini(prompt: str, system: str | None, api_key: str, model: str = "gemini-2.5-flash", max_tokens=1200, temperature=0.3):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        res = await client.post(url, json=body)
        res.raise_for_status()
        data = res.json()
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
        if not text:
            raise ValueError("Empty response from Gemini")
        return text


async def call_claude(prompt: str, system: str | None, api_key: str, model: str = "claude-sonnet-5", max_tokens=1200, temperature=0.3):
    body = {"model": model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]}
    if system:
        body["system"] = system
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        res = await client.post("https://api.anthropic.com/v1/messages", json=body, headers=headers)
        res.raise_for_status()
        data = res.json()
        text = "\n".join(b.get("text", "") for b in data.get("content", []))
        if not text:
            raise ValueError("Empty response from Claude")
        return text


async def generate(prompt: str, system: str | None = None, max_tokens: int = 1200, temperature: float = 0.3) -> str:

    provider = os.getenv("LLM_PROVIDER", "gemini")
    api_key = os.getenv("LLM_API_KEY", "")
    model = os.getenv("LLM_MODEL", "gemini-2.5-flash" if provider == "gemini" else "claude-sonnet-5")

    if not api_key:
        raise ValueError("LLM_API_KEY not set in .env")

    if provider == "gemini":
        return await call_gemini(prompt, system, api_key, model, max_tokens, temperature)
    if provider == "claude":
        return await call_claude(prompt, system, api_key, model, max_tokens, temperature)
    raise ValueError(f"Unsupported provider: {provider}")
