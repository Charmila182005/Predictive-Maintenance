"""
OpenRouter AI Explanation Service
---------------------------------
Generates a human-readable explanation from the ML prediction result.

OpenRouter is used only for explanation.
The ML model remains responsible for the actual prediction.
"""

import os
import requests

from dotenv import load_dotenv

load_dotenv()


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "nvidia/nemotron-3-super-120b-a12b:free"
)


def _fallback_explanation(result: dict) -> str:
    """
    Deterministic explanation used when OpenRouter is unavailable.
    """

    probability = float(result.get("failure_probability", 0))
    failure_mode = result.get("failure_mode")
    risk_level = result.get("risk_level", "Unknown")
    urgency = result.get("urgency", "Unknown")

    if failure_mode:
        return (
            f"The predictive maintenance model estimates a "
            f"{probability * 100:.1f}% probability of failure. "
            f"The most likely failure mode is {failure_mode}. "
            f"Risk level is {risk_level} and maintenance urgency is {urgency}. "
            f"This assessment is based on the machine operating parameters "
            f"and the trained AI4I predictive-maintenance model."
        )

    return (
        f"The predictive maintenance model estimates a "
        f"{probability * 100:.1f}% probability of failure. "
        f"No specific failure mode was identified by the current model. "
        f"The machine should continue to be monitored using its operating "
        f"parameters and condition indicators."
    )


def generate_ai_explanation(result: dict) -> str:
    """
    Send the ML result to OpenRouter and generate a concise explanation.

    If OpenRouter is unavailable, the system returns a deterministic
    fallback explanation instead of breaking the prediction API.
    """

    api_key = os.getenv("OPENROUTER_API_KEY")

    if not api_key:
        return _fallback_explanation(result)

    probability = float(result.get("failure_probability", 0))

    failure_mode = result.get("failure_mode")
    failure_mode_name = result.get("failure_mode_name")
    risk_level = result.get("risk_level")
    urgency = result.get("urgency")

    evidence = result.get("condition_evidence", [])
    contributing_features = result.get("contributing_features", [])
    recommendation = result.get("maintenance_recommendation")

    prompt = f"""
You are an AI assistant for a manufacturing predictive-maintenance system.

Explain the following ML prediction to a maintenance engineer.

ML prediction:
- Failure probability: {probability * 100:.1f}%
- Predicted failure: {result.get("predicted_failure")}
- Failure mode: {failure_mode}
- Failure mode name: {failure_mode_name}
- Risk level: {risk_level}
- Urgency: {urgency}
- Condition evidence: {evidence}
- Contributing features: {contributing_features}
- Maintenance recommendation: {recommendation}

Requirements:
1. Explain WHY the model considers the machine risky or healthy.
2. Mention the important operating conditions/evidence.
3. Mention the likely failure mode if one exists.
4. State the recommended maintenance action.
5. Do not claim absolute physical causality.
6. Do not invent sensor values or facts.
7. Keep the explanation concise, professional, and understandable.
8. Use 3-5 sentences.
"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You provide concise, evidence-based predictive "
                    "maintenance explanations."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.2,
        "max_tokens": 300,
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

        explanation = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        if explanation and isinstance(explanation, str):
            return explanation.strip()

    except Exception:
        pass

    return _fallback_explanation(result)