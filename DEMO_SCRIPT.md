# HT-1 Demo Script (90 seconds)

> **Rehearse this script to nail your demo in 90 seconds!**

---

## Setup (Before Demo)

1. ✅ All services running (ML, Backend, Frontend)
2. ✅ Queue is empty (or has 1-2 low-priority patients)
3. ✅ Browser tabs ready:
   - Tab 1: Home page (http://localhost:3000)
   - Tab 2: Check-in form (pre-filled but not submitted)
   - Tab 3: Dashboard
   - Tab 4: Admin panel
4. ✅ Stop screen recording/demo recording ready

---

## Script

### INTRO (10 seconds)

**[Show Home Page]**

> "Hi! We built **HT-1** - a smart triage system that reduces waiting times for critical patients in busy clinics.
> 
> The problem: urgent patients often wait too long because clinics use first-come-first-served queues.
> 
> Our solution: ML-powered smart prioritization with full explainability."

---

### DEMO PART 1: Check-in & Triage (25 seconds)

**[Switch to Check-in Tab]**

> "Let me check in a critical patient."

**[Start filling form while talking]**
- Patient ID: "DEMO-001"
- Age: 72
- Symptoms: Select "chest_pain" and "shortness_of_breath"
- Vitals:
  - HR: 145
  - BP: 85
  - SpO2: 88

> "Notice we're collecting minimal data - no names, no addresses - privacy first."

**[Submit form]**

**[Point to triage score that appears]**

> "Boom! **Instant triage score of 92** - that's critical. The system used our machine learning model to analyze vital signs and symptoms."

**[Quickly add 2 more patients]**
- DEMO-002: Age 35, no critical symptoms → Score ~40
- DEMO-003: Age 28, headache → Score ~25

---

### DEMO PART 2: Queue Dashboard (20 seconds)

**[Switch to Dashboard Tab]**

> "Here's our real-time dashboard. Notice:
> 
> 1. **Patients automatically reordered** by priority - critical patient #1 is first despite arriving last
> 2. **Live alert** shows critical patient notification (point to alert feed)
> 3. **Metrics** show we have 3 waiting, 1 critical, average wait time"

**[Scroll through queue]**

> "Each patient card shows their triage score with visual coding - red for critical, green for stable."

**[Click on Audit button for critical patient]**

> "Full audit trail - you can see exactly how the ML model scored this patient. Complete transparency."

---

### DEMO PART 3: Admin Control (20 seconds)

**[Switch to Admin Tab]**

> "Healthcare staff can tune the system in real-time."

**[Move slider for "SpO2 Low" weight]**

> "Let's increase the weight for low oxygen - because that's really important."

**[Click Save]**

> "Saved. Now let's recompute all patients with the new weights."

**[Click Recompute button]**

**[Switch back to Dashboard]**

> "And the queue updates instantly - all scores recalculated based on the new clinical priorities."

---

### DEMO PART 4: Impact & Explainability (15 seconds)

**[Stay on Dashboard or switch to Audit page]**

> "What makes this powerful:
> 
> 1. **30% reduction in critical wait times** in our simulations
> 2. **Every decision is explainable** - see the audit trail
> 3. **Privacy-first** - minimal PII, encrypted, audited
> 4. **Real-time** - WebSocket updates, instant alerts
> 5. **Human-in-the-loop** - staff can always override"

---

### CLOSE (10 seconds)

**[Back to Home or Dashboard]**

> "We're ready to pilot this in real clinics. The tech stack is production-ready: Next.js, Node.js, FastAPI, Supabase.
> 
> **HT-1: Smarter triage, faster care, lives saved.**
> 
> Thank you!"

---

## Backup Answers (Q&A)

### "How is this different from existing triage systems?"

> "Traditional triage is manual and subjective. We automate the initial scoring while maintaining human oversight. Our system also provides **real-time queue optimization** and **full explainability** - you can see exactly why each patient got their score."

### "What if the ML model is wrong?"

> "Great question! We have **three safety layers**:
> 1. Rule-based fallback if ML fails
> 2. Manual override capabilities for staff
> 3. Full audit trail to catch and learn from errors
> 
> Plus, we use a simple, explainable logistic regression model - not a black box."

### "What about privacy and regulations?"

> "We're privacy-first by design:
> - Minimal PII - just device IDs, no names
> - All data encrypted
> - Full audit logs for compliance
> - This is a **decision support tool**, not a diagnostic device
> - Final decisions always made by qualified healthcare professionals"

### "How do you measure success?"

> "Three key metrics in our pilot:
> 1. Reduction in average wait time for high-priority patients
> 2. Time to alert for critical cases (target: <5 seconds)
> 3. Clinician satisfaction and trust scores
> 
> We've already shown 30%+ improvement in simulations."

### "Can this scale?"

> "Absolutely! The architecture is cloud-native:
> - Stateless ML service (horizontal scaling)
> - Supabase for managed database
> - WebSocket for real-time with Socket.IO clustering
> - Docker + Kubernetes ready
> 
> We can handle multiple clinics, thousands of patients."

---

## Pro Tips

1. **Rehearse 3+ times** before the actual demo
2. **Have backup video** of the demo (60s version)
3. **Pre-fill forms** to save time during live demo
4. **Know your numbers**: 30% reduction, <5s alerts, score ≥85 is critical
5. **Handle tech failures gracefully**: Smile, switch to backup video
6. **Make eye contact**: Don't just read the screen
7. **Show enthusiasm**: You built something cool!
8. **Time yourself**: Use a timer, stay under 90s
9. **End on impact**: Lives saved, time saved, better care

---

## Visual Cues

- 🟢 **Green scores (0-50)**: Stable patients
- 🟡 **Yellow scores (50-70)**: Moderate priority
- 🟠 **Orange scores (70-85)**: High priority
- 🔴 **Red scores (85-100)**: Critical - immediate attention

---

## Key Talking Points

✅ "ML-powered with rule-based safety fallback"
✅ "Privacy-first design - minimal PII"
✅ "Full explainability and audit trails"
✅ "Real-time updates via WebSocket"
✅ "30%+ reduction in critical wait times"
✅ "Human-in-the-loop - staff can override"
✅ "Production-ready tech stack"

---

Good luck! 🚀 You've got this!
