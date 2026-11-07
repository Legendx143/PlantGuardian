import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Ensure UTF-8 output encoding in Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

OPENROUTER_API_KEY = os.getenv("OR_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# You can choose models such as:
DEFAULT_FARMING_MODEL = "meta-llama/llama-3.3-70b-instruct"

FARMING_SYSTEM_PROMPT = """You are an expert agronomist, horticulturist, and precision farming advisor.
Your job is to provide practical, region-specific, and step-by-step farming or tree-planting guidance based on:
- Plant / Tree / Crop Name
- Soil Type
- Location (State, District / Region)
- Season / Planting Time

Structure your response clearly with these markdown sections:
1. 🌿 **Suitability & Climate Feasibility**: Is this plant suitable for the selected soil, district, and season? Highlight temperature and rainfall compatibility.
2. 🚜 **Soil & Land Preparation**: How to prepare the soil, optimal pH, pit dimensions (for trees) or bed preparation (for crops), and basal organic manure.
3. 🌱 **Sowing / Planting Method**: Seed treatment, spacing, planting depth, and germination care.
4. 💧 **Watering & Irrigation Routine**: Seasonal watering frequency, critical irrigation stages, and waterlogging precautions.
5. 🧪 **Fertilizer & Nutrition Schedule**: Organic compost, NPK application timeline, and micronutrient support.
6. 🛡️ **Preventive Care & Pest Management**: Common local pests/fungal threats and proactive natural/chemical preventive measures.
7. 📅 **Growth Milestones & Harvest / Pruning Timeline**: Expected timeline from planting to maturity, flowering, and harvesting or pruning routine.
"""

def generate_farming_guide(
    plant_name: str,
    soil_type: str = "",
    state: str = "",
    district: str = "",
    season: str = "",
    model: str = DEFAULT_FARMING_MODEL
) -> str:
    """
    Calls OpenRouter LLM to generate comprehensive planting and care instructions.
    Location (state, district) is completely optional.
    """
    if not plant_name or not plant_name.strip():
        return "⚠️ Please enter a plant, tree, or crop name."

    api_key = os.getenv("OR_API_KEY", "").strip()
    if not api_key:
        return "❌ Error: OR_API_KEY is not configured in your .env file."

    state_str = state.strip() if (state and str(state).strip()) else "General / Not specified"
    district_str = district.strip() if (district and str(district).strip()) else "General / Not specified"

    user_query = f"""
    Please generate a comprehensive farming and care routine for:
    - **Plant / Crop Name**: {plant_name.strip()}
    - **Soil Type**: {soil_type or 'Not specified / Standard garden soil'}
    - **State**: {state_str}
    - **District / Region**: {district_str}
    - **Season / Timing**: {season or 'Current Season'}
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://plantguardian.ai",
        "X-Title": "PlantGuardian Farming Advisor"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": FARMING_SYSTEM_PROMPT},
            {"role": "user", "content": user_query}
        ],
        "temperature": 0.4,
        "max_tokens": 2048,
    }

    try:
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=45)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        return f"❌ OpenRouter API error: {str(e)}"
    except (KeyError, IndexError) as e:
        return f"❌ Unexpected response format: {str(e)}"


if __name__ == "__main__":
    print("--- Testing Farming AI Generation via OpenRouter (Location Optional) ---")
    guide = generate_farming_guide(
        plant_name="Tomato",
        soil_type="Loamy Soil",
        state="",
        district="",
        season="Rabi (Winter)"
    )
    print("\n--- Farming Guide Preview ---")
    print(guide[:600] + "\n...\n")
    print("✅ Pipeline test completed successfully!")
