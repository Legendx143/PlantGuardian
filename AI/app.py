"""
PlantGuardian AI — Interactive Plant Disease Diagnosis Application
==================================================================
Allows users to provide disease descriptions in text or voice (audio recording),
automatically transcribes speech into the description text box, accepts a plant
image, and provides:
1. Probable disease name & relevance score
2. Rationale / The Reason (matched evidence, symptoms from text & image)
3. Nutrient deficiency detection & proper way to supplement them (dosages & methods)
4. Disease care & treatment guidance (organic, chemical, cultural)
5. Diagnostic follow-up questions

Run with:
    python AI/app.py
"""

import os
import sys
from pathlib import Path

# Add project root and AI folder to sys.path
AI_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = AI_DIR.parent
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Ensure UTF-8 output encoding in Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

import gradio as gr
import plant_pipeline as pp
import farming_pipeline as fp

# Predefined options for Farming & Plantation AI
SOIL_CHOICES = [
    "Alluvial Soil (River basin / Loamy)",
    "Black Soil (Clayey / Moisture-retentive)",
    "Red & Yellow Soil",
    "Laterite Soil",
    "Sandy / Loamy Sand",
    "Mountain / Forest Soil",
    "Peaty / High Organic Soil",
    "Standard Garden Potting Mix",
]

SEASON_CHOICES = [
    "Kharif (Monsoon: June – October)",
    "Rabi (Winter: October – March)",
    "Zaid (Summer: March – June)",
    "Spring (February – April)",
    "Autumn (September – November)",
    "Year-Round / Perennial",
]

# Preload the evidence database
print("Loading PlantGuardian Evidence Database...")
EVIDENCE_CSV = AI_DIR / "Datasets" / "plant_disease_corrected.csv"
evidence_db = pp.load_evidence_database(EVIDENCE_CSV)
print(f"Loaded {len(evidence_db)} records from evidence database.")

TEST_IMAGE_PATH = AI_DIR / "Datasets" / "plant_test.jpg"
TEST_AUDIO_PATH = AI_DIR / "Datasets" / "PlantRec1.mp3"


def transcribe_voice_input(audio_file):
    """Convert user audio recording into text and display it in the text box."""
    if not audio_file:
        return "", "🎙️ No audio received. Please record your voice or upload an audio file."

    try:
        result = pp.transcribe_audio(audio_file)
        if result["success"]:
            transcribed = result["text"]
            detected_lang = result.get("language", "en")
            prob = result.get("language_probability", 1.0)
            status_msg = (
                f"✅ **Speech Transcribed Successfully** (Language: `{detected_lang.upper()}` "
                f"[{prob*100:.1f}% confidence]). You can review or edit your description below."
            )
            return transcribed, status_msg
        else:
            return "", f"⚠️ **Transcription Error:** {result.get('message', 'Failed to transcribe audio.')}"
    except Exception as exc:
        return "", f"❌ **Error:** {type(exc).__name__}: {exc}"


def diagnose_plant(symptom_text, image_file):
    """Execute end-to-end diagnosis using user symptom text and plant image."""
    if not symptom_text or not str(symptom_text).strip():
        return (
            "### ⚠️ Missing Symptom Description\n\n"
            "Please speak into the microphone above or type a description of the symptoms "
            "(e.g., *'My tomato leaves are turning yellow with brown spots'*).",
            "⚠️ Missing symptom text"
        )

    if not image_file:
        return (
            "### ⚠️ Missing Plant Photo\n\n"
            "Please upload a photo of the affected plant or capture one with your camera.",
            "⚠️ Missing plant image"
        )

    try:
        # Run end-to-end pipeline
        result = pp.analyze_plantguardian(
            symptom_text=symptom_text,
            image_path=str(image_file),
            evidence_db=evidence_db,
        )

        report_md = pp.format_diagnosis_report(result)

        if result.get("success"):
            top = result.get("top_candidate", {})
            crop = result.get("identified_crop") or top.get("crop", "Plant")
            disease = top.get("diagnosis", "Undetermined")
            score = float(top.get("relevance_score", 0.0))
            if result.get("species_match") is False:
                user_c = result.get("selected_crop") or "Selected"
                img_c = result.get("detected_crop") or "Image"
                status_summary = f"⚠️ **Species Mismatch:** User: {user_c} ≠ Photo: {img_c} ({crop} — {disease})"
            else:
                status_summary = f"✅ **Diagnosis Ready:** {crop} — {disease} ({score * 100:.1f}% match)"
        else:
            status_summary = f"❌ **Analysis Incomplete:** {result.get('message', 'Check input values.')}"

        return report_md, status_summary

    except Exception as exc:
        err_report = (
            f"### ❌ Pipeline Execution Error\n\n"
            f"**Error Details:** `{type(exc).__name__}: {exc}`\n\n"
            f"Please verify your API key and input files."
        )
        return err_report, f"❌ Error: {exc}"


