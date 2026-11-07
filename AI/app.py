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

CROP_CHOICES = [
    "Tomato",
    "Lemon / Citrus",
    "Potato",
    "Apple",
    "Grape",
    "Corn / Maize",
    "Rice / Paddy",
    "Wheat",
    "Cotton",
    "Mango",
    "Banana",
    "Chilli / Pepper",
    "Brinjal / Eggplant",
    "Cabbage",
    "Cauliflower",
    "Strawberry",
    "Soybean",
    "Sugarcane",
    "Onion",
    "Garlic",
    "Cucumber",
    "Papaya",
    "Guava",
    "Spinach",
    "Rose",
    "Marigold",
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


def diagnose_plant(symptom_text, image_file, selected_crop="Tomato"):
    """Execute end-to-end diagnosis using user symptom text, plant image, and selected crop."""
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
        # Run end-to-end pipeline with selected crop verification
        result = pp.analyze_plantguardian(
            symptom_text=symptom_text,
            image_path=str(image_file),
            evidence_db=evidence_db,
            selected_crop=selected_crop,
        )

        report_md = pp.format_diagnosis_report(result)

        if result.get("success"):
            top = result.get("top_candidate", {})
            crop = result.get("identified_crop") or top.get("crop", "Plant")
            disease = top.get("diagnosis", "Undetermined")
            score = float(top.get("relevance_score", 0.0))
            if result.get("species_match") is False:
                user_c = result.get("selected_crop") or selected_crop or "Selected Crop"
                img_c = result.get("detected_crop") or "Image Specimen"
                status_summary = f"⚠️ **Species Mismatch Detected:** Selected '{user_c}' ≠ Photo shows '{img_c}'"
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
    """Load sample test audio, test image, and expected crop into the interface."""
    sample_text = (
        "My tomato plant leaves are turning yellow and I can see several brown spots on them."
    )
    sample_img = str(TEST_IMAGE_PATH) if TEST_IMAGE_PATH.is_file() else None
    sample_audio = str(TEST_AUDIO_PATH) if TEST_AUDIO_PATH.is_file() else None
    status = "💡 Loaded sample test data: Tomato leaf image and voice recording."
    return sample_text, sample_img, sample_audio, status, "Tomato"


VOICE_RECORDER_HTML = """
<div id="pg-voice-box" style="margin-top: 10px; margin-bottom: 12px; padding: 12px 16px; background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <button id="pg-voice-btn" type="button" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 9999px; font-weight: 600; font-size: 13.5px; cursor: pointer; border: none; background: #166534; color: #ffffff; box-shadow: 0 2px 8px rgba(22,101,52,0.35); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
                <span id="pg-voice-icon" style="font-size: 16px;">🎙️</span>
                <span id="pg-voice-btn-label">Start Real-Time Voice Recording</span>
            </button>
            <span id="pg-voice-timer-badge" style="display: none; font-size: 12.5px; font-weight: 600; color: #b45309; background: rgba(245, 158, 11, 0.15); padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(245, 158, 11, 0.4);">
                ⏱️ Auto-stop in: <strong id="pg-voice-countdown" style="font-size: 13.5px; font-weight: 700; color: #b45309;">3</strong>s silence
            </span>
        </div>
        <div id="pg-voice-status" style="font-size: 12.5px; color: #374151; font-weight: 500; display: flex; align-items: center; gap: 6px;">
            <span id="pg-voice-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #9ca3af;"></span>
            <span id="pg-voice-msg">Click button to speak — Words transcribe into text box in real time</span>
        </div>
    </div>
    <div id="pg-voice-live-strip" style="display: none; margin-top: 10px; padding: 8px 12px; background: rgba(255,255,255,0.85); border-left: 3px solid #166534; border-radius: 6px; font-size: 12.5px; color: #14532d;">
        <span style="font-weight: 600; margin-right: 6px;">Transcribing live:</span>
        <span id="pg-voice-live-text" style="font-style: italic;">...</span>
    </div>
</div>
"""

VOICE_RECORDER_JS = """
const btn = element.querySelector('#pg-voice-btn');
const btnLabel = element.querySelector('#pg-voice-btn-label');
const icon = element.querySelector('#pg-voice-icon');
const timerBadge = element.querySelector('#pg-voice-timer-badge');
const countdownSpan = element.querySelector('#pg-voice-countdown');
const dot = element.querySelector('#pg-voice-dot');
const msg = element.querySelector('#pg-voice-msg');
const liveStrip = element.querySelector('#pg-voice-live-strip');
const liveText = element.querySelector('#pg-voice-live-text');

let isRecording = false;
let isUserStopping = false;
let silenceInterval = null;
let lastVoiceTime = Date.now();
let activeRecognition = null;
let baseText = '';
let currentSessionFinal = '';
let cachedTarget = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function findTextarea() {
    const directEl = document.getElementById('symptom_textbox');
    if (directEl) {
        if (directEl.tagName === 'TEXTAREA' || directEl.tagName === 'INPUT') {
            return directEl;
        }
        const inner = directEl.querySelector('textarea') || directEl.querySelector('input');
        if (inner) return inner;
    }
    return document.querySelector('#symptom_textbox textarea') ||
           document.querySelector('#symptom_textbox input') ||
           document.querySelector('textarea[data-testid="textbox"]') ||
           document.querySelector('textarea');
}

function updateTextareaValue(val, isFinal) {
    if (!cachedTarget || !document.contains(cachedTarget)) {
        cachedTarget = findTextarea();
    }
    if (!cachedTarget) return;

    // Fast direct property update with prototype setter fallback
    try {
        const proto = Object.getPrototypeOf(cachedTarget);
        const setVal = Object.getOwnPropertyDescriptor(proto, 'value')?.set ||
                       Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setVal) {
            setVal.call(cachedTarget, val);
        } else {
            cachedTarget.value = val;
        }
    } catch(e) {
        cachedTarget.value = val;
    }
    
    // Dispatch input event for real-time reactivity
    cachedTarget.dispatchEvent(new Event('input', { bubbles: true }));
    if (isFinal) {
        cachedTarget.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function stopVoiceRecording(reason) {
    isUserStopping = true;
    isRecording = false;

    if (silenceInterval) {
        clearInterval(silenceInterval);
        silenceInterval = null;
    }

    if (activeRecognition) {
        try { activeRecognition.stop(); } catch(e) {}
        activeRecognition = null;
    }

    // Commit final change event
    if (cachedTarget) {
        cachedTarget.dispatchEvent(new Event('change', { bubbles: true }));
    }

    btn.style.background = '#166534';
    btn.style.boxShadow = '0 2px 8px rgba(22,101,52,0.35)';
    btn.classList.remove('pg-pulse-anim');
    icon.textContent = '🎙️';
    btnLabel.textContent = 'Start Real-Time Voice Recording';
    timerBadge.style.display = 'none';
    dot.style.background = '#10b981';

    if (reason === 'silence') {
        msg.innerHTML = '<span style="color:#166534; font-weight:600;">✅ Recording complete (auto-stopped).</span> Symptoms saved.';
    } else {
        msg.innerHTML = '<span style="color:#166534; font-weight:600;">✅ Recording stopped.</span> Symptoms ready in description box.';
    }

    setTimeout(() => {
        if (!isRecording) {
            liveStrip.style.display = 'none';
            dot.style.background = '#9ca3af';
            msg.textContent = 'Click button to speak — Words transcribe into text box in real time';
        }
    }, 3000);
}

function startVoiceSession() {
    if (!isRecording || isUserStopping) return;

    try {
        const recognition = new SpeechRecognition();
        activeRecognition = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Use user browser language directly for minimum acoustic latency
        recognition.lang = (navigator.language && navigator.language.length > 0) ? navigator.language : 'en-US';

        currentSessionFinal = '';

        recognition.onstart = () => {
            lastVoiceTime = Date.now();
        };

        const markVoiceActive = () => {
            lastVoiceTime = Date.now();
            dot.style.background = '#10b981';
            msg.innerHTML = '<span style="color:#15803d; font-weight:700;">🟢 🎙️ Voice Detected!</span> Transcribing live into text box...';
        };

        recognition.onaudiostart = markVoiceActive;
        recognition.onsoundstart = markVoiceActive;
        recognition.onspeechstart = markVoiceActive;

        recognition.onresult = (event) => {
            lastVoiceTime = Date.now();
            dot.style.background = '#10b981';
            msg.innerHTML = '<span style="color:#15803d; font-weight:700;">🟢 🎙️ Voice Detected!</span> Transcribing live into text box...';

            let curFinal = '';
            let curInterim = '';

            for (let i = 0; i < event.results.length; i++) {
                const item = event.results[i];
                const txt = item[0]?.transcript || '';
                if (item.isFinal) {
                    curFinal += (curFinal ? ' ' : '') + txt.trim();
                } else {
                    curInterim += (curInterim ? ' ' : '') + txt.trim();
                }
            }

            currentSessionFinal = curFinal;
            const speakingNow = (curFinal + (curInterim ? (curFinal ? ' ' : '') + curInterim : '')).trim();

            liveStrip.style.display = 'block';
            liveText.textContent = speakingNow || 'Listening for speech...';

            const fullText = baseText
                ? (speakingNow ? baseText + ' ' + speakingNow : baseText)
                : speakingNow;

            if (fullText) {
                updateTextareaValue(fullText, false);
            }
        };

        recognition.onerror = (e) => {
            console.warn('Speech recognition error:', e.error);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                dot.style.background = '#ef4444';
                msg.innerHTML = '<span style="color:#dc2626; font-weight:600;">❌ Microphone permission denied in browser.</span>';
                stopVoiceRecording('permission_denied');
                return;
            }
        };

        recognition.onend = () => {
            if (currentSessionFinal) {
                baseText = baseText ? (baseText + ' ' + currentSessionFinal) : currentSessionFinal;
                currentSessionFinal = '';
            }

            if (isRecording && !isUserStopping) {
                const elapsed = Date.now() - lastVoiceTime;
                if (elapsed < 3000) {
                    setTimeout(() => {
                        if (isRecording && !isUserStopping) {
                            try { startVoiceSession(); } catch(err) {}
                        }
                    }, 50);
                } else {
                    stopVoiceRecording('silence');
                }
            }
        };

        recognition.start();
    } catch(err) {
        console.warn('SpeechRecognition error:', err);
    }
}

function startVoiceRecording() {
    if (!SpeechRecognition) {
        dot.style.background = '#ef4444';
        msg.innerHTML = '<span style="color:#dc2626; font-weight:600;">❌ Real-time speech recognition requires Chrome, Edge, or Safari.</span>';
        return;
    }

    cachedTarget = findTextarea();
    baseText = cachedTarget ? cachedTarget.value.trim() : '';
    currentSessionFinal = '';
    isUserStopping = false;
    isRecording = true;
    lastVoiceTime = Date.now();

    btn.style.background = '#dc2626';
    btn.style.boxShadow = '0 2px 12px rgba(220,38,38,0.5)';
    btn.classList.add('pg-pulse-anim');
    icon.textContent = '⏹️';
    btnLabel.textContent = 'Stop Recording';
    timerBadge.style.display = 'inline-block';
    countdownSpan.textContent = '3';
    dot.style.background = '#ef4444';
    msg.innerHTML = '<span style="color:#dc2626; font-weight:700;">🔴 Recording...</span> Speak symptoms into your microphone.';
    liveStrip.style.display = 'block';
    liveText.textContent = 'Speak now... Words appear in the text box in real time';

    // 3-second silence watcher interval
    if (silenceInterval) clearInterval(silenceInterval);
    silenceInterval = setInterval(() => {
        if (!isRecording) {
            clearInterval(silenceInterval);
            return;
        }

        const elapsed = Date.now() - lastVoiceTime;
        const remaining = Math.max(0, Math.ceil((3000 - elapsed) / 1000));
        countdownSpan.textContent = remaining;

        if (elapsed >= 800) {
            dot.style.background = '#f59e0b';
            msg.innerHTML = '<span style="color:#b45309; font-weight:500;">Listening...</span> will auto-stop after 3s of silence.';
        }

        if (elapsed >= 3000) {
            stopVoiceRecording('silence');
        }
    }, 120);

    startVoiceSession();
}

btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isRecording) {
        stopVoiceRecording('user');
    } else {
        startVoiceRecording();
    }
});
"""


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
    @keyframes pg-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.08); }
    }
    .pg-pulse-anim {
        animation: pg-pulse 1.2s infinite ease-in-out;
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

                        gr.Markdown("### 2️⃣ Location (Optional)")
                        with gr.Row():
                            state_input = gr.Textbox(
                                label="State / Province (Optional)",
                                placeholder="e.g., West Bengal, Maharashtra, California (or leave blank)",
                            )
                            district_input = gr.Textbox(
                                label="District / City (Optional)",
                                placeholder="e.g., Kolkata, Pune, Malda (or leave blank)",
                            )

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
                            3. **Location (Optional):** Enter State & District for localized advice, or leave blank.
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
                        gr.Markdown("### 1️⃣ Selected Plant & Symptoms (Voice or Text)")

                        species_dropdown = gr.Dropdown(
                            choices=CROP_CHOICES,
                            value="Tomato",
                            label="🌱 Expected / Selected Plant Species",
                            info="Select the crop you are inspecting so PlantGuardian AI can verify botanical species match.",
                        )

                        # Real-Time Voice Recording & Live Dictation Widget
                        gr.HTML(
                            value=VOICE_RECORDER_HTML,
                            js_on_load=VOICE_RECORDER_JS,
                        )

                        symptom_textbox = gr.Textbox(
                            label="📝 Disease / Symptom Description (Spoken voice appears here in real time, or type directly)",
                            placeholder="Describe what you see on your plant (e.g., 'Tomato leaves turning yellow with brown spots and wilting')...",
                            lines=4,
                            max_lines=8,
                            elem_id="symptom_textbox",
                        )

                        with gr.Accordion("🎙️ Offline / Direct Microphone Audio Recording & File Upload", open=False):
                            audio_input = gr.Audio(
                                sources=["microphone", "upload"],
                                type="filepath",
                                label="🎙️ Direct Microphone Voice Recording / File Upload",
                                elem_id="pg_audio_input",
                            )

                            transcribe_btn = gr.Button(
                                "🔊 Transcribe Voice to Description",
                                variant="secondary",
                                size="sm",
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
            inputs=[symptom_textbox, image_input, species_dropdown],
            outputs=[results_markdown, status_box],
        )

        # 4. Sample data button
        sample_btn.click(
            fn=load_sample_data,
            inputs=[],
            outputs=[symptom_textbox, image_input, audio_input, status_box, species_dropdown],
        )

    return demo


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 7860))
    print(f"\n🌱 Launching PlantGuardian AI on http://localhost:{port} ...")
    app.launch(server_name="127.0.0.1", server_port=port, share=False)
