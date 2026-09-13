import os
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv


load_dotenv()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")


def generate_ai_explanation(
    machine_data: Dict[str, Any],
    prediction_data: Dict[str, Any],
) -> Optional[str]:
    """
    Generate a human-readable maintenance explanation using OpenRouter.

    OpenRouter is used only as an explanation/insight layer.
    The actual failure prediction comes from the project's ML model
    and condition engine.
    """

    if not OPENROUTER_API_KEY:
        return None

    system_prompt = """
You are the AI explanation layer of a predictive maintenance system.

Your job is to explain the results produced by an existing ML model
and condition engine.

IMPORTANT RULES:
1. Do NOT replace or override the ML prediction.
2. Do NOT invent sensor values, failure modes, causes, or measurements.
3. Use "likely" or "possible" when discussing failure causes.
4. Base your explanation only on the supplied machine data and prediction results.
5. If the failure probability is low, explain that the machine appears normal
   and recommend continued monitoring.
6. If a failure is predicted, explain:
   - the predicted risk,
   - the likely failure mode,
   - the strongest condition evidence,
   - the recommended maintenance action.
7. Keep the explanation concise and suitable for a manufacturing dashboard.
8. Do not claim exact physical causality because this system provides
   decision support rather than definitive root-cause diagnosis.

Return a clear explanation in 3-5 sentences.
"""

    user_prompt = f"""
Machine operating data:
{machine_data}

Existing ML/condition-engine results:
{prediction_data}

Generate a concise maintenance insight for the dashboard.
"""

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt.strip(),
            },
            {
                "role": "user",
                "content": user_prompt.strip(),
            },
        ],
        "temperature": 0.2,
        "max_tokens": 300,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers=headers,
            json=payload,
            timeout=20,
        )

        response.raise_for_status()

        data = response.json()

        choices = data.get("choices", [])

        if not choices:
            return None

        message = choices[0].get("message", {})
        content = message.get("content")

        if not content:
            return None

        return str(content).strip()

    except requests.RequestException as exc:
        print(f"OpenRouter request failed: {exc}")
        return None

    except (ValueError, KeyError, TypeError) as exc:
        print(f"OpenRouter response parsing failed: {exc}")
        return None

    except Exception as exc:
        print(f"OpenRouter unexpected error: {exc}")
        return None