def load_sample_data():
    """Load sample test audio and test image into the interface."""
    sample_text = (
        "My tomato plant leaves are turning yellow and I can see several brown spots on them."
    )
    sample_img = str(TEST_IMAGE_PATH) if TEST_IMAGE_PATH.is_file() else None
    sample_audio = str(TEST_AUDIO_PATH) if TEST_AUDIO_PATH.is_file() else None
    status = "💡 Loaded sample test data: Tomato leaf image and voice recording."
    return sample_text, sample_img, sample_audio, status


def create_app():
    """Construct and configure the Gradio Blocks UI."""
    custom_css = """
    .gradio-container {
        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 1200px !important;
        margin: auto;
    }
    .header-box {
        text-align: center;
        padding: 24px 16px;
        background: linear-gradient(135deg, #1b4d3e 0%, #2e7d32 100%);
        color: white;
        border-radius: 12px;
        margin-bottom: 24px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.1);
    }
    .header-box h1 {
        color: #ffffff !important;
        font-size: 2.2rem !important;
        margin-bottom: 8px !important;
    }
    .header-box p {
        color: #e8f5e9 !important;
        font-size: 1.05rem !important;
        margin: 0;
    }
    .status-panel {
        font-weight: 500;
        padding: 8px 12px;
        border-radius: 6px;
    }
    """

    with gr.Blocks(title="PlantGuardian AI — Precision Farming & Disease Diagnosis") as demo:
        with gr.Row():
            gr.HTML("""
            <div class="header-box">
                <h1>🌱 PlantGuardian AI</h1>
                <p>Precision Tree & Crop Farming Guidance • Intelligent Disease Diagnosis & Health Check</p>
            </div>
            """)

        with gr.Tabs():
            # ═════════════════════════════════════════════════════════════
            # TAB 1: TREE & CROP FARMING ADVISORY AI
            # ═════════════════════════════════════════════════════════════
            with gr.Tab("🌾 Plant & Tree Farming Guide", id="farming_tab"):
                with gr.Row():
                    # ── LEFT: INPUTS ──
                    with gr.Column(scale=1):
                        gr.Markdown("### 1️⃣ Enter Plantation Details")
                        plant_name_input = gr.Textbox(
                            label="🌱 Plant / Tree / Crop Name",
                            placeholder="e.g., Tomato, Mango, Neem, Basmati Rice, Apple, Coconut...",
                            lines=1,
                        )

                        with gr.Row():
                            soil_input = gr.Dropdown(
                                choices=SOIL_CHOICES,
                                value=SOIL_CHOICES[0],
                                label="🏜️ Soil Type",
                            )
                            season_input = gr.Dropdown(
                                choices=SEASON_CHOICES,
                                value=SEASON_CHOICES[0],
                                label="☀️ Season / Planting Time",
                            )

                        gr.Markdown("### 2️⃣ Location (State & District)")
                        with gr.Row():
                            state_input = gr.Textbox(
                                label="State / Province",
                                placeholder="e.g., West Bengal, Maharashtra, California",
                            )
                            district_input = gr.Textbox(
                                label="District / City",
                                placeholder="e.g., Kolkata, Pune, Malda",
                            )

                        loc_btn = gr.Button(
                            "📍 Enable My Current Location (Auto-Detect)",
                            variant="secondary",
                            size="sm",
                        )
                        loc_status = gr.Markdown("Click above to auto-detect your State & District, or type them manually.")

                        generate_farm_btn = gr.Button(
                            "🌾 Generate Farming & Care Routine",
                            variant="primary",
                            size="lg",
                        )

                    # ── RIGHT: OUTPUT ──
                    with gr.Column(scale=1):
                        gr.Markdown("### 3️⃣ Personalized Cultivation & Care Roadmap")
                        farming_output = gr.Markdown(
                            """
                            ### 🌿 Awaiting Plantation Inputs
                            1. **Enter your plant or tree name** (e.g. *Mango*, *Tomato*, *Neem*).
                            2. **Select your soil type and planting season**.
                            3. **Provide your location** (enter State & District or click **📍 Enable My Current Location**).
                            4. Click **🌾 Generate Farming & Care Routine** to get:
                               - **Suitability & Climate Feasibility**
                               - **Soil & Land Preparation**
                               - **Sowing / Pit Planting Depth & Spacing**
                               - **Watering & Irrigation Schedule**
                               - **Fertilizer, Manure & Nutrient Routine**
                               - **Preventive Pest & Disease Management**
                               - **Growth Milestones & Harvest / Pruning Timeline**
                            """
                        )

            # ═════════════════════════════════════════════════════════════
            # TAB 2: PLANT DISEASE DIAGNOSIS AI
            # ═════════════════════════════════════════════════════════════
            with gr.Tab("🔬 Plant Disease Diagnosis", id="disease_tab"):
                with gr.Row():
                    # ── LEFT COLUMN: INPUTS ──────────────────────────────
                    with gr.Column(scale=1):
                        gr.Markdown("### 1️⃣ Describe Symptoms (Voice or Text)")

                        audio_input = gr.Audio(
                            sources=["microphone", "upload"],
                            type="filepath",
                            label="🎙️ Voice Input (Record or Upload Audio)",
                        )

                        transcribe_btn = gr.Button(
                            "🔊 Transcribe Voice to Text",
                            variant="secondary",
                            size="sm",
                        )

                        symptom_textbox = gr.Textbox(
                            label="📝 Disease / Symptom Description (Transcribed text appears here, or type directly)",
                            placeholder="Describe what you see on your plant (e.g., 'Tomato leaves turning yellow with brown spots and wilting')...",
                            lines=4,
                            max_lines=8,
                        )

                        gr.Markdown("### 2️⃣ Provide Plant Image")
                        image_input = gr.Image(
                            sources=["upload", "webcam"],
                            type="filepath",
                            label="📸 Upload Plant Photo or Use Camera",
                        )

                        with gr.Row():
                            diagnose_btn = gr.Button(
                                "🔍 Diagnose Plant Disease",
                                variant="primary",
                                size="lg",
                            )
                            sample_btn = gr.Button(
                                "🧪 Load Example Test Data",
                                variant="secondary",
                                size="lg",
                            )

                        status_box = gr.Markdown("Ready for input.")

                    # ── RIGHT COLUMN: RESULTS ─────────────────────────────
                    with gr.Column(scale=1):
                        gr.Markdown("### 3️⃣ Diagnostic Results & Care Plan")

                        results_markdown = gr.Markdown(
                            """
                            ### 🌿 Awaiting Diagnosis
                            1. **Record your voice** or type your symptom description on the left.
                            2. **Upload a plant photo** (leaves, stem, or fruit).
                            3. Click **Diagnose Plant Disease** to view:
                               - **Probable Disease Name & Crop**
                               - **The Reason & Matched Evidence**
                               - **Nutrient Deficiencies & Proper Supplementation Dosages**
                               - **Proper Disease Care & Treatment Steps**
                            """
                        )

        # ── EVENT BINDINGS FOR TAB 1 (FARMING AI) ────────────────────
        loc_btn.click(
            fn=fp.detect_current_location,
            inputs=[],
            outputs=[state_input, district_input, loc_status],
        )

        generate_farm_btn.click(
            fn=fp.generate_farming_guide,
            inputs=[plant_name_input, soil_input, state_input, district_input, season_input],
            outputs=[farming_output],
        )

        # ── EVENT BINDINGS FOR TAB 2 (DISEASE AI) ────────────────────
        # 1. Voice recorded or uploaded: automatically transcribe
        audio_input.change(
            fn=transcribe_voice_input,
            inputs=[audio_input],
            outputs=[symptom_textbox, status_box],
        )

        # 2. Manual click on transcribe button
        transcribe_btn.click(
            fn=transcribe_voice_input,
            inputs=[audio_input],
            outputs=[symptom_textbox, status_box],
        )

        # 3. Diagnose button
        diagnose_btn.click(
            fn=diagnose_plant,
            inputs=[symptom_textbox, image_input],
            outputs=[results_markdown, status_box],
        )

        # 4. Sample data button
        sample_btn.click(
            fn=load_sample_data,
            inputs=[],
            outputs=[symptom_textbox, image_input, audio_input, status_box],
        )

    return demo


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 7860))
    print(f"\n🌱 Launching PlantGuardian AI on http://localhost:{port} ...")
    app.launch(server_name="127.0.0.1", server_port=port, share=False)
