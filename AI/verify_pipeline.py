"""
PlantGuardian Pipeline — End-to-End Verification
=================================================
Tests every component of the analysis pipeline to confirm readiness.

Run from the project root:
    python AI/verify_pipeline.py
"""

import json
import os
import sys
from pathlib import Path

# Add AI folder to path so plant_pipeline can be imported.
AI_DIR = Path(__file__).parent
PROJECT_ROOT = AI_DIR.parent
sys.path.insert(0, str(AI_DIR))

# Ensure UTF-8 output encoding in Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import plant_pipeline as pp

# ─── Configuration ─────────────────────────────────────────────────────────
TEST_IMAGE = AI_DIR / "Datasets" / "plant_test.jpg"
TEST_AUDIO = AI_DIR / "Datasets" / "PlantRec1.mp3"
EVIDENCE_CSV = AI_DIR / "Datasets" / "plant_disease_corrected.csv"

# Load API key from .env file.
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")
API_KEY = os.getenv("OR_API_KEY", "").strip()
MODEL_ID = "google/gemini-2.5-flash"

PASS = "[PASS]"
FAIL = "[FAIL]"

results = {}


def test(name, condition, detail=""):
    condition = bool(condition)
    status = PASS if condition else FAIL
    results[name] = condition
    print(f"  {status}  {name}")
    if detail:
        print(f"         {detail}")
    return condition


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  1. EVIDENCE DATABASE LOADING")
print("=" * 60)

try:
    evidence_db = pp.load_evidence_database(EVIDENCE_CSV)
    test("Database loaded",
         len(evidence_db) > 0,
         f"{len(evidence_db)} records")
    test("Required columns present",
         all(c in evidence_db.columns for c in
             ["crop", "diagnosis", "evidence_text", "source_row_number"]))
    test("Normalized columns added",
         all(c in evidence_db.columns for c in
             ["crop_normalized", "diagnosis_normalized", "evidence_search_text"]))
    test("Unique diagnoses",
         evidence_db["diagnosis"].nunique() > 50,
         f"{evidence_db['diagnosis'].nunique()} unique diagnoses")
except Exception as exc:
    test("Database loaded", False, str(exc))
    evidence_db = None


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  2. INPUT VALIDATION")
print("=" * 60)

valid_cases = [
    ("Valid description",
     "My tomato leaves have yellow patches and brown spots.",
     True),
    ("Empty string", "", False),
    ("Too short", "spots", False),
    ("Whitespace only", "     ", False),
    ("Too long", "leaf " * 700, False),
    ("None input", None, False),
]

for label, text, expected in valid_cases:
    is_valid, _ = pp.validate_symptom_description(text)
    test(f"Validate: {label}", is_valid == expected)

# process_symptom_input
result = pp.process_symptom_input(
    "My tomato leaves are turning yellow."
)
test("process_symptom_input: valid",
     result["success"] and result["symptom_text"])

result = pp.process_symptom_input("")
test("process_symptom_input: empty rejects",
     not result["success"])


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  3. SYMPTOM EXTRACTION")
print("=" * 60)

desc = "My tomato plant leaves are turning yellow and I see brown spots on them."
terms = pp.extract_symptom_terms(desc)
test("Symptom extraction: found terms",
     len(terms) > 0,
     f"Found: {terms}")
test("Symptom extraction: 'leaves turning yellow' detected",
     "leaves turning yellow" in terms or "yellowing" in terms)
test("Symptom extraction: 'brown spots' detected",
     "brown spots" in terms or "brown spot" in terms)

# Empty input.
test("Symptom extraction: empty returns []",
     pp.extract_symptom_terms("") == [])

# Normalize.
normalized = pp.normalize_symptoms(terms)
test("Symptom normalization",
     len(normalized) > 0 and all(s == s.lower() for s in normalized))


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  4. CROP IDENTIFICATION")
print("=" * 60)

crop_tests = [
    ("My tomato plant is sick", "Tomato"),
    ("Rice leaves are yellow", "Rice"),
    ("The potato has spots", "Potato"),
    ("A plant is dying", None),
]

for text, expected in crop_tests:
    crop = pp.identify_crop(text)
    test(f"Crop ID: '{text[:30]}...'",
         crop == expected,
         f"Got: {crop}, Expected: {expected}")


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  5. EVIDENCE MATCHING & RANKING")
print("=" * 60)

