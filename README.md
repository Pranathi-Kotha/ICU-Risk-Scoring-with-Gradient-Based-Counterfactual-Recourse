# ICU Insight – Mortality Prediction & Counterfactual Explainability

**ICU Insight** is an academic web dashboard designed to explore how machine learning models predict Intensive Care Unit (ICU) mortality risk and explain what changes in a patient's measurements would lower that predicted risk.

> **Disclaimer:** This is an academic machine learning project built for research and educational demonstration. It is **not a medical or clinical decision-making tool** and should not be used to guide patient care.

---

## What This App Does

The application is organized into three simple pages:

1. **Dashboard**
   Gives an overview of the ICU patient dataset and compares three machine learning models (Logistic Regression, Random Forest, and a Neural Network / MLP) using easy-to-read tables and charts.

2. **Patient Prediction**
   Lets you enter a patient's ICU measurements (or pick from ready-made sample patients) and click **Predict** to see the estimated mortality risk and whether it crosses the study's decision threshold.

3. **Counterfactual Explanation**
   Shows a "what-if" explanation for high-risk predictions—highlighting which patient values would need to change, by how much, and whether those changes stay within realistic bounds—alongside a comparison of three explanation methods tested in the project.

---

## Built With

- **React & TypeScript** for the web interface
- **Tailwind CSS** for the clean clinical dashboard layout
- **Recharts & Lucide Icons** for charts and visual indicators
- **Python FastAPI Ready** so the interface can connect directly to the trained model backend (with built-in demonstration data when no backend is running)

---

## Running the Project Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

If you have the Python FastAPI backend running, click **FastAPI / Demo** in the top-right corner of the app to enter your server URL (for example, `http://localhost:8000`). Otherwise, the app runs in **Synthetic Demonstration Mode** so you can explore every feature right away.
