# 🏥 HT-1: The Smart City Triage Ecosystem

## 🚀 Tagline
**"From Casualty to Care in Seconds: AI-Powered Triage & Smart City Dispatch."**

## 📝 Short Description (Elevator Pitch)
HT-1 is an intelligent emergency response system that eliminates hospital bottlenecks. By combining **Client-Side Computer Vision** for instant injury analysis, a **Hybrid ML+Rules Engine** for safe and rapid triage scoring, and a **Smart City Referral Network**, specific patients are automatically routed to the *fastest* available care, not just the closest building. It transforms "waiting rooms" into "data-driven command centers."

## 🌟 Key Features

### 1. 👁️ Privacy-First Visual Triage
Instead of uploading sensitive photos to the cloud, HT-1 uses **on-device computer vision** (Canvas API + Pixel Analysis) to scan potential injuries (hemorrhage/hematoma) directly in the browser. It calculates a severity index instantly while keeping patient data private and HIPAA-compliant.

### 2. 🧠 Hybrid Intelligence Engine
We don't trust black boxes with lives. Our backend uses a **Dual-Layer Logic**:
*   **Layer 1 (ML):** A Logistic Regression model trained on 5,000+ synthetic clinical records to predict risk patterns.
*   **Layer 2 (SafetyNet):** Hard-coded clinical rule overrides (e.g., "SpO2 < 90 = Critical") ensure that AI hallucinations never endanger a patient.

### 3. 🚑 Smart City Load Balancing
Hospitals don't exist in a vacuum. HT-1 connects them. If a facility is overloaded, our **Referral Algorithm** calculates a "Transfer Score" based on real-time traffic (distance), current ER wait times, and bed capacity to suggest the optimal redirection target instantly.

### 4. 📄 Forensic-Grade Reporting
Every scan, slight change in vitals, and AI decision is logged. We generate instant **PDF Symptom Reports** that include the visual injury analysis, ready for the doctor before they even enter the room.

---

## 🛠️ Tech Stack
*   **Frontend:** Next.js 14, TailwindCSS, Framer Motion (Glassmorphism UI), Recharts.
*   **Backend:** Node.js, Express, Socket.io (Real-time WebSockets).
*   **ML Microservice:** Python, FastAPI, Scikit-learn, Pandas, Joblib.
*   **Database:** Supabase (PostgreSQL) with Realtime subscriptions.
*   **Edge AI:** Custom Pixel-Analysis Algorithms for hemorrhage detection.

## 💡 Inspiration
We noticed that while "telehealth" is booming, the actual physical *Emergency Room* experience hasn't changed in 50 years. Patients still fill out paper forms while bleeding. We wanted to build a system that *sees* the patient, *understands* the urgency, and *coordinates* the city to save them.
