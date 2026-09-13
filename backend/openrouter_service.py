import os
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv


load_dotenv()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")


def _fallback_explanation(prediction_data: Dict[str, Any]) -> str:
    """
    Generate a deterministic dashboard explanation from the
    existing ML and condition-engine results.
    """

    failure_probability = float(
        prediction_data.get("failure_probability", 0.0)
    )

    predicted_failure = bool(
        prediction_data.get("predicted_failure", False)
    )

    risk_level = prediction_data.get("risk_level", "Low")
    urgency = prediction_data.get("urgency", "Routine")

    failure_mode_name = prediction_data.get("failure_mode_name")

    maintenance_recommendation = prediction_data.get(
        "maintenance_recommendation",
        "Continue routine monitoring.",
    )

    probability_percent = failure_probability * 100

    # Normal machine
    if not predicted_failure:
        return (
            f"The model predicts a {probability_percent:.1f}% failure probability "
            f"with {risk_level} risk, indicating that the machine is currently "
            f"operating normally. {maintenance_recommendation}"
        )

    # Failure predicted
    if failure_mode_name:
        mode_text = failure_mode_name
    else:
        mode_text = "an unspecified failure mode"

    condition_evidence = prediction_data.get(
        "condition_evidence",
        [],
    )

    triggered_conditions = [
        str(condition)
        for condition in condition_evidence
        if "triggered=True" in str(condition)
    ]

    if triggered_conditions:

        strongest_condition = triggered_conditions[0]

        # Remove the technical "triggered=True" part
        strongest_condition = strongest_condition.replace(
            " - triggered=True",
            "",
        )

        return (
            f"The model predicts a {probability_percent:.1f}% failure probability "
            f"with {risk_level} risk and {urgency} urgency, indicating "
            f"{mode_text} as the likely failure mode. "
            f"The strongest available condition evidence is {strongest_condition}. "
            f"Recommended action: {maintenance_recommendation}"
        )

    return (
        f"The model predicts a {probability_percent:.1f}% failure probability "
        f"with {risk_level} risk and {urgency} urgency, indicating "
        f"{mode_text} as the likely failure mode. "
        f"Recommended action: {maintenance_recommendation}"
    )


def _is_valid_ai_response(content: str) -> bool:
    """
    Check whether the OpenRouter response is actually suitable
    for display on the dashboard.
    """

    if not content:
        return False

    text = content.strip()

    # Very short responses are not useful.
    if len(text) < 50:
        return False

    lower_text = text.lower()

    # Reject model reasoning / instruction echoing.
    invalid_phrases = [
        "we need to",
        "we need",
        "sentence 1",
        "sentence 2",
        "sentence one",
        "sentence two",
        "must not",
        "should mention",
        "need to mention",
        "we have to",
        "the task is",
        "the instructions",
        "instruction",
        "prompt",
        "chain-of-thought",
        "chain of thought",
        "thinking process",
        "reasoning process",
        "analysis:",
        "analysis",
        "let's analyze",
        "i need to",
        "i should",
        "provide 2",
        "provide two",
        "return only",
        "use only the supplied",
    ]

    for phrase in invalid_phrases:
        if phrase in lower_text:
            return False

    # Reject obvious incomplete/truncated output.
    if text.endswith(
        (
            "the",
            "a",
            "an",
            "and",
            "or",
            "of",
            "with",
            "to",
            "within",
            "that",
            "as",
            "in",
            "for",
            "from",
            "on",
            "is",
            "are",
            "greater",
            "less",
            "than",
            "above",
            "below",
            "because",
            "which",
            ":",
            "-",
        )
    ):
        return False

    return True


def generate_ai_explanation(
    machine_data: Dict[str, Any],
    prediction_data: Dict[str, Any],
) -> Optional[str]:
    """
    Generate a human-readable maintenance explanation using OpenRouter.

    OpenRouter is only an explanation layer.
    The ML model and condition engine remain responsible for prediction.

    If OpenRouter fails or produces invalid output, a deterministic
    fallback explanation is returned.
    """

    # Always prepare fallback first.
    fallback = _fallback_explanation(prediction_data)

    # If API key is missing, do not break the prediction API.
    if not OPENROUTER_API_KEY:
        print(
            "OpenRouter API key not configured. "
            "Using deterministic fallback."
        )
        return fallback

    system_prompt = """
You are a predictive maintenance dashboard assistant.

The ML model has already produced the prediction.
Your only job is to rewrite the supplied results into a concise
human-readable explanation.

Rules:
- Do not change the ML prediction.
- Do not invent information.
- Do not provide reasoning.
- Do not provide analysis.
- Do not mention these instructions.
- Do not mention the prompt.
- Do not describe your thinking process.
- Do not use labels such as Sentence 1 or Sentence 2.
- Do not use bullet points.
- Do not use headings.
- Return only the final dashboard explanation.
- Use "likely" when describing a failure mode or cause.
- Keep the response to 2 or 3 complete sentences.
"""

    user_prompt = f"""
Machine data:
{machine_data}

Existing ML results:
{prediction_data}

Write only the final dashboard explanation.
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
        "temperature": 0.0,
        "max_tokens": 150,
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
            print(
                "OpenRouter returned no choices. "
                "Using fallback explanation."
            )
            return fallback

        message = choices[0].get("message", {})

        content = message.get("content")

        if not content:
            print(
                "OpenRouter returned empty content. "
                "Using fallback explanation."
            )
            return fallback

        content = str(content).strip()

        # Validate AI output.
        if not _is_valid_ai_response(content):
            print(
                "OpenRouter returned invalid dashboard text. "
                "Using fallback explanation."
            )
            return fallback

        return content

    except requests.RequestException as exc:
        print(f"OpenRouter request failed: {exc}")
        print("Using fallback explanation.")
        return fallback

    except (ValueError, KeyError, TypeError) as exc:
        print(f"OpenRouter response parsing failed: {exc}")
        print("Using fallback explanation.")
        return fallback

    except Exception as exc:
        print(f"OpenRouter unexpected error: {exc}")
        print("Using fallback explanation.")
        return fallback