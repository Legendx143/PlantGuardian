"""
PlantGuardian AI Pipeline
=========================
Complete end-to-end plant disease diagnosis module.

Workflow:
    1. User provides symptom text (typed or voice-transcribed)
    2. User uploads a plant image
    3. System analyzes image via OpenRouter Vision API
    4. System extracts symptoms from user text AND image description
    5. System matches combined symptoms against evidence database
    6. System ranks disease candidates
    7. System identifies nutrient deficiencies from evidence
    8. System generates care recommendations
    9. System returns comprehensive results

Public API:
    - load_evidence_database: Load and prepare the evidence CSV
    - analyze_plant_image: Analyze plant image via OpenRouter Vision API
    - transcribe_audio: Convert voice recording to text
    - validate_symptom_description: Validate user symptom text
    - extract_symptom_terms: Extract symptoms from text
    - normalize_symptoms: Deduplicate and normalize symptom list
    - identify_crop: Detect crop name from text
    - match_plant_evidence: Find matching evidence records
    - rank_plant_evidence: Rank matched evidence records
    - classify_plant_problem: Triage nutrient vs disease vs pest
    - identify_nutrient_deficiencies: Detect deficiencies from evidence
    - get_care_recommendation: Get care guidance for a diagnosis
    - identify_additional_evidence: Generate follow-up questions
    - analyze_plantguardian: Complete end-to-end analysis
"""

import base64
import os
import re
from pathlib import Path

import pandas as pd
import requests


# ═══════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════

DEFAULT_ANALYSIS_PROMPT = (
    "Analyze this plant image carefully. Describe:\n"
    "1. The type of plant or crop if identifiable\n"
    "2. Any visible symptoms of disease, pest damage, or nutrient deficiency\n"
    "3. Leaf color changes (yellowing, browning, discoloration)\n"
    "4. Spots, lesions, or unusual markings on leaves or stems\n"
    "5. Leaf shape abnormalities (curling, wilting, holes, deformation)\n"
    "6. Overall plant health assessment\n\n"
    "Be specific and descriptive about what you observe. "
    "Do not diagnose — only describe the visible symptoms."
)

# Recognized symptom phrases for extraction from text.
SYMPTOM_TERMS = [
    "yellowing",
    "yellow leaves",
    "leaves turning yellow",
    "brown spots",
    "brown spot",
    "leaf spots",
    "wilting",
    "leaf curling",
    "curling leaves",
    "dry leaves",
    "leaf blight",
    "holes in leaves",
    "white spots",
    "black spots",
    "stunted growth",
    "root rot",
    "stem rot",
    "mosaic pattern",
    "drooping leaves",
    "leaf discoloration",
    "brown edges",
    "leaf edges browning",
    "purple leaves",
    "dark leaves",
    "powdery coating",
    "white powder",
    "rust spots",
    "orange spots",
    "leaf mines",
    "winding tunnels",
    "sticky residue",
    "sooty mold",
    "curled leaves",
    "distorted growth",
    "small curds",
    "hollow stems",
    "blossom end rot",
    "fruit rot",
    "stem borer",
    "aphids on leaves",
    "insects on leaves",
    "webbing on leaves",
    "defoliation",
    "ring spots",
]

# Crop names for identification from user text.
CROP_NAMES = [
    "banana", "barley", "bean", "bitter gourd", "bottle gourd",
    "brinjal", "eggplant", "broad bean", "cabbage", "canola",
    "capsicum", "carrot", "cauliflower", "chickpea", "chikoo",
    "chilli", "pepper", "citrus", "coriander", "cotton",
    "cowpea", "crossandra", "cucumber", "custard apple",
    "garlic", "gram", "green gram", "groundnut", "peanut",
    "guava", "kidney bean", "lady's finger", "okra",
    "lemon", "lemongrass", "maize", "corn", "mango",
    "marigold", "moringa", "mustard", "onion", "paddy",
    "papaya", "pea", "pearl millet", "potato",
    "pumpkin", "radish", "red gram", "rice", "ridge gourd",
    "rose", "spinach", "sponge gourd", "squash",
    "strawberry", "sugarcane", "soybean", "tobacco",
    "tomato", "turmeric", "watermelon", "wheat", "apple", "grape",
]

# Symptom groups map text phrases to canonical group names.
SYMPTOM_GROUPS = {
    "leaves turning yellow": "yellowing",
    "yellow leaves": "yellowing",
    "yellowing of leaves": "yellowing",
    "yellowing": "yellowing",
    "brown spots": "brown_spots",
    "brown spot": "brown_spots",
    "brown lesions": "brown_spots",
    "brown blotches": "brown_spots",
    "brown blotch": "brown_spots",
    "leaf spots": "brown_spots",
    "spots on leaves": "brown_spots",
    "wilting": "wilting",
    "drooping": "wilting",
    "drooping leaves": "wilting",
    "leaf curling": "curling",
    "curling leaves": "curling",
    "curled leaves": "curling",
    "mosaic pattern": "mosaic",
    "mosaic": "mosaic",
    "powdery coating": "powdery_mildew",
    "white powder": "powdery_mildew",
    "rust spots": "rust",
    "orange spots": "rust",
    "stunted growth": "stunted",
    "holes in leaves": "holes",
    "leaf mines": "mining",
    "winding tunnels": "mining",
}

