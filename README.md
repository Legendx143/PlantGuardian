# 🌱 PlantGuardian — Happier Plants, Greener Tomorrows

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PlantGuardian is an intelligent agriculture and botanical health companion designed to empower gardeners, home growers, and regenerative farmers with multimodal AI diagnostics, organic remedies, and precision crop cultivation plans.

---

## ✨ Features

- **🔬 Multimodal Disease Diagnosis:** Upload plant leaf photographs or describe symptoms via voice input. The AI pathology model diagnoses probable diseases, deficiency causes, and organic/preventive treatments.
- **🌾 Precision Farming & Agronomy Guidance:** Generates comprehensive 7-stage cultivation routines tailored to specific crops, soil profiles (Alluvial, Black, Clay, Red, Sandy, Loamy), sowing seasons (Kharif, Rabi, Zaid), and geographical location.
- **🎙️ Voice Recognition & Speech-to-Text:** Realtime continuous speech input for symptom descriptions and chatbot queries with an automated 5-second silence detection shutdown.
- **💬 Interactive Agronomist AI Chatbot:** On-demand botanical advice for plant care, watering schedules, pest outbreaks, and NPK fertilizer dosing.
- **📜 Session & History Management:** Diagnoses and farming plans persist across sessions with detailed drawers and full-plan modals.
- **📍 GPS & Reverse Geocoding:** Auto-detects local region and district for hyper-localized agricultural advisories.
- **🔐 Secure Authentication:** Seamless email registration and login powered by Supabase Auth and PostgreSQL.

---

## 🛠️ Architecture & Tech Stack

```
PlantGuardian/
├── Frontend/           # React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
├── Backend/            # Node.js Express server, Supabase Admin client, OpenRouter AI
├── AI/                 # Python computer vision & agronomic diagnostic pipelines
├── Database/           # PostgreSQL migration schemas & Supabase table setups
└── supabase/           # SQL migration definitions for user profiles and scans
```

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

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
