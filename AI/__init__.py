"""
PlantGuardian AI Package
========================
Modules:
- plant_pipeline: Core plant disease analysis, evidence matching, and voice transcription
- app: Interactive Gradio application
"""

from .plant_pipeline import (
    load_evidence_database,
    analyze_plant_image,
    transcribe_audio,
    validate_symptom_description,
    process_symptom_input,
    extract_symptom_terms,
    normalize_symptoms,
    identify_crop,
    match_plant_evidence,
    rank_plant_evidence,
    classify_plant_problem,
    identify_nutrient_deficiencies,
    get_care_category,
    get_care_recommendation,
    identify_additional_evidence,
    analyze_plantguardian,
    format_diagnosis_report,
)

try:
    from .app import create_app
except ImportError:
    pass