# Regex patterns per symptom group for flexible matching.
SYMPTOM_PATTERNS = {
    "yellowing": [
        r"\byellow(?:ing|ed)?\b",
        r"\bchlorosis\b",
        r"\bleaves?\s+(?:are\s+)?turning\s+yellow\b",
    ],
    "brown_spots": [
        r"\b(?:brown|reddish[- ]brown|dark brown)"
        r"(?:\s+[\w-]+){0,2}\s+"
        r"(?:spots?|blotches?|lesions?)\b",
        r"\bleaf\s+(?:spots?|blotches?)\b",
        r"\b(?:spots?|blotches?)\s+(?:on|of)\s+"
        r"(?:the\s+)?(?:leaf|leaves|foliage)\b",
        r"\bbrown\s+speckles?\b",
    ],
    "wilting": [
        r"\bwilt(?:ing|ed)?\b",
        r"\bdroop(?:ing|ed)?\b",
    ],
    "curling": [
        r"\bcurl(?:ing|ed)?\s*(?:leaves?)?\b",
        r"\bleaf\s+curl\b",
    ],
    "mosaic": [
        r"\bmosaic\b",
        r"\bmottl(?:ing|ed)\b",
    ],
    "powdery_mildew": [
        r"\bpowdery\s+(?:mildew|coating|growth)\b",
        r"\bwhite\s+powder(?:y)?\b",
    ],
    "rust": [
        r"\brust\s+(?:spots?|pustules?)\b",
        r"\borange\s+(?:spots?|pustules?)\b",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# Diagnosis → Care Category Mapping
# ═══════════════════════════════════════════════════════════════════════════

DIAGNOSIS_CATEGORIES = {
    # Nutrient Deficiencies
    "Nitrogen Deficiency": "nitrogen_deficiency",
    "Phosphorus Deficiency": "phosphorus_deficiency",
    "Potassium Deficiency": "potassium_deficiency",
    "Calcium Deficiency": "calcium_deficiency",
    "Magnesium Deficiency": "magnesium_deficiency",
    "Boron Deficiency": "boron_deficiency",

    # Fungal — Foliar
    "Early Blight": "fungal_foliar",
    "Late Blight": "fungal_foliar",
    "Alternaria Blight": "fungal_foliar",
    "Leaf Spot": "fungal_foliar",
    "Cercospora Leaf Spot": "fungal_foliar",
    "Sigatoka Leaf Spot": "fungal_foliar",
    "Turcicum Leaf Blight": "fungal_foliar",
    "Blast": "fungal_foliar",
    "Anthracnose": "fungal_foliar",
    "Black Rot": "fungal_foliar",
    "Purple Blotch": "fungal_foliar",
    "Phomopsis Blight": "fungal_foliar",
    "Ascochyta Blight": "fungal_foliar",
    "Banded Leaf and Sheath Blight": "fungal_foliar",

    # Fungal — Mildew
    "Powdery Mildew": "fungal_mildew",
    "Downy Mildew": "fungal_mildew",

    # Fungal — Rust
    "Rust": "fungal_rust",
    "Stripe Rust": "fungal_rust",
    "White Rust": "fungal_rust",

    # Fungal — Smut
    "Smut": "fungal_smut",
    "Loose Smut": "fungal_smut",

    # Fungal — Soilborne
    "Root Rot": "fungal_soilborne",
    "Collar Rot": "fungal_soilborne",
    "Fusarium Wilt": "fungal_soilborne",
    "Wilt": "fungal_soilborne",
    "Common Scab": "fungal_soilborne",
    "Phytophthora Blight": "fungal_soilborne",

    # Bacterial
    "Bacterial Blight": "bacterial_disease",
    "Bacterial Canker": "bacterial_disease",
    "Bacterial Wilt": "bacterial_disease",
    "Citrus Canker": "bacterial_disease",

    # Viral
    "Leaf Curl Virus": "viral_disease",
    "Mosaic Virus": "viral_disease",
    "Tobacco Mosaic Virus": "viral_disease",
    "Papaya Ring Spot Virus": "viral_disease",
    "Sterility Mosaic": "viral_disease",

    # Sucking Pests
    "Aphids": "sucking_pest",
    "Jassids": "sucking_pest",
    "Whiteflies": "sucking_pest",
    "Mealybugs": "sucking_pest",
    "Papaya Mealybug": "sucking_pest",
    "Thrips": "sucking_pest",
    "Scale Insects": "sucking_pest",
    "Leaf Hopper": "sucking_pest",
    "Mango Hopper": "sucking_pest",
    "Citrus Psyllid": "sucking_pest",
    "Rice Bug": "sucking_pest",

    # Mites
    "Mites": "mite_pest",

    # Chewing Pests
    "Armyworm": "chewing_pest",
    "Fall Armyworm": "chewing_pest",
    "Bollworm": "chewing_pest",
    "Fruit Borer": "chewing_pest",
    "Pod Borer": "chewing_pest",
    "Shoot and Fruit Borer": "chewing_pest",
    "Stem Borer": "chewing_pest",
    "Tobacco Caterpillar": "chewing_pest",
    "Cabbage Looper": "chewing_pest",
    "Cutworms": "chewing_pest",
    "Diamondback Moth": "chewing_pest",
    "Bark Eating Caterpillar": "chewing_pest",

    # Leaf Miner
    "Leaf Miner": "leaf_miner",

    # Beetles & Weevils
    "Cucumber Beetle": "beetle_pest",
    "Red Pumpkin Beetle": "beetle_pest",
    "Banana Weevil": "beetle_pest",

    # Fruit Fly
    "Fruit Fly": "fruit_fly",

    # Healthy
    "Healthy": "healthy",
}


# ═══════════════════════════════════════════════════════════════════════════
# Comprehensive Care Guidance Database
# ═══════════════════════════════════════════════════════════════════════════

CARE_GUIDANCE = {
    # ── Nutrient Deficiencies ─────────────────────────────────────────────
    "nitrogen_deficiency": {
        "condition_type": "nutrient_deficiency",
        "nutrient": "Nitrogen (N)",
        "symptoms": (
            "Older (lower) leaves turn uniformly yellow first and may "
            "drop. Growth is slow and stems are thin."
        ),
        "clues": [
            "Nitrogen deficiency causes older leaves to yellow first.",
            "Uniform yellowing — not between veins — points to nitrogen.",
            "Plants may appear pale green overall with stunted growth.",
        ],
        "care_guidance": [
            "Apply nitrogen-rich fertilizer such as urea (46-0-0) at recommended rates for your crop.",
            "Side-dress with ammonium sulfate or calcium ammonium nitrate.",
            "Incorporate well-composted organic matter or aged manure into the soil.",
            "For quick response, apply a foliar spray of 2% urea solution.",
            "Avoid over-application — excess nitrogen attracts pests and delays fruiting.",
        ],
        "supplementation": (
            "Apply 20–30 kg N/ha as urea or ammonium sulfate. "
            "For home gardens, use 1 tablespoon of balanced fertilizer (10-10-10) per plant. "
            "Compost and well-rotted manure are good organic sources."
        ),
        "additional_evidence_needed": [
            "Are the oldest (lowest) leaves affected first?",
            "Is the yellowing uniform across the leaf, or between veins?",
            "What fertilizer has been applied, and when?",
        ],
        "avoid": [
            "Do not assume yellowing is always nitrogen deficiency — it can be caused by overwatering, disease, or other nutrients.",
        ],
        "sources": [
            "https://extension.umn.edu/nitrogen/understanding-nitrogen",
        ],
    },

    "phosphorus_deficiency": {
        "condition_type": "nutrient_deficiency",
        "nutrient": "Phosphorus (P)",
        "symptoms": (
            "Leaves develop a dark green or purplish tint, especially on "
            "undersides. Root development is poor and flowering is delayed."
        ),
        "clues": [
            "Phosphorus deficiency causes dark or purple discoloration.",
            "Poor root development and delayed flowering are common signs.",
            "Older leaves may show symptoms first.",
        ],
        "care_guidance": [
            "Apply superphosphate (SSP) or diammonium phosphate (DAP) to the soil.",
            "Use bone meal as an organic phosphorus source.",
            "Ensure soil pH is between 6.0–7.0, as phosphorus availability drops in acidic or alkaline soils.",
            "Apply phosphorus at planting time, as it does not move easily through soil.",
        ],
        "supplementation": (
            "Apply 40–60 kg P₂O₅/ha as SSP or DAP. "
            "For home gardens, mix 2 tablespoons of bone meal per planting hole. "
            "Rock phosphate is a slow-release organic option."
        ),
        "additional_evidence_needed": [
            "Are leaves dark green or purplish, especially underneath?",
            "Is root growth noticeably poor?",
            "What is the soil pH?",
        ],
        "avoid": [
            "Do not apply phosphorus excessively — it can lock up other micronutrients like zinc and iron.",
        ],
        "sources": [
            "https://extension.umn.edu/phosphorus-and-potassium/phosphorus-garden",
        ],
    },

    "potassium_deficiency": {
        "condition_type": "nutrient_deficiency",
        "nutrient": "Potassium (K)",
        "symptoms": (
            "Brown scorching and curling of leaf edges (marginal necrosis). "
            "Older leaves affected first. Weak stems and poor fruit quality."
        ),
        "clues": [
            "Potassium deficiency causes browning at leaf margins.",
            "Older leaves show symptoms first and may become crispy.",
            "Stems may be weak, and fruits may be small or poorly colored.",
        ],
        "care_guidance": [
            "Apply muriate of potash (KCl, 0-0-60) or sulfate of potash (K₂SO₄).",
            "Wood ash is a good organic potassium source — apply lightly.",
            "Banana peels composted and added to soil provide potassium slowly.",
            "Ensure adequate watering — potassium uptake requires moisture.",
        ],
        "supplementation": (
            "Apply 40–60 kg K₂O/ha as muriate of potash. "
            "For home gardens, use 1 tablespoon of 0-0-60 per plant, "
            "or work in wood ash at 1 cup per square meter."
        ),
        "additional_evidence_needed": [
            "Are leaf edges turning brown or scorched?",
            "Are older leaves affected before newer ones?",
            "Are fruits small or poorly developed?",
        ],
        "avoid": [
            "Do not confuse salt burn with potassium deficiency — check soil salinity.",
        ],
        "sources": [
            "https://extension.umn.edu/phosphorus-and-potassium/potassium-crop-production",
        ],
    },

    "calcium_deficiency": {
        "condition_type": "nutrient_deficiency",
        "nutrient": "Calcium (Ca)",
        "symptoms": (
            "Young leaves curl upward and become distorted. Growing tips "
            "may die. Blossom end rot in tomatoes and peppers."
        ),
        "clues": [
            "Calcium deficiency affects young, growing tissues first.",
            "Blossom end rot is a classic calcium-related problem in fruiting crops.",
            "New leaves may be small, distorted, or cup-shaped.",
        ],
        "care_guidance": [
            "Apply gypsum (calcium sulfate) to the soil without changing pH.",
            "Use calcium nitrate as a foliar spray for quick correction.",
            "Lime the soil if pH is below 6.0 (use agricultural lime or dolomite).",
            "Maintain consistent watering — irregular watering impairs calcium uptake.",
        ],
        "supplementation": (
            "Apply gypsum at 500–1000 kg/ha, or lime if soil is acidic. "
            "For home gardens, dissolve 1 tablespoon of calcium nitrate in "
            "1 gallon of water and apply as a foliar spray."
        ),
        "additional_evidence_needed": [
            "Are younger leaves or growing tips affected?",
            "Is there blossom end rot on fruits?",
            "Is watering consistent or irregular?",
        ],
        "avoid": [
            "Do not over-lime — test soil pH before applying lime.",
        ],
        "sources": [
            "https://extension.umn.edu/nutrient-management/secondary-macronutrients",
        ],
    },

    "magnesium_deficiency": {
        "condition_type": "nutrient_deficiency",
        "nutrient": "Magnesium (Mg)",
        "symptoms": (
            "Interveinal yellowing (chlorosis) on older leaves — veins stay "
            "green while tissue between veins turns yellow. Leaves may curl upward."
        ),
        "clues": [
            "Magnesium deficiency causes yellowing BETWEEN veins, not uniform yellowing.",
            "Older leaves are affected first because Mg is mobile in the plant.",
            "Often occurs in acidic, sandy, or heavily leached soils.",
        ],
        "care_guidance": [
            "Apply Epsom salt (magnesium sulfate) as a foliar spray or soil drench.",
            "Foliar spray: dissolve 2 tablespoons of Epsom salt per gallon of water.",
            "Soil drench: apply 1 tablespoon of Epsom salt per foot of plant height, monthly.",
            "Dolomitic lime provides both calcium and magnesium if soil is acidic.",
        ],
        "supplementation": (
            "Foliar: 2% MgSO₄ solution sprayed on leaves. "
            "Soil: 15–25 kg Mg/ha as magnesium sulfate. "
            "For home gardens, 1–2 tablespoons of Epsom salt per gallon of water."
        ),
        "additional_evidence_needed": [
            "Is yellowing between the veins (interveinal), with veins remaining green?",
            "Are older leaves affected first?",
            "Is the soil sandy or acidic?",
        ],
        "avoid": [
            "Do not confuse with iron deficiency — iron affects YOUNG leaves, magnesium affects OLD leaves.",
        ],
        "sources": [
            "https://extension.umn.edu/nutrient-management/secondary-macronutrients",
        ],
    },

    "boron_deficiency": {
        "condition_type": "nutrient_deficiency",
        "nutrient": "Boron (B)",
        "symptoms": (
            "Growing points die or become distorted. Hollow stems, "
            "small or misshapen curds in cauliflower. Thick, brittle leaves."
        ),
        "clues": [
            "Boron deficiency affects growing tips and reproductive structures.",
            "Hollow stems and cracked roots are characteristic signs.",
            "Cauliflower and broccoli develop small, discolored curds.",
        ],
        "care_guidance": [
            "Apply borax (sodium borate) at very low rates — boron is needed in tiny amounts.",
            "Soil application: 1–2 kg borax per hectare (do not exceed recommended rates).",
            "Foliar spray: dissolve 1 gram of borax in 1 liter of water.",
            "Add organic matter to improve boron retention in sandy soils.",
        ],
        "supplementation": (
            "Apply 1–2 kg borax/ha — CAUTION: excess boron is toxic. "
            "For home gardens, dissolve ½ teaspoon of borax in 5 gallons of water "
            "and apply once. Do not reapply without soil testing."
        ),
        "additional_evidence_needed": [
            "Are growing tips or flower heads affected?",
            "Are stems hollow or cracked?",
            "What crop is affected (cruciferous crops are most sensitive)?",
        ],
        "avoid": [
            "Do not over-apply boron — the margin between deficiency and toxicity is narrow.",
        ],
        "sources": [
            "https://extension.umn.edu/nutrient-management/micronutrients",
        ],
    },

    # ── Fungal — Foliar Diseases ──────────────────────────────────────────
    "fungal_foliar": {
        "condition_type": "fungal_disease",
        "clues": [
            "Fungal leaf diseases typically show defined spots, lesions, or blighted areas.",
            "Brown or dark spots with concentric rings may indicate Alternaria or Early Blight.",
            "Wet, expanding lesions may indicate Late Blight or Phytophthora.",
            "Lesions may produce spores visible as powdery or fuzzy growth.",
        ],
        "care_guidance": [
            "Remove and destroy severely affected leaves to reduce inoculum.",
            "Avoid overhead irrigation — water at the base of the plant.",
            "Apply copper-based fungicide (Bordeaux mixture) as a preventive measure.",
            "Improve air circulation by proper spacing and pruning.",
            "Rotate crops and avoid planting the same family in the same spot for 2–3 years.",
            "Apply mulch to prevent soil splash onto leaves.",
        ],
        "additional_evidence_needed": [
            "Do the spots have concentric rings or distinct borders?",
            "Are lower or upper leaves affected first?",
            "Is the weather humid or rainy?",
            "Are nearby plants also affected?",
        ],
        "avoid": [
            "Do not compost infected plant material — burn or dispose of it.",
            "Do not apply fungicide without identifying the disease type.",
        ],
        "sources": [
            "https://extension.umn.edu/diseases/early-blight",
            "https://extension.umn.edu/diseases/late-blight",
        ],
    },

    # ── Fungal — Mildew ───────────────────────────────────────────────────
    "fungal_mildew": {
        "condition_type": "fungal_disease",
        "clues": [
            "Powdery Mildew: white, powdery coating on leaf surfaces.",
            "Downy Mildew: yellow patches on upper leaf surface with gray-purple growth underneath.",
        ],
        "care_guidance": [
            "For Powdery Mildew: spray with a baking soda solution (1 tbsp per gallon of water with a few drops of soap).",
            "For Downy Mildew: apply copper-based or mancozeb fungicide.",
            "Improve air circulation with wider spacing and pruning.",
            "Avoid overhead watering in the evening.",
            "Neem oil can help as a preventive treatment.",
            "Remove and destroy affected leaves promptly.",
        ],
        "additional_evidence_needed": [
            "Is the growth powdery-white (top of leaves) or gray-purple (underside)?",
            "Are conditions humid with cool nights?",
        ],
        "avoid": [
            "Do not confuse powdery mildew with downy mildew — treatments differ.",
        ],
        "sources": [
            "https://extension.umn.edu/diseases/powdery-mildew",
        ],
    },

    # ── Fungal — Rust ─────────────────────────────────────────────────────
    "fungal_rust": {
        "condition_type": "fungal_disease",
        "clues": [
            "Rust produces orange, yellow, or brown pustules on leaf undersides.",
            "Upper leaf surface may show yellow spots corresponding to pustules below.",
        ],
        "care_guidance": [
            "Remove and destroy infected leaves immediately.",
            "Apply sulfur-based or copper fungicide as a preventive measure.",
            "Use resistant varieties when available.",
            "Avoid overhead irrigation and improve air circulation.",
            "Clean up all plant debris at the end of the season.",
        ],
        "additional_evidence_needed": [
            "Are there raised, powdery pustules on leaf undersides?",
            "What color are the pustules (orange, brown, black)?",
        ],
        "avoid": [
            "Do not ignore early symptoms — rust spreads quickly in humid weather.",
        ],
        "sources": [
            "https://extension.umn.edu/diseases/rust",
        ],
    },

    # ── Fungal — Smut ─────────────────────────────────────────────────────
    "fungal_smut": {
        "condition_type": "fungal_disease",
        "clues": [
            "Smut diseases produce black, sooty spore masses in grain heads or leaves.",
            "Loose Smut: grain heads replaced by masses of dark spores.",
        ],
        "care_guidance": [
            "Use certified, disease-free seed treated with systemic fungicide.",
            "Hot-water seed treatment can eliminate internal smut infections.",
            "Remove and burn affected plants before spore release.",
            "Rotate crops to break the disease cycle.",
        ],
        "additional_evidence_needed": [
            "Are grain heads or plant parts replaced by dark, powdery masses?",
            "Was the seed certified disease-free?",
        ],
        "avoid": [
            "Do not save seed from smut-infected fields for replanting.",
        ],
        "sources": [
            "https://extension.umn.edu/diseases/smut",
        ],
    },

    # ── Fungal — Soilborne ────────────────────────────────────────────────
    "fungal_soilborne": {
        "condition_type": "fungal_disease",
        "clues": [
            "Soilborne fungi cause root rot, wilting, and collar rot.",
            "Plants may wilt despite adequate soil moisture.",
            "Roots may appear brown, mushy, or decayed.",
        ],
        "care_guidance": [
            "Improve soil drainage — avoid waterlogging.",
            "Apply Trichoderma-based biocontrol agents to the soil.",
            "Practice crop rotation with non-host crops for 3–4 years.",
            "Treat seeds with appropriate fungicide before planting.",
            "Solarize soil in summer by covering with clear plastic for 4–6 weeks.",
            "Remove and destroy infected plants — do not compost them.",
        ],
        "additional_evidence_needed": [
            "Does the plant wilt even when soil is moist?",
            "Are roots brown, soft, or rotted?",
            "Is the soil poorly drained or waterlogged?",
        ],
        "avoid": [
            "Do not over-water — excess moisture promotes soilborne pathogens.",
            "Do not replant in the same spot without rotation or soil treatment.",
        ],
        "sources": [
            "https://extension.umn.edu/diseases/fusarium-wilt",
        ],
    },

    # ── Bacterial Diseases ────────────────────────────────────────────────
    "bacterial_disease": {
        "condition_type": "bacterial_disease",
        "clues": [
            "Bacterial diseases often cause water-soaked lesions that may ooze.",
            "Canker shows as raised, corky lesions on stems or fruit.",
            "Bacterial Wilt causes sudden, irreversible wilting.",
        ],
        "care_guidance": [
            "Apply copper-based bactericide (copper hydroxide or copper oxychloride).",
            "Remove and destroy infected plants immediately to prevent spread.",
            "Sanitize tools, hands, and equipment after handling infected plants.",
            "Avoid working with plants when they are wet.",
            "Use disease-free seed and resistant varieties when available.",
            "Rotate crops and avoid planting the same family for 2–3 years.",
        ],
        "additional_evidence_needed": [
            "Are lesions water-soaked or oozing?",
            "Does the plant wilt suddenly and not recover?",
            "Are neighboring plants showing similar symptoms?",
        ],
        "avoid": [
            "Do not diagnose bacterial wilt from yellowing alone.",
            "Do not assume antibiotics will cure plant bacterial infections.",
        ],
        "sources": [
            "https://extension.umn.edu/diseases/bacterial-diseases",
        ],
    },

    # ── Viral Diseases ────────────────────────────────────────────────────
    "viral_disease": {
        "condition_type": "viral_disease",
        "clues": [
            "Viral infections cause mosaic patterns, mottling, ring spots, or leaf distortion.",
            "Leaf curling, yellowing, and stunted growth are common viral symptoms.",
            "Viruses are often spread by insect vectors (whiteflies, aphids, thrips).",
        ],
        "care_guidance": [
            "There is no cure for plant viruses — focus on prevention.",
            "Remove and destroy infected plants to prevent spread.",
            "Control insect vectors (whiteflies, aphids) with neem oil or insecticidal soap.",
            "Use virus-resistant or tolerant varieties.",
            "Use reflective mulch to repel insect vectors.",
            "Sanitize tools and hands when handling plants.",
            "Control weeds that can harbor viruses.",
        ],
        "additional_evidence_needed": [
            "Are leaves showing mosaic, mottling, or ring-spot patterns?",
            "Is new growth stunted or distorted?",
            "Are whiteflies, aphids, or thrips visible on the plant?",
        ],
        "avoid": [
            "Do not claim that fertilizer cures a viral infection.",
            "Do not confirm a virus from leaf yellowing alone — laboratory testing is needed.",
        ],
        "sources": [
            "https://extension.umn.edu/diseases/viruses",
        ],
    },

    # ── Sucking Pests ─────────────────────────────────────────────────────
    "sucking_pest": {
        "condition_type": "pest_damage",
        "clues": [
            "Sucking pests (aphids, whiteflies, jassids, mealybugs) feed on plant sap.",
            "Symptoms include yellowing, curling, stunted growth, and sticky honeydew.",
            "Sooty mold may grow on honeydew deposits.",
        ],
        "care_guidance": [
            "Spray neem oil solution (5 ml per liter of water) at 7-day intervals.",
            "Use insecticidal soap spray for soft-bodied insects.",
            "Introduce or encourage natural predators (ladybugs, lacewings, parasitic wasps).",
            "Use yellow sticky traps to monitor and reduce flying pest populations.",
            "Remove heavily infested plant parts.",
            "Spray strong water jets to dislodge aphids and whiteflies.",
            "For severe infestations, use systemic insecticide as a last resort.",
        ],
        "additional_evidence_needed": [
            "Are small insects visible on leaf undersides or growing tips?",
            "Is there sticky residue (honeydew) on leaves?",
            "Is there black sooty mold growing on the honeydew?",
        ],
        "avoid": [
            "Do not use broad-spectrum pesticides as a first option — they kill beneficial insects.",
        ],
        "sources": [
            "https://extension.umn.edu/yard-and-garden-insects/aphids",
        ],
    },

    # ── Mites ─────────────────────────────────────────────────────────────
    "mite_pest": {
        "condition_type": "pest_damage",
        "clues": [
            "Mites cause stippling, bronzing, and webbing on leaves.",
            "Yellowish-brown dots and fine webbing underneath leaves.",
            "Mites are tiny and may need magnification to see.",
        ],
        "care_guidance": [
            "Spray with miticide or acaricide — regular insecticides are often ineffective.",
            "Neem oil or horticultural oil can suffocate mites.",
            "Increase humidity around plants — mites thrive in dry conditions.",
            "Introduce predatory mites (Phytoseiulus persimilis) as biological control.",
            "Spray plants with a strong water jet to dislodge mites.",
            "Remove and destroy heavily infested leaves.",
        ],
        "additional_evidence_needed": [
            "Is there fine webbing on leaf undersides?",
            "Are leaves stippled or bronzed?",
            "Are conditions hot and dry?",
        ],
        "avoid": [
            "Do not use pyrethroid insecticides — they can worsen mite outbreaks by killing predators.",
        ],
        "sources": [
            "https://extension.umn.edu/yard-and-garden-insects/spider-mites",
        ],
    },

    # ── Chewing Pests ─────────────────────────────────────────────────────
    "chewing_pest": {
        "condition_type": "pest_damage",
        "clues": [
            "Chewing pests cause holes, notches, skeletonized leaves, or defoliation.",
            "Caterpillars, armyworms, and borers leave frass (droppings) near damage.",
            "Borers create tunnels in stems or fruits.",
        ],
        "care_guidance": [
            "Handpick visible caterpillars, larvae, and egg masses.",
            "Apply Bacillus thuringiensis (Bt) spray for caterpillar control — safe and effective.",
            "Use pheromone traps to monitor and reduce moth populations.",
            "Apply neem oil as a deterrent and growth regulator.",
            "Encourage natural enemies: birds, parasitic wasps, ground beetles.",
            "For borers, inject Bt or neem into bore holes.",
            "Remove and destroy infested plant parts.",
        ],
        "additional_evidence_needed": [
            "Are holes, notches, or chewed areas visible on leaves?",
            "Can you find caterpillars, larvae, or their droppings (frass)?",
            "Are stems or fruits bored into?",
        ],
        "avoid": [
            "Do not spray Bt during the heat of the day — UV breaks it down quickly.",
        ],
        "sources": [
            "https://extension.umn.edu/yard-and-garden-insects/caterpillars",
        ],
    },

    # ── Leaf Miner ────────────────────────────────────────────────────────
    "leaf_miner": {
        "condition_type": "pest_damage",
        "clues": [
            "Leaf miners create winding, serpentine tunnels (mines) inside leaves.",
            "Trails appear as whitish or light-colored lines on leaf surfaces.",
        ],
        "care_guidance": [
            "Remove and destroy mined leaves to interrupt the life cycle.",
            "Apply neem oil as a systemic treatment — it affects larvae inside leaves.",
            "Use yellow sticky traps to catch adult leaf miner flies.",
            "Encourage parasitic wasps that attack leaf miner larvae.",
            "Cover young plants with fine mesh (insect netting) to prevent egg-laying.",
        ],
        "additional_evidence_needed": [
            "Are there winding white or light trails inside the leaves?",
            "Can you see tiny larvae inside the mines if you hold a leaf to light?",
        ],
        "avoid": [
            "Do not rely on contact insecticides — the larvae are protected inside the leaf.",
        ],
        "sources": [
            "https://extension.umn.edu/yard-and-garden-insects/leafminers",
        ],
    },

    # ── Beetles & Weevils ─────────────────────────────────────────────────
    "beetle_pest": {
        "condition_type": "pest_damage",
        "clues": [
            "Beetles chew holes in leaves, flowers, and fruits.",
            "Weevils bore into stems, roots, or pseudostems.",
            "Adults are usually visible on the plant surface.",
        ],
        "care_guidance": [
            "Handpick adult beetles early in the morning when they are less active.",
            "Apply neem oil or kaolin clay as a deterrent.",
            "Use row covers to physically exclude beetles from young plants.",
            "Apply beneficial nematodes to soil to target beetle larvae.",
            "Rotate crops to break the life cycle.",
            "Remove plant debris where beetles overwinter.",
        ],
        "additional_evidence_needed": [
            "Are adult beetles visible on the plant?",
            "Are leaves, flowers, or fruits showing feeding damage?",
            "Is damage at soil level (suggesting weevil larvae)?",
        ],
        "avoid": [
            "Do not use broad-spectrum insecticides as a first response.",
        ],
        "sources": [
            "https://extension.umn.edu/yard-and-garden-insects/beetles",
        ],
    },

    # ── Fruit Fly ─────────────────────────────────────────────────────────
    "fruit_fly": {
        "condition_type": "pest_damage",
        "clues": [
            "Fruit flies lay eggs in ripening fruits, causing decay and dropping.",
            "Puncture marks on fruit skin, with larvae developing inside.",
        ],
        "care_guidance": [
            "Use protein bait traps (methyl eugenol or cue-lure based) to attract and trap adults.",
            "Harvest fruits at the right maturity — do not leave overripe fruit on the plant.",
            "Collect and destroy fallen, infested fruits daily.",
            "Bag developing fruits with paper or cloth bags for physical protection.",
            "Apply bait spray (protein + insecticide) on border plants as a perimeter treatment.",
        ],
        "additional_evidence_needed": [
            "Are there puncture marks or soft spots on ripening fruits?",
            "Can you see maggots inside the fruit?",
            "Are fruits dropping prematurely?",
        ],
        "avoid": [
            "Do not spray fruits with insecticide close to harvest.",
        ],
        "sources": [
            "https://extension.umn.edu/yard-and-garden-insects/fruit-flies",
        ],
    },

    # ── Healthy ───────────────────────────────────────────────────────────
    "healthy": {
        "condition_type": "healthy",
        "clues": [
            "No visible symptoms of disease, deficiency, or pest damage.",
        ],
        "care_guidance": [
            "Continue current watering and fertilization practices.",
            "Monitor regularly for early signs of problems.",
            "Maintain good air circulation and soil health.",
        ],
        "additional_evidence_needed": [],
        "avoid": [],
        "sources": [],
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# Evidence Database Loading
# ═══════════════════════════════════════════════════════════════════════════

def load_evidence_database(csv_path=None):
    """Load and prepare the plant disease evidence CSV.

    Reads the CSV, renames ``details`` → ``evidence_text`` if needed,
    and adds normalized helper columns expected by the matching functions.

    Parameters
    ----------
    csv_path : str or Path, optional
        Path to the CSV file.  Defaults to
        ``AI/Datasets/plant_disease_corrected.csv`` relative to this file.

    Returns
    -------
    pandas.DataFrame
        The evidence database ready for ``match_plant_evidence()``.
    """
    if csv_path is None:
        csv_path = Path(__file__).parent / "Datasets" / "plant_disease_corrected.csv"

    csv_path = Path(csv_path)
    if not csv_path.is_file():
        raise FileNotFoundError(f"Evidence database not found: {csv_path}")

    db = pd.read_csv(csv_path)

    # Rename 'details' → 'evidence_text' if the raw CSV is used.
    if "details" in db.columns and "evidence_text" not in db.columns:
        db = db.rename(columns={"details": "evidence_text"})

    # Ensure required columns exist.
    required = {"crop", "diagnosis", "evidence_text", "source_row_number"}
    missing = required - set(db.columns)
    if missing:
        raise ValueError(f"Evidence CSV is missing columns: {sorted(missing)}")

    # Add normalized helper columns.
    if "crop_normalized" not in db.columns:
        db["crop_normalized"] = (
            db["crop"].fillna("").astype(str).str.strip().str.casefold()
        )

    if "diagnosis_normalized" not in db.columns:
        db["diagnosis_normalized"] = (
            db["diagnosis"].fillna("").astype(str).str.strip().str.casefold()
        )

    if "evidence_search_text" not in db.columns:
        db["evidence_search_text"] = (
            db["diagnosis_normalized"]
            + " "
            + db["evidence_text"].fillna("").astype(str).str.strip().str.casefold()
        )

    return db


# ═══════════════════════════════════════════════════════════════════════════
# Image Analysis via OpenRouter Vision API
DEFAULT_VISION_MODEL = "google/gemini-2.5-flash"


def analyze_plant_image(image_path, api_key, model_id=DEFAULT_VISION_MODEL, prompt=None):
    """Analyze a plant image through the OpenRouter Vision API.

    Parameters
    ----------
    image_path : str or Path
        Path to the plant image file.
    api_key : str
        OpenRouter API key.
    model_id : str, optional
        Vision model identifier (defaults to ``google/gemini-2.5-flash``).
    prompt : str, optional
        Analysis prompt.  Defaults to ``DEFAULT_ANALYSIS_PROMPT``.

    Returns
    -------
    str
        The model's textual description of the plant image.
    """
    image_path = Path(image_path)

    if not image_path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")
    if not api_key:
        raise ValueError("API key is missing.")

    if prompt is None:
        prompt = DEFAULT_ANALYSIS_PROMPT

    image_data = base64.b64encode(
        image_path.read_bytes()
    ).decode("utf-8")

    # Detect MIME type from extension.
    suffix = image_path.suffix.lower()
    mime_types = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp",
        ".gif": "image/gif",
    }
    mime = mime_types.get(suffix, "image/jpeg")

    payload = {
        "model": model_id,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime};base64,{image_data}"
                    }
                }
            ]
        }],
        "max_tokens": 800
    }

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=90
    )
    response.raise_for_status()

    choices = response.json().get("choices", [])
    if not choices:
        raise RuntimeError("The API returned no choices.")

    content = choices[0].get("message", {}).get("content")
    if not content or not str(content).strip():
        raise RuntimeError("The model returned no usable text.")

    return str(content).strip()