if evidence_db is not None:
    test_symptoms = ["leaves turning yellow", "brown spots"]

    matches = pp.match_plant_evidence(
        evidence_db=evidence_db,
        symptom_terms=test_symptoms,
    )
    test("Matching: found records",
         len(matches) > 0,
         f"{len(matches)} matching records")

    # With crop filter.
    tomato_matches = pp.match_plant_evidence(
        evidence_db=evidence_db,
        symptom_terms=test_symptoms,
        observed_crop="Tomato",
    )
    test("Matching: crop filter works",
         len(tomato_matches) <= len(matches),
         f"{len(tomato_matches)} tomato-specific records")
    if len(tomato_matches) > 0:
        test("Matching: crop filter accurate",
             tomato_matches["crop"].str.casefold().str.contains("tomato").all())

    # Ranking.
    ranked = pp.rank_plant_evidence(
        matches=matches,
        symptom_terms=test_symptoms,
    )
    test("Ranking: produced results",
         len(ranked) > 0)
    test("Ranking: has relevance_score",
         "relevance_score" in ranked.columns)
    test("Ranking: has rank column",
         "rank" in ranked.columns)
    test("Ranking: scores are valid",
         ranked["relevance_score"].between(0, 1).all())
    test("Ranking: sorted by relevance",
         ranked["relevance_score"].is_monotonic_decreasing)
    test("Ranking: no 'Healthy' in results",
         not ranked["diagnosis"].str.casefold().str.contains("healthy").any())

    print(f"\n  Top 5 ranked candidates:")
    for _, row in ranked.head(5).iterrows():
        print(f"    Rank {int(row['rank'])}: {row['crop']} — {row['diagnosis']} "
              f"(score: {row['relevance_score']:.3f}, terms: {row['matched_terms']})")
else:
    print("  SKIPPED — database not loaded")


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  6. DISEASE TRIAGE")
print("=" * 60)

triage_tests = [
    ("My older leaves are turning yellow uniformly",
     "possible_nutrient_deficiency"),
    ("Brown spots and holes in leaves",
     "possible_disease_or_pest"),
    ("Older leaves turning yellow with brown spots",
     "multiple_possibilities"),
    ("My plant looks a bit off",
     "insufficient_evidence"),
]

for text, expected_cat in triage_tests:
    triage = pp.classify_plant_problem(text)
    test(f"Triage: {expected_cat}",
         triage["category"] == expected_cat,
         f"Got: {triage['category']}")


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  7. NUTRIENT DEFICIENCY DETECTION")
print("=" * 60)

if evidence_db is not None:
    # Test with known deficiency symptoms.
    deficiency_symptoms = ["yellowing"]
    def_matches = pp.match_plant_evidence(
        evidence_db=evidence_db,
        symptom_terms=deficiency_symptoms,
    )
    def_ranked = pp.rank_plant_evidence(
        matches=def_matches,
        symptom_terms=deficiency_symptoms,
    )

    nutrient_info = pp.identify_nutrient_deficiencies(
        def_ranked,
        "My older leaves are turning yellow uniformly"
    )
    test("Nutrient detection: returns dict",
         isinstance(nutrient_info, dict))
    test("Nutrient detection: has 'detected' key",
         "detected" in nutrient_info)
    test("Nutrient detection: has 'deficiencies' key",
         "deficiencies" in nutrient_info)

    # Check that nitrogen is detected from symptom text.
    nitrogen_from_text = pp.identify_nutrient_deficiencies(
        pp.rank_plant_evidence(
            pp.match_plant_evidence(evidence_db, ["stunted growth"]),
            ["stunted growth"],
        ),
        "My older leaves are turning yellow uniformly with stunted growth"
    )
    nitrogen_detected = any(
        "Nitrogen" in d["nutrient"]
        for d in nitrogen_from_text.get("deficiencies", [])
    )
    test("Nutrient detection: nitrogen from symptoms",
         nitrogen_detected)

    # Check deficiencies from evidence DB.
    deficiency_records = evidence_db[
        evidence_db["diagnosis"].str.contains("Deficiency", case=False, na=False)
    ]
    test("Evidence DB: has deficiency records",
         len(deficiency_records) > 0,
         f"{len(deficiency_records)} deficiency records in database")

    if len(nutrient_info.get("deficiencies", [])) > 0:
        for d in nutrient_info["deficiencies"]:
            print(f"    Detected: {d['nutrient']}")
            if d.get("supplementation"):
                print(f"    Supplementation: {d['supplementation'][:80]}...")
else:
    print("  SKIPPED — database not loaded")


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  8. CARE RECOMMENDATIONS")
print("=" * 60)

