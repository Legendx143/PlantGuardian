"""
PlantGuardian AI — Application Launcher
========================================
Run from project root:
    python run_app.py
or:
    python AI/app.py
"""

import os
import sys
from pathlib import Path

# Ensure UTF-8 output encoding in Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Set paths
PROJECT_ROOT = Path(__file__).resolve().parent
AI_DIR = PROJECT_ROOT / "AI"
for p in [str(AI_DIR), str(PROJECT_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Support both IDE static resolution and direct execution
try:
    from AI.app import create_app
except ImportError:
    try:
        from app import create_app
    except ImportError:
        import AI.app as _app
        create_app = _app.create_app

if __name__ == "__main__":
    demo = create_app()
    port = int(os.environ.get("PORT", 7860))
    print(f"\n[PlantGuardian] Starting AI web application on port {port}...")
    try:
        demo.launch(server_name="127.0.0.1", server_port=port, share=False)
    except OSError:
        print(f"[PlantGuardian] Port {port} is occupied, finding next available port...")
        demo.launch(server_name="127.0.0.1", share=False)