# ═══════════════════════════════════════════════════════════════════════════
# Voice-to-Text Transcription
# ═══════════════════════════════════════════════════════════════════════════

_whisper_model = None


def _get_whisper_model():
    """Lazily load the faster-whisper model on first use."""
    global _whisper_model
    if _whisper_model is None:
        try:
            import av as _av

            _original_open = _av.open

            def _compatible_open(*args, **kwargs):
                kwargs.pop("metadata_errors", None)
                return _original_open(*args, **kwargs)

            _av.open = _compatible_open
        except ImportError:
            pass

        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(
            "base", device="cpu", compute_type="int8"
        )
    return _whisper_model


def transcribe_audio(audio_path, language="en"):
    """Transcribe an audio file to text using faster-whisper.

    Parameters
    ----------
    audio_path : str or Path
        Path to the audio file (WAV, MP3, etc.).
    language : str, optional
        Language hint for transcription.  Defaults to ``"en"``.

    Returns
    -------
    dict
        ``{"success": bool, "text": str, "language": str,
          "language_probability": float, "message": str}``
    """
    audio_path = Path(audio_path)

    if not audio_path.is_file():
        return {
            "success": False,
            "text": "",
            "language": "",
            "language_probability": 0.0,
            "message": f"Audio file not found: {audio_path}",
        }

    if audio_path.stat().st_size == 0:
        return {
            "success": False,
            "text": "",
            "language": "",
            "language_probability": 0.0,
            "message": "Audio file is empty.",
        }

    try:
        model = _get_whisper_model()
        lang_param = None if (language in (None, "", "auto")) else language
        segments, info = model.transcribe(
            str(audio_path), beam_size=5, language=lang_param
        )

        text = " ".join(
            segment.text.strip() for segment in segments
        ).strip()

        if not text:
            return {
                "success": False,
                "text": "",
                "language": info.language,
                "language_probability": info.language_probability,
                "message": "No speech detected in the audio.",
            }

        return {
            "success": True,
            "text": text,
            "language": info.language,
            "language_probability": info.language_probability,
            "message": "Transcription successful.",
        }

    except Exception as exc:
        return {
            "success": False,
            "text": "",
            "language": "",
            "language_probability": 0.0,
            "message": f"Transcription failed: {type(exc).__name__}: {exc}",
        }