# Test every diagnosis in the database has a care category.
if evidence_db is not None:
    all_diagnoses = evidence_db["diagnosis"].dropna().unique()
    mapped_count = 0
    unmapped = []

    for diag in all_diagnoses:
        cat = pp.get_care_category(diag)
        if cat is not None:
            mapped_count += 1
        else:
            unmapped.append(diag)

    test("Care categories: all diagnoses mapped",
         len(unmapped) == 0,
         f"{mapped_count}/{len(all_diagnoses)} mapped"
         + (f" | Unmapped: {unmapped}" if unmapped else ""))

    # Test care recommendation quality.
    test_diags = [
        "Nitrogen Deficiency", "Early Blight", "Aphids",
        "Leaf Curl Virus", "Bacterial Wilt", "Mites",
    ]

    for diag in test_diags:
        care = pp.get_care_recommendation(diag)
        has_guidance = (
            care.get("guidance_available", False)
            and len(care.get("care_guidance", [])) > 0
        )
        test(f"Care for '{diag}'", has_guidance)

    # Check nutrient deficiency care has supplementation info.
    for nutrient_diag in [
        "Nitrogen Deficiency", "Phosphorus Deficiency",
        "Potassium Deficiency", "Calcium Deficiency",
        "Magnesium Deficiency", "Boron Deficiency",
    ]:
        care = pp.get_care_recommendation(nutrient_diag)
        has_suppl = bool(care.get("supplementation"))
        test(f"Supplementation for '{nutrient_diag}'", has_suppl)
else:
    print("  SKIPPED — database not loaded")


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  9. FOLLOW-UP QUESTIONS")
print("=" * 60)

triage = pp.classify_plant_problem(
    "My tomato leaves have brown spots and are turning yellow"
)
follow_up = pp.identify_additional_evidence(
    "My tomato leaves have brown spots and are turning yellow",
    triage
)
test("Follow-up: has questions",
     len(follow_up.get("additional_questions", [])) > 0,
     f"{len(follow_up['additional_questions'])} questions generated")
test("Follow-up: has recommendation",
     bool(follow_up.get("recommendation")))

# Check that spot-specific question was added.
spot_question = any(
    "spots" in q.casefold() or "spreading" in q.casefold()
    for q in follow_up["additional_questions"]
)
test("Follow-up: contextual question for spots", spot_question)


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  10. VOICE TRANSCRIPTION")
print("=" * 60)

if TEST_AUDIO.is_file():
    try:
        voice_result = pp.transcribe_audio(str(TEST_AUDIO))
        test("Voice transcription: success",
             voice_result["success"],
             f"Language: {voice_result.get('language')}")
        test("Voice transcription: has text",
             len(voice_result.get("text", "")) > 10,
             f"Text: {voice_result['text'][:80]}...")

        # Extract symptoms from transcribed text.
        if voice_result["success"]:
            voice_symptoms = pp.extract_symptom_terms(voice_result["text"])
            test("Voice → symptoms extraction",
                 len(voice_symptoms) > 0,
                 f"Found: {voice_symptoms}")
    except Exception as exc:
        test("Voice transcription", False, str(exc))
else:
    print(f"  SKIPPED — audio file not found: {TEST_AUDIO}")


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  11. END-TO-END ANALYSIS (analyze_plantguardian)")
print("=" * 60)

