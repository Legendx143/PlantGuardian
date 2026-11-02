# 🌱 PlantGuardian — Happier Plants, Greener Tomorrows

PlantGuardian is an intelligent agriculture and botanical health companion designed to empower gardeners, home growers, and regenerative farmers with multimodal AI diagnostics, organic remedies, and precision crop cultivation plans.

---

## 💡 What Problems It Solves

| Challenge | Traditional Limitation | PlantGuardian's Solution |
| :--- | :--- | :--- |
| **Pathology & Diagnosis** | Relying on guesswork, slow field visits, or biased forum posts. | **Instant Multimodal AI:** Upload leaf photos or voice descriptions for instant cause & severity diagnosis. |
| **Agronomy Guidance** | Generic crop tips that ignore local soil type and seasonal timing. | **Localized 7-Stage Roadmaps:** GPS-driven plans tailored by crop, season (*Kharif/Rabi/Zaid*), and soil profile. |
| **Pest & Chemical Overuse** | Blind pesticide spraying that degrades soil and wastes money. | **Regenerative & Organic First:** Prescribes organic remedies, NPK nutrient balancing, and preventive IPM practices. |
| **Field Accessibility** | Typing detailed botanical symptoms with dirty hands in the field is tedious. | **Hands-Free Speech Engine:** Continuous voice input with auto-silence cutoff for frictionless querying. |
| **Record Continuity** | Forgetting prior treatments, soil tests, or seasonal patterns. | **Persistent Session Vault:** Supabase-backed history tracking past diagnoses and active roadmaps. |


## ✨ Features

- **🔬 Multimodal Disease Diagnosis:** Upload plant leaf photographs or describe symptoms via voice input. The AI pathology model diagnoses probable diseases, deficiency causes, and organic/preventive treatments.
- **🌾 Precision Farming & Agronomy Guidance:** Generates comprehensive 7-stage cultivation routines tailored to specific crops, soil profiles (Alluvial, Black, Clay, Red, Sandy, Loamy), sowing seasons (Kharif, Rabi, Zaid), and geographical location.
- **🎙️ Voice Recognition & Speech-to-Text:** Realtime continuous speech input for symptom descriptions and chatbot queries with an automated 5-second silence detection shutdown.
- **💬 Interactive Agronomist AI Chatbot:** On-demand botanical advice for plant care, watering schedules, pest outbreaks, and NPK fertilizer dosing.
- **📜 Session & History Management:** Diagnoses and farming plans persist across sessions with detailed drawers and full-plan modals.
- **📍 GPS & Reverse Geocoding:** Auto-detects local region and district for hyper-localized agricultural advisories.
- **🔐 Secure Authentication:** Seamless email registration and login powered by Supabase Auth and PostgreSQL.

---

## 🛠️ Tech Stack

- **AI / ML:** Python 3.10+, Multimodal Computer Vision Pathology(Curated Agronomic Diagnostic Engine, Multimodal Pathology via API), Precision Agronomy AI,         Pandas, NumPy, Web Speech Recognition.
- **Frontend:** React 18, Vite 6, TypeScript, Tailwind CSS & Glassmorphism, HTML5 Canvas Particle Engine, Lucide Icons.
- **Backend:** Node.js, Express.js REST API, Nodemailer (SMTP), OpenStreetMap Reverse Geocoding.
- **Database & Auth:** Supabase PostgreSQL, Supabase Auth (JWT), Supabase Realtime Sync, Supabase S3 Storage.


---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.10 or higher)
- [Supabase](https://supabase.com/) account & project credentials

### 1. Clone the Repository
```bash
git clone https://github.com/Legendx143/PlantGuardian.git
cd PlantGuardian
```

### 2. Configure Environment Variables
Create `.env` files in `Frontend/` and `Backend/` following the templates:

**`Backend/.env`:**
```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OR_API_KEY=your_openrouter_api_key
```

**`Frontend/.env`:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:5000
```

### 3. Install Dependencies
```bash
# Install Frontend dependencies
cd Frontend
npm install

# Install Backend dependencies
cd ../Backend
npm install
```

### 4. Run Development Servers
You can launch both servers simultaneously using the root launcher:
```bash
node run_dev.js
```
Or start each service separately:
```bash
# Start Backend (Port 5000)
cd Backend && npm run dev

# Start Frontend (Port 5173)
cd Frontend && npm run dev
```

Visit `http://localhost:5173` in your browser.

---

Demo Video: https://lnkd.in/p/dTJdJkKD  |  https://youtu.be/ml6OwZJ7Xms

Built with ❤️ for Plants and the people who love them.

👤 Author
Supriyo Halder - GitHub: @Legendx143