# ═══════════════════════════════════════════════════════════════════════════
# Input Validation
# ═══════════════════════════════════════════════════════════════════════════

def validate_symptom_description(text):
    """Validate a user's typed or transcribed plant-symptom description.

    Returns
    -------
    tuple[bool, str]
        ``(is_valid, cleaned_text_or_error_message)``
    """
    if not isinstance(text, str):
        return False, "Please enter a text description."

    cleaned_text = " ".join(text.split())

    if not cleaned_text:
        return False, "Please describe the plant symptoms first."

    if len(cleaned_text) < 10:
        return False, (
            "Please provide a little more detail (at least 10 characters)."
        )

    if len(cleaned_text) > 3000:
        return False, "Please keep the description under 3000 characters."

    return True, cleaned_text


def process_symptom_input(text):
    """Validate and clean a symptom description.

    Returns
    -------
    dict
        ``{"success": bool, "symptom_text": str, "message": str}``
    """
    is_valid, result = validate_symptom_description(text)

    if not is_valid:
        return {
            "success": False,
            "symptom_text": "",
            "message": result,
        }

    return {
        "success": True,
        "symptom_text": result,
        "message": "Symptom description validated successfully.",
    }


# ═══════════════════════════════════════════════════════════════════════════
# Symptom Extraction & Normalization
# ═══════════════════════════════════════════════════════════════════════════