if evidence_db is not None and TEST_IMAGE.is_file() and API_KEY:
    test_text = (
        "My tomato plant leaves are turning yellow "
        "and I can see several brown spots on them."
    )

    try:
        full_result = pp.analyze_plantguardian(
            symptom_text=test_text,
            image_path=str(TEST_IMAGE),
            api_key=API_KEY,
            model_id=MODEL_ID,
            evidence_db=evidence_db,
        )

        test("E2E: analysis succeeded",
             full_result.get("success", False),
             full_result.get("message", ""))

        if full_result.get("success"):
            test("E2E: has image description",
                 bool(full_result.get("image_description")))
            test("E2E: has user symptoms",
                 len(full_result.get("user_reported_symptoms", [])) > 0,
                 f"User: {full_result['user_reported_symptoms']}")
            test("E2E: has image symptoms",
                 isinstance(full_result.get("image_derived_symptoms"), list),
                 f"Image: {full_result.get('image_derived_symptoms', [])}")
            test("E2E: has combined symptoms",
                 len(full_result.get("combined_symptoms", [])) > 0)
            test("E2E: crop identified",
                 full_result.get("identified_crop") is not None,
                 f"Crop: {full_result.get('identified_crop')}")
            test("E2E: has ranked candidates",
                 len(full_result.get("ranked_candidates", [])) > 0,
                 f"{len(full_result['ranked_candidates'])} candidates")
            test("E2E: candidates have care",
                 all("care" in c for c in full_result["ranked_candidates"]))
            test("E2E: candidates have reasons",
                 all("reason" in c for c in full_result["ranked_candidates"]))
            test("E2E: nutrient deficiencies checked",
                 "nutrient_deficiencies" in full_result)
            test("E2E: triage present",
                 "triage" in full_result)
            test("E2E: follow-up questions present",
                 len(full_result.get("additional_evidence", {})
                     .get("additional_questions", [])) > 0)
            test("E2E: has top_candidate",
                 full_result.get("top_candidate") is not None)
            test("E2E: has probable_disease",
                 bool(full_result.get("probable_disease")))
            test("E2E: has disease_reason",
                 bool(full_result.get("disease_reason")))

            # Test report formatting
            report = pp.format_diagnosis_report(full_result)
            test("E2E: format_diagnosis_report produces output",
                 len(report) > 100 and "PlantGuardian Diagnostic Report" in report)
            test("E2E: report contains Probable Disease section",
                 "1. Probable Disease" in report)
            test("E2E: report contains The Reason section",
                 "2. The Reason" in report)
            test("E2E: report contains Nutrient Deficiencies section",
                 "3. Nutrient Deficiencies" in report)

            # Print top candidates.
            print(f"\n  Top candidates:")
            for c in full_result["ranked_candidates"][:5]:
                print(f"    {c['rank']}. {c['crop']} — {c['diagnosis']} "
                      f"(score: {c['relevance_score']})")
                print(f"       Reason: {c['reason'][:100]}...")
                care_type = c['care'].get('condition_type', 'unknown')
                print(f"       Care type: {care_type}")
                if c['care'].get('care_guidance'):
                    print(f"       Guidance: {c['care']['care_guidance'][0][:80]}...")

            # Print nutrient info.
            nd = full_result.get("nutrient_deficiencies", {})
            if nd.get("detected"):
                print(f"\n  Nutrient deficiencies detected:")
                for d in nd["deficiencies"]:
                    print(f"    - {d['nutrient']}: {d['supplementation'][:80]}...")
            else:
                print(f"\n  No specific nutrient deficiencies detected from evidence.")

            # Print image description excerpt.
            img_desc = full_result.get("image_description", "")
            print(f"\n  Image description (excerpt):")
            print(f"    {img_desc[:200]}...")

        else:
            print(f"\n  Analysis failed: {full_result.get('message')}")

    except Exception as exc:
        test("E2E: analysis succeeded", False,
             f"{type(exc).__name__}: {exc}")
else:
    skip_reasons = []
    if evidence_db is None:
        skip_reasons.append("database not loaded")
    if not TEST_IMAGE.is_file():
        skip_reasons.append(f"test image not found: {TEST_IMAGE}")
    if not API_KEY:
        skip_reasons.append("OR_API_KEY not set in .env")
    print(f"  SKIPPED — {', '.join(skip_reasons)}")


# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  12. ERROR HANDLING")
print("=" * 60)

# Missing image.
if evidence_db is not None:
    bad_result = pp.analyze_plantguardian(
        symptom_text="Yellow leaves on my tomato",
        image_path="nonexistent.jpg",
        api_key=API_KEY or "test-key",
        model_id=MODEL_ID,
        evidence_db=evidence_db,
    )
    test("Error: missing image handled",
         not bad_result.get("success"))

    # Empty symptom text.
    bad_result = pp.analyze_plantguardian(
        symptom_text="",
        image_path=str(TEST_IMAGE),
        api_key=API_KEY or "test-key",
        model_id=MODEL_ID,
        evidence_db=evidence_db,
    )
    test("Error: empty symptoms handled",
         not bad_result.get("success"))

    # No image path.
    bad_result = pp.analyze_plantguardian(
        symptom_text="Yellow leaves on my tomato plant.",
        image_path="",
        api_key=API_KEY or "test-key",
        model_id=MODEL_ID,
        evidence_db=evidence_db,
    )
    test("Error: no image path handled",
         not bad_result.get("success"))


# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  VERIFICATION SUMMARY")
print("=" * 60)

passed = sum(1 for v in results.values() if v)
failed = sum(1 for v in results.values() if not v)
total = len(results)

print(f"\n  Total tests: {total}")
print(f"  Passed:      {passed}")
print(f"  Failed:      {failed}")

if failed == 0:
    print(f"\n  {PASS}  ALL TESTS PASSED — Pipeline is ready!")
else:
    print(f"\n  {FAIL}  {failed} test(s) failed — review above.")

# Save verification results.
output_path = AI_DIR / "Datasets" / "pipeline_verification.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({
        "total": int(total),
        "passed": int(passed),
        "failed": int(failed),
        "all_passed": bool(failed == 0),
        "results": {str(k): bool(v) for k, v in results.items()},
    }, f, indent=2)
print(f"\n  Results saved to: {output_path}")