def extract_symptom_terms(text):
    """Extract recognized symptom terms from a text description.

    Matches against ``SYMPTOM_TERMS`` after normalizing the input.

    Parameters
    ----------
    text : str
        A natural-language symptom description.

    Returns
    -------
    list[str]
        Matching symptom terms found in the text.
    """
    if not isinstance(text, str) or not text.strip():
        return []

    normalized = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()

    # Normalize common phrasings before matching.
    normalized = re.sub(
        r"\bleaves\s+are\s+turning\s+yellow\b",
        "leaves turning yellow",
        normalized,
    )
    normalized = re.sub(
        r"\bleaf\s+is\s+curling\b",
        "leaf curling",
        normalized,
    )

    matched = [
        term
        for term in SYMPTOM_TERMS
        if re.search(r"\b" + re.escape(term) + r"\b", normalized)
    ]

    return matched


def normalize_symptoms(symptoms):
    """Deduplicate and normalize a list of symptom strings.

    Returns
    -------
    list[str]
        Unique, lowercased, whitespace-normalized symptom terms.
    """
    return list(dict.fromkeys(
        re.sub(r"\s+", " ", s.lower().strip())
        for s in symptoms
        if isinstance(s, str) and s.strip()
    ))


def identify_crop(text):
    """Detect a crop name from a text description.

    Scans for known crop names from ``CROP_NAMES``, preferring longer
    matches to avoid false positives (e.g. "corn" inside "corner").

    Parameters
    ----------
    text : str
        Combined user description and/or image analysis text.

    Returns
    -------
    str or None
        The identified crop name in title case, or ``None``.
    """
    if not isinstance(text, str) or not text.strip():
        return None

    normalized = re.sub(r"[^a-z0-9\s']", " ", text.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()

    for crop in sorted(CROP_NAMES, key=len, reverse=True):
        if re.search(r"\b" + re.escape(crop) + r"\b", normalized):
            return crop.title()

    return None


# ═══════════════════════════════════════════════════════════════════════════
# Text Matching & Evidence Ranking (existing functions, refined)
# ═══════════════════════════════════════════════════════════════════════════

def _normalize_match_text(value):
    """Normalize text for consistent symptom-evidence matching."""
    return re.sub(
        r"\s+",
        " ",
        re.sub(r"[^a-z0-9\s-]", " ", str(value).casefold())
    ).strip()


# Keep these patterns aligned with the notebook's current symptom matcher.
def _term_matches(text, term):
    normalized_text = _normalize_match_text(text)
    normalized_term = _normalize_match_text(term)

    if not normalized_text or not normalized_term:
        return False

    group = SYMPTOM_GROUPS.get(normalized_term)

    if group == "yellowing":
        patterns = [
            r"\byellowing\b",
            r"\byellow(?:ed)?\s+leaves?\b",
            r"\bleaves?\s+(?:are\s+)?turning\s+yellow\b",
            r"\bchlorosis\b",
        ]

        return any(
            re.search(pattern, normalized_text, re.IGNORECASE)
            for pattern in patterns
        )

    if group == "brown_spots":
        patterns = SYMPTOM_PATTERNS.get(group, []) + [
            r"\b(?:brown|reddish[- ]brown|dark brown)\s+"
            r"(?:spot|spots|blotch|blotches|lesion|lesions)\b",
            r"\bspots?\s+on\s+(?:the\s+)?leaves?\b",
        ]

        return any(
            re.search(pattern, normalized_text, re.IGNORECASE)
            for pattern in patterns
        )

    # For other groups, check if we have patterns defined.
    if group and group in SYMPTOM_PATTERNS:
        patterns = SYMPTOM_PATTERNS[group]
        return any(
            re.search(pattern, normalized_text, re.IGNORECASE)
            for pattern in patterns
        )

    # Default: word-boundary match on individual terms.
    pattern = (
        r"\b"
        + r"\s+".join(
            re.escape(word) for word in normalized_term.split()
        )
        + r"\b"
    )

    return bool(
        re.search(pattern, normalized_text, re.IGNORECASE)
    )


def _usable_terms(symptom_terms):
    """Normalize and deduplicate usable symptom terms."""
    if not symptom_terms:
        raise ValueError("Provide at least one symptom term.")

    terms = list(dict.fromkeys(
        _normalize_match_text(term)
        for term in symptom_terms
        if isinstance(term, str) and term.strip()
    ))

    if not terms:
        raise ValueError("No usable symptom terms were provided.")

    return terms


def _build_search_text(evidence_db):
    """Build searchable text from diagnosis and evidence fields."""
    search_text = (
        evidence_db["diagnosis"].fillna("").astype(str)
        + " "
        + evidence_db["evidence_text"].fillna("").astype(str)
    )

    if "evidence_search_text" in evidence_db.columns:
        search_text += (
            " " + evidence_db["evidence_search_text"].fillna("").astype(str)
        )

    return search_text.apply(_normalize_match_text)


def match_plant_evidence(evidence_db, symptom_terms, observed_crop=None):
    """Find records matching any supplied symptom term.

    Matching is text-based and does not establish a confirmed diagnosis.
    """
    required = {"crop", "diagnosis", "evidence_text", "source_row_number"}
    missing = required - set(evidence_db.columns)
    if missing:
        raise ValueError(f"Evidence database is missing: {sorted(missing)}")

    terms = _usable_terms(symptom_terms)
    search_text = _build_search_text(evidence_db)

    hits = search_text.apply(
        lambda text: [
            term for term in terms if _term_matches(text, term)
        ]
    )
    mask = hits.apply(bool)

    if observed_crop and str(observed_crop).strip().casefold() != "unknown":
        expected_crop = _normalize_match_text(observed_crop)
        if "crop_normalized" in evidence_db.columns:
            crop_values = evidence_db["crop_normalized"]
        else:
            crop_values = evidence_db["crop"]

        mask &= crop_values.fillna("").astype(str).apply(
            lambda crop: _normalize_match_text(crop) == expected_crop
        )

    matches = evidence_db.loc[mask].copy()
    matches["matched_terms"] = hits.loc[mask].apply(
        lambda found: ", ".join(found)
    )
    matches["matched_symptom_count"] = hits.loc[mask].apply(len)

    # Exclude healthy records from disease candidates.
    matches = matches[
        ~matches["diagnosis"].fillna("").astype(str).str.contains(
            r"\bhealthy\b", case=False, regex=True
        )
    ]

    return matches.sort_values(
        ["matched_symptom_count", "source_row_number"],
        ascending=[False, True]
    ).reset_index(drop=True)


def rank_plant_evidence(matches, symptom_terms):
    """Rank matched records by symptom coverage and evidence availability.

    relevance_score is a heuristic relevance score, NOT a probability.
    This function expects records returned by match_plant_evidence().
    """
    if matches.empty:
        return matches.copy()

    required = {"crop", "diagnosis", "evidence_text", "source_row_number"}
    missing = required - set(matches.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    terms = _usable_terms(symptom_terms)
    ranked = matches.copy()
    search_text = _build_search_text(ranked)

    found = search_text.apply(
        lambda text: [
            term for term in terms if _term_matches(text, term)
        ]
    )

    ranked["matched_terms"] = found.apply(
        lambda found_terms: ", ".join(found_terms) or "none"
    )
    ranked["matched_symptom_count"] = found.apply(len)
    ranked["term_coverage_score"] = found.apply(
        lambda found_terms: len(found_terms) / len(terms)
    )
    ranked["evidence_component"] = (
        ranked["evidence_text"].fillna("").astype(str).str.strip()
        .ne("").astype(float)
    )
    ranked["relevance_score"] = (
        0.70 * ranked["term_coverage_score"]
        + 0.30 * ranked["evidence_component"]
    )

    # Keep the scores interpretable: matched terms affect ranking, and ties
    # are resolved deterministically by source row.
    ranked = ranked.sort_values(
        ["relevance_score", "matched_symptom_count", "source_row_number"],
        ascending=[False, False, True]
    ).reset_index(drop=True)
    ranked["rank"] = range(1, len(ranked) + 1)

    return ranked


# ═══════════════════════════════════════════════════════════════════════════
# Disease Triage & Nutrient Deficiency Detection
# ═══════════════════════════════════════════════════════════════════════════

def classify_plant_problem(symptom_text):
    """Triage whether symptoms suggest a nutrient deficiency, disease, or pest.

    Returns
    -------
    dict
        ``{"category": str, "nutrient_clues": list, "disease_or_pest_clues": list,
          "needs_more_evidence": bool, "message": str}``
    """
    text = str(symptom_text).casefold()

    nutrient_clue_patterns = [
        ("yellowing between veins", r"yellow(?:ing)?\s+between\s+veins|interveinal\s+(?:yellowing|chlorosis)"),
        ("older leaves turning yellow", r"(?:older|lower)\s+leaves?\s+(?:are\s+)?(?:turning\s+)?(?:yellow|yellowing)|yellow(?:ing)?\s+(?:of\s+)?(?:older|lower)\s+leaves?"),
        ("young leaves turning yellow", r"(?:young|younger|upper)\s+leaves?\s+(?:are\s+)?(?:turning\s+)?(?:yellow|yellowing)|yellow(?:ing)?\s+(?:of\s+)?(?:young|younger|upper)\s+leaves?"),
        ("uniform yellowing", r"uniform(?:ly)?\s+yellow(?:ing)?|yellow(?:ing)?\s+uniform(?:ly)?"),
        ("purple leaves", r"purple\s+(?:leaves?|discoloration|tint)"),
        ("dark leaves", r"dark\s+(?:green\s+)?leaves?"),
        ("brown edges", r"brown\s+(?:leaf\s+)?(?:edges?|margins?|tips?)|leaf\s+(?:edges?|margins?)\s+(?:are\s+)?(?:turning\s+)?brown"),
        ("blossom end rot", r"blossom\s+end\s+rot"),
        ("hollow stems", r"hollow\s+stems?"),
        ("small curds", r"small\s+curds?"),
        ("stunted growth", r"stunted(?:\s+growth)?"),
    ]

    disease_or_pest_patterns = [
        ("brown spots", r"brown\s+(?:spots?|blotches?|lesions?|patches?)"),
        ("leaf mines", r"leaf\s+mines?|winding\s+tunnels?"),
        ("wilting despite moist soil", r"wilt(?:ing|ed)?(?:\s+despite\s+moist\s+soil)?"),
        ("curled leaves", r"curl(?:ed|ing)?\s+leaves?"),
        ("mosaic pattern", r"mosaic(?:\s+pattern)?"),
        ("powdery coating", r"powdery\s+(?:coating|mildew)|white\s+powder"),
        ("rust spots", r"rust\s+spots?|orange\s+spots?"),
        ("water-soaked lesions", r"water[- ]soaked\s+lesions?"),
        ("holes in leaves", r"holes?\s+in\s+leaves?"),
        ("insects on leaves", r"insects?\s+on\s+leaves?|aphids?|mites?"),
        ("webbing on leaves", r"webbing(?:\s+on\s+leaves?)?"),
        ("sticky residue", r"sticky\s+residue"),
        ("sooty mold", r"sooty\s+mold"),
    ]

    nutrient_found = [
        label for label, pattern in nutrient_clue_patterns
        if re.search(pattern, text)
    ]
    disease_found = [
        label for label, pattern in disease_or_pest_patterns
        if re.search(pattern, text)
    ]

    if nutrient_found and disease_found:
        category = "multiple_possibilities"
    elif nutrient_found:
        category = "possible_nutrient_deficiency"
    elif disease_found:
        category = "possible_disease_or_pest"
    else:
        category = "insufficient_evidence"

    return {
        "category": category,
        "nutrient_clues": nutrient_found,
        "disease_or_pest_clues": disease_found,
        "needs_more_evidence": True,
        "message": (
            "These clues do not confirm a diagnosis. Inspect the plant "
            "and consider soil testing or diagnostic support before treatment."
        ),
    }


def identify_nutrient_deficiencies(ranked_candidates, symptom_text=""):
    """Detect nutrient deficiencies from ranked candidates and symptom text.

    Checks two sources:
    1. Ranked candidates whose diagnosis explicitly names a deficiency.
    2. Symptom text patterns that suggest specific nutrient issues.

    Parameters
    ----------
    ranked_candidates : pandas.DataFrame
        Output of ``rank_plant_evidence()``.
    symptom_text : str
        The user's symptom description.

    Returns
    -------
    dict
        ``{"detected": bool, "deficiencies": list[dict]}``
        Each deficiency dict has keys: ``nutrient``, ``evidence``,
        ``from_evidence_db``, ``supplementation``.
    """
    deficiencies = []
    seen_nutrients = set()

    if isinstance(ranked_candidates, list):
        ranked_candidates = pd.DataFrame(ranked_candidates)
    elif ranked_candidates is None:
        ranked_candidates = pd.DataFrame()

    # 1. Check ranked candidates for explicit deficiency diagnoses.
    if not ranked_candidates.empty:
        for _, row in ranked_candidates.iterrows():
            diagnosis = str(row.get("diagnosis", ""))
            if "deficiency" in diagnosis.casefold():
                category = DIAGNOSIS_CATEGORIES.get(diagnosis)
                if category and category in CARE_GUIDANCE:
                    guidance = CARE_GUIDANCE[category]
                    nutrient = guidance.get("nutrient", diagnosis)
                    if nutrient not in seen_nutrients:
                        seen_nutrients.add(nutrient)
                        deficiencies.append({
                            "nutrient": nutrient,
                            "evidence": str(
                                row.get("evidence_text", "")
                            ).strip(),
                            "from_evidence_db": True,
                            "symptoms": guidance.get("symptoms", ""),
                            "supplementation": guidance.get(
                                "supplementation", ""
                            ),
                            "care_guidance": guidance.get(
                                "care_guidance", []
                            ),
                        })

    # 2. Check symptom text for nutrient-specific patterns.
    text = str(symptom_text).casefold()

    nutrient_patterns = {
        "Nitrogen (N)": {
            "patterns": [
                r"older\s+leaves?\s+(?:are\s+)?(?:turning\s+)?yellow",
                r"uniform\s+yellowing",
                r"nitrogen\s+deficien",
                r"pale\s+green\s+leaves",
            ],
            "category": "nitrogen_deficiency",
        },
        "Phosphorus (P)": {
            "patterns": [
                r"purple\s+(?:leaves?|discoloration|tint)",
                r"dark\s+(?:green\s+)?leaves?\s+with\s+purple",
                r"phosphorus\s+deficien",
            ],
            "category": "phosphorus_deficiency",
        },
        "Potassium (K)": {
            "patterns": [
                r"brown\s+(?:leaf\s+)?(?:edges?|margins?|tips?)",
                r"leaf\s+(?:edges?|margins?)\s+(?:are\s+)?(?:turning\s+)?brown",
                r"marginal\s+(?:necrosis|scorch|burn)",
                r"potassium\s+deficien",
            ],
            "category": "potassium_deficiency",
        },
        "Calcium (Ca)": {
            "patterns": [
                r"blossom\s+end\s+rot",
                r"young\s+leaves?\s+(?:are\s+)?curl",
                r"growing\s+tips?\s+(?:are\s+)?(?:dying|dead|brown)",
                r"calcium\s+deficien",
            ],
            "category": "calcium_deficiency",
        },
        "Magnesium (Mg)": {
            "patterns": [
                r"yellowing\s+between\s+(?:the\s+)?veins",
                r"yellow\s+between\s+(?:the\s+)?veins",
                r"interveinal\s+(?:yellowing|chlorosis)",
                r"magnesium\s+deficien",
            ],
            "category": "magnesium_deficiency",
        },
        "Boron (B)": {
            "patterns": [
                r"hollow\s+stems?",
                r"small\s+curds?",
                r"distorted\s+(?:growth|buds?|flowers?)",
                r"boron\s+deficien",
            ],
            "category": "boron_deficiency",
        },
    }

    for nutrient, info in nutrient_patterns.items():
        if nutrient in seen_nutrients:
            continue

        matched = any(
            re.search(pattern, text) for pattern in info["patterns"]
        )
        if matched:
            guidance = CARE_GUIDANCE.get(info["category"], {})
            seen_nutrients.add(nutrient)
            deficiencies.append({
                "nutrient": nutrient,
                "evidence": (
                    "Detected from symptom description patterns. "
                    "Confirm with soil testing."
                ),
                "from_evidence_db": False,
                "symptoms": guidance.get("symptoms", ""),
                "supplementation": guidance.get("supplementation", ""),
                "care_guidance": guidance.get("care_guidance", []),
            })

    return {
        "detected": len(deficiencies) > 0,
        "deficiencies": deficiencies,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Care Recommendations
# ═══════════════════════════════════════════════════════════════════════════

def get_care_category(diagnosis):
    """Map a diagnosis name to its care guidance category.

    First checks the explicit mapping, then falls back to keyword matching.

    Returns
    -------
    str or None
        The category key, or ``None`` if no match is found.
    """
    name = str(diagnosis).strip()

    # 1. Exact match in the mapping.
    if name in DIAGNOSIS_CATEGORIES:
        return DIAGNOSIS_CATEGORIES[name]

    # 2. Case-insensitive exact match.
    name_lower = name.casefold()
    for diag, cat in DIAGNOSIS_CATEGORIES.items():
        if diag.casefold() == name_lower:
            return cat

    # 3. Keyword-based fallback.
    if "deficiency" in name_lower:
        # Try to match specific nutrient.
        for nutrient in [
            "nitrogen", "phosphorus", "potassium",
            "calcium", "magnesium", "boron",
        ]:
            if nutrient in name_lower:
                return f"{nutrient}_deficiency"
        return "nitrogen_deficiency"  # Generic fallback for deficiencies.

    if any(kw in name_lower for kw in ["blight", "rot", "spot", "wilt"]):
        if "bacterial" in name_lower:
            return "bacterial_disease"
        return "fungal_foliar"

    if any(kw in name_lower for kw in ["mildew"]):
        return "fungal_mildew"

    if any(kw in name_lower for kw in ["rust"]):
        return "fungal_rust"

    if any(kw in name_lower for kw in ["smut"]):
        return "fungal_smut"

    if any(kw in name_lower for kw in ["virus", "mosaic"]):
        return "viral_disease"

    if any(kw in name_lower for kw in [
        "aphid", "whitefl", "mealybug", "thrip", "jassid",
        "scale", "hopper", "psyllid",
    ]):
        return "sucking_pest"

    if any(kw in name_lower for kw in [
        "borer", "worm", "caterpillar", "looper", "moth", "cutworm",
    ]):
        return "chewing_pest"

    if "mite" in name_lower:
        return "mite_pest"

    if "miner" in name_lower:
        return "leaf_miner"

    if "beetle" in name_lower or "weevil" in name_lower:
        return "beetle_pest"

    if "fly" in name_lower:
        return "fruit_fly"

    if "healthy" in name_lower:
        return "healthy"

    return None


def get_care_recommendation(diagnosis):
    """Get care guidance for a specific diagnosis.

    Parameters
    ----------
    diagnosis : str
        The disease or pest diagnosis name.

    Returns
    -------
    dict
        Care guidance with keys: ``condition_type``, ``guidance_available``,
        ``care_guidance``, ``additional_evidence_needed``, ``sources``,
        and optionally ``nutrient``, ``supplementation`` for deficiencies.
    """
    category = get_care_category(diagnosis)

    if category is None or category not in CARE_GUIDANCE:
        return {
            "condition_type": "undetermined",
            "guidance_available": False,
            "care_guidance": [
                "Gather more evidence before recommending treatment.",
            ],
            "additional_evidence_needed": [
                "Inspect leaf patterns, affected leaf age, soil moisture, "
                "and signs of pests.",
            ],
            "sources": [],
        }

    guidance = CARE_GUIDANCE[category].copy()
    guidance["guidance_available"] = True
    return guidance


# ═══════════════════════════════════════════════════════════════════════════
# Follow-up Questions
# ═══════════════════════════════════════════════════════════════════════════

def identify_additional_evidence(symptom_text, triage_result):
    """Generate follow-up questions based on symptoms and triage.

    Parameters
    ----------
    symptom_text : str
        The user's symptom description.
    triage_result : dict
        Output of ``classify_plant_problem()``.

    Returns
    -------
    dict
        ``{"additional_questions": list[str], "recommendation": str}``
    """
    text = str(symptom_text).casefold()

    questions = [
        "Are older or younger leaves affected first?",
        "Is the yellowing uniform or mainly between leaf veins?",
        "How often do you water the plant, and does the soil remain wet?",
        "When did the symptoms start, and are they spreading?",
        "Are nearby plants showing similar symptoms?",
    ]

    if any(term in text for term in [
        "brown spots", "brown spot", "blotches", "holes",
    ]):
        questions.append(
            "Are the spots spreading, and do they have distinct edges "
            "or yellow halos?"
        )

    if any(term in text for term in ["wilting", "drooping"]):
        questions.append(
            "Does the plant remain wilted even when the soil is moist?"
        )

    if any(term in text for term in ["curling", "curled", "mosaic"]):
        questions.append(
            "Are leaves curled, distorted, or showing mosaic patterns?"
        )

    if any(term in text for term in [
        "insects", "aphids", "bugs", "flies", "webbing",
    ]):
        questions.append(
            "What do the insects look like, and where on the plant "
            "are they concentrated?"
        )

    if triage_result.get("category") in [
        "possible_nutrient_deficiency",
        "multiple_possibilities",
    ]:
        questions.append(
            "Have you tested the soil or recently applied fertilizer?"
        )

    return {
        "additional_questions": list(dict.fromkeys(questions)),
        "recommendation": (
            "Collect these observations before selecting a treatment. "
            "If symptoms progress or the cause remains unclear, seek "
            "local agricultural extension or plant diagnostic advice."
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════
# End-to-End Analysis
# ═══════════════════════════════════════════════════════════════════════════

def analyze_plantguardian(
    symptom_text,
    image_path,
    api_key=None,
    model_id=None,
    evidence_db=None,
    prompt=None,
    max_candidates=10,
):
    """Complete end-to-end plant disease analysis.

    Combines user-reported symptom text and image analysis to identify
    probable diseases, detect nutrient deficiencies, and provide care
    recommendations.

    Both user-reported symptoms and image-derived observations contribute
    to disease ranking. Relevance scores are heuristic, not probabilities.

    Parameters
    ----------
    symptom_text : str
        User-provided symptom description (typed or transcribed from voice).
    image_path : str or Path
        Path to the uploaded plant image.
    api_key : str, optional
        OpenRouter API key. If None, loaded from environment or .env.
    model_id : str, optional
        Vision model identifier. Defaults to DEFAULT_VISION_MODEL.
    evidence_db : pandas.DataFrame, optional
        Evidence database. If None, loaded via load_evidence_database().
    prompt : str, optional
        Analysis prompt for the vision model.
    max_candidates : int, optional
        Maximum number of ranked candidates to return. Defaults to 10.

    Returns
    -------
    dict
        Comprehensive analysis result including:
        - ``success``: whether the analysis completed
        - ``symptom_text``: the validated user text
        - ``user_reported_symptoms``: symptoms from user text
        - ``image_derived_symptoms``: symptoms from image analysis
        - ``combined_symptoms``: union of both sources
        - ``image_description``: raw vision model output
        - ``identified_crop``: detected crop name
        - ``ranked_candidates``: list of disease candidates with care
        - ``top_candidate``: highest ranked candidate
        - ``probable_disease``: primary disease name with crop
        - ``disease_reason``: explanation of why this disease was identified
        - ``nutrient_deficiencies``: detected deficiencies with guidance
        - ``triage``: problem category classification
        - ``additional_evidence``: follow-up questions
    """
    # ── 0. Resolve defaults ───────────────────────────────────────────
    if not api_key:
        api_key = os.getenv("OR_API_KEY", "").strip()
        if not api_key:
            try:
                from dotenv import load_dotenv
                for env_candidate in [
                    Path(__file__).parent.parent / ".env",
                    Path.cwd() / ".env",
                    Path.cwd().parent / ".env",
                ]:
                    if env_candidate.is_file():
                        load_dotenv(env_candidate)
                        break
                api_key = os.getenv("OR_API_KEY", "").strip()
            except Exception:
                pass

    if not model_id:
        model_id = DEFAULT_VISION_MODEL

    if evidence_db is None:
        evidence_db = load_evidence_database()

    # ── 1. Validate symptom text ──────────────────────────────────────
    input_result = process_symptom_input(symptom_text)

    if not input_result["success"]:
        return {
            "success": False,
            "message": input_result["message"],
        }

    if not image_path:
        return {
            "success": False,
            "message": "Please upload a plant image.",
        }

    image_file = Path(image_path)
    if not image_file.is_file():
        return {
            "success": False,
            "message": f"Plant image file not found: {image_path}",
        }

    user_text = input_result["symptom_text"]

    # ── 2. Analyze the uploaded image ─────────────────────────────────
    try:
        image_description = analyze_plant_image(
            image_path=image_path,
            api_key=api_key,
            model_id=model_id,
            prompt=prompt,
        )
    except Exception as exc:
        return {
            "success": False,
            "message": f"Image analysis failed: {type(exc).__name__}: {exc}",
        }

    # ── 3. Extract symptoms from BOTH sources ─────────────────────────
    user_symptoms = normalize_symptoms(
        extract_symptom_terms(user_text)
    )
    image_symptoms = normalize_symptoms(
        extract_symptom_terms(image_description)
    )

    # Combine: user symptoms first, then image-only additions.
    combined_symptoms = list(dict.fromkeys(
        user_symptoms + image_symptoms
    ))

    # Use both sources to identify the crop.
    crop = identify_crop(user_text + " " + str(image_description))

    # ── 4. Check for usable symptoms ──────────────────────────────────
    if not combined_symptoms:
        return {
            "success": False,
            "message": (
                "No supported symptoms were extracted from your "
                "description or the image analysis. Please provide "
                "more detail about what you observe."
            ),
            "image_description": image_description,
            "user_text": user_text,
        }

    # ── 5. Match and rank evidence ────────────────────────────────────
    matches = match_plant_evidence(
        evidence_db=evidence_db,
        symptom_terms=combined_symptoms,
        observed_crop=crop,
    )

    ranked = rank_plant_evidence(
        matches=matches,
        symptom_terms=combined_symptoms,
    )

    # Exclude healthy records.
    ranked = ranked[
        ranked["diagnosis"].str.strip().str.casefold() != "healthy"
    ].copy()

    # Limit output.
    ranked = ranked.head(max_candidates)

    # ── 6. Triage and follow-up ───────────────────────────────────────
    triage = classify_plant_problem(user_text)
    follow_up = identify_additional_evidence(user_text, triage)

    # ── 7. Detect nutrient deficiencies ───────────────────────────────
    nutrient_info = identify_nutrient_deficiencies(
        ranked, user_text + " " + str(image_description)
    )

    # ── 8. Build candidate results with care recommendations ──────────
    candidate_results = []

    for _, row in ranked.iterrows():
        diagnosis = row["diagnosis"]
        matched = row.get("matched_terms", "")
        score = float(row.get("relevance_score", 0))
        evidence = str(row.get("evidence_text", "")).strip()

        # Build a human-readable reason.
        reason_parts = []
        if matched and matched != "none":
            reason_parts.append(f"Matched symptoms: {matched}")
        if crop:
            reason_parts.append(f"Crop identified as: {crop}")
        if evidence:
            reason_parts.append(
                f"Evidence: {evidence[:200]}"
                + ("..." if len(evidence) > 200 else "")
            )

        care = get_care_recommendation(diagnosis)

        candidate_results.append({
            "rank": int(row.get("rank", 0)),
            "crop": row.get("crop", ""),
            "diagnosis": diagnosis,
            "relevance_score": round(score, 3),
            "matched_terms": matched,
            "reason": " | ".join(reason_parts) if reason_parts else (
                "Text-based candidate — not a confirmed diagnosis."
            ),
            "care": care,
        })

    # ── 9. Summary diagnosis details ──────────────────────────────────
    top_candidate = candidate_results[0] if candidate_results else None
    probable_disease = (
        f"{top_candidate['crop']} — {top_candidate['diagnosis']}"
        if top_candidate
        else "Undetermined"
    )
    disease_reason = (
        top_candidate["reason"]
        if top_candidate
        else "No conclusive evidence found matching the provided symptoms."
    )

    # ── 10. Return comprehensive result ───────────────────────────────
    return {
        "success": True,
        "symptom_text": user_text,
        "user_reported_symptoms": user_symptoms,
        "image_derived_symptoms": image_symptoms,
        "combined_symptoms": combined_symptoms,
        "image_description": image_description,
        "identified_crop": crop,
        "ranked_candidates": candidate_results,
        "top_candidate": top_candidate,
        "probable_disease": probable_disease,
        "disease_reason": disease_reason,
        "nutrient_deficiencies": nutrient_info,
        "triage": triage,
        "additional_evidence": follow_up,
        "message": (
            "Analysis completed. Candidates are ranked by relevance "
            "(not probability) and are not confirmed diagnoses. "
            "Seek professional advice for treatment decisions."
        ),
    }


def format_diagnosis_report(result):
    """Format an end-to-end diagnosis result into a rich Markdown report.

    Parameters
    ----------
    result : dict
        Output from ``analyze_plantguardian()``.

    Returns
    -------
    str
        Formatted Markdown text for display in Gradio or Jupyter notebooks.
    """
    if not result.get("success"):
        return f"### ❌ Analysis Error\n\n{result.get('message', 'An unknown error occurred.')}"

    top = result.get("top_candidate")
    crop = result.get("identified_crop") or (top.get("crop") if top else "Plant")
    disease_name = top.get("diagnosis") if top else "Undetermined Condition"
    score = top.get("relevance_score", 0.0) if top else 0.0
    reason = result.get("disease_reason", "No reason recorded.")
    triage = result.get("triage", {})
    triage_cat = triage.get("category", "unclassified").replace("_", " ").title()

    lines = []

    # ── Header ────────────────────────────────────────────────────────
    lines.append(f"# 🌿 PlantGuardian Diagnostic Report")
    lines.append(f"**Identified Plant/Crop:** `{crop}` &nbsp;|&nbsp; **Category:** `{triage_cat}`\n")
    lines.append("---")

    # ── 1. Probable Disease Name ──────────────────────────────────────
    lines.append("## 🦠 1. Probable Disease")
    if top:
        lines.append(f"### **{crop} — {disease_name}**")
        lines.append(f"- **Relevance Score:** `{score * 100:.1f}%` (Rank 1 candidate)")
        lines.append(f"- **Matched Symptoms:** `{top.get('matched_terms', 'general signs')}`")
    else:
        lines.append("No specific disease matched the evidence database with high confidence.")
    lines.append("")

    # ── 2. The Reason ─────────────────────────────────────────────────
    lines.append("## 🔍 2. The Reason")
    lines.append(f"> {reason}\n")

    user_syms = result.get("user_reported_symptoms", [])
    img_syms = result.get("image_derived_symptoms", [])
    if user_syms or img_syms:
        lines.append("**Symptom Breakdown:**")
        if user_syms:
            lines.append(f"- **From Your Description:** {', '.join(user_syms)}")
        if img_syms:
            lines.append(f"- **From Visual Inspection:** {', '.join(img_syms)}")
    lines.append("")

    # ── 3. Nutrients Deficiencies & Proper Way to Take Them ───────────
    lines.append("## 🧪 3. Nutrient Deficiencies & How to Take / Apply Them")
    nutrients = result.get("nutrient_deficiencies", {})

    if nutrients.get("detected") and nutrients.get("deficiencies"):
        for d in nutrients["deficiencies"]:
            nut_name = d.get("nutrient", "Unknown Nutrient")
            lines.append(f"### ⚠️ **{nut_name} Deficiency Detected**")
            if d.get("symptoms"):
                lines.append(f"**Observed Signs:** {d['symptoms']}")
            if d.get("evidence"):
                lines.append(f"**Evidence:** {d['evidence']}")

            lines.append("\n**📋 Proper Way to Take / Apply Supplementation:**")
            if d.get("supplementation"):
                lines.append(f"> 💊 **Dosage & Application:** {d['supplementation']}")

            if d.get("care_guidance"):
                lines.append("\n**Application Instructions & Soil Care:**")
                for step in d["care_guidance"]:
                    lines.append(f"- {step}")
            lines.append("")
    else:
        lines.append("✅ **No primary nutrient deficiency detected.**")
        lines.append(
            "_The observed symptoms align more strongly with pathological "
            "(fungal/bacterial/viral) disease or pest infestation rather than "
            "a mineral deficiency._\n"
        )

    # ── 4. Proper Way to Treat the Disease ────────────────────────────
    if top and top.get("care"):
        care = top["care"]
        lines.append("## 🩺 4. Proper Way to Treat the Disease (Care Guidance)")
        cond_type = care.get("condition_type", "condition").replace("_", " ").title()
        lines.append(f"**Condition Type:** `{cond_type}`\n")

        if care.get("care_guidance"):
            lines.append("**Recommended Treatment Steps:**")
            for step in care["care_guidance"]:
                lines.append(f"1. {step}")
            lines.append("")

        if care.get("avoid"):
            lines.append("**⚠️ What to Avoid:**")
            for av in care["avoid"]:
                lines.append(f"- {av}")
            lines.append("")

    # ── 5. Alternative Possibilities ──────────────────────────────────
    candidates = result.get("ranked_candidates", [])
    if len(candidates) > 1:
        lines.append("## 📋 5. Alternative Probable Candidates")
        for alt in candidates[1:4]:
            lines.append(
                f"- **Rank {alt.get('rank')}:** {alt.get('crop')} — **{alt.get('diagnosis')}** "
                f"(`{float(alt.get('relevance_score', 0)) * 100:.1f}%` relevance) "
                f"— _Matched: {alt.get('matched_terms', 'none')}_"
            )
        lines.append("")

    # ── 6. Follow-up Questions ────────────────────────────────────────
    add_ev = result.get("additional_evidence", {})
    questions = add_ev.get("additional_questions", [])
    if questions:
        lines.append("## ❓ 6. Follow-Up Diagnostic Questions to Confirm")
        lines.append("_Check your plant for these signs to confirm the diagnosis:_")
        for q in questions[:4]:
            lines.append(f"- {q}")
        lines.append("")

    lines.append("---")
    lines.append(
        "⚠️ _Disclaimer: Recommendations are based on visible symptoms and evidence records. "
        "Relevance scores are not laboratory certainty. Always verify before large-scale treatments._"
    )

    return "\n".join(lines)
