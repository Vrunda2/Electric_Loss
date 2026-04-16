# ⚡ SmartGrid Analytics: Energy Anomaly & Forecasting Platform

A comprehensive full-stack solution for monitoring smart grid data, detecting energy anomalies (Electric Loss), and forecasting future demand. Built with **FastAPI**, **React**, and **Machine Learning** (Isolation Forest & Prophet), this platform provides actionable insights for utility management.

---

## 🚀 Key Features

*   **🔍 AI-Driven Anomaly Detection**: Uses the `Isolation Forest` algorithm to identify non-technical losses like energy theft or meter malfunctions.
*   **📈 Predictive Forecasting**: Leverages Facebook `Prophet` to predict energy demand up to 90 days in advance, incorporating weather patterns and holiday calendars.
*   **🤖 Smart Guardian (AI Chatbot)**: Integrated **Google Gemini** chatbot that allows users to query energy data using natural language.
*   **⚙️ Robust ETL Pipeline**: Automated scripts to ingest, clean, and process large-scale smart meter datasets.
*   **🛡️ Secure Admin Panel**: Role-based access control with JWT-protected endpoints for grid administrators.
*   **📊 Insightful Visualization**: React-based dashboard with interactive charts displaying consumption trends vs. weather correlations.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MySQL / SQLAlchemy ORM
- **ML Libraries**: Scikit-Learn, Prophet, Pandas, NumPy
- **AI**: Google Gemini API
- **Security**: JWT, Bcrypt

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Vanilla CSS (Desktop-first)
- **Data Viz**: Recharts / Chart.js

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ (for Frontend)
- MySQL Server

### 2. Backend Configuration
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Vrunda2/Electric_Loss.git
    cd Electric_Loss
    ```
2.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Environment Setup**:
    Create a `.env` file in the root directory and add the following:
    ```env
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=your_user
    DB_PASSWORD=your_password
    DB_NAME=Electric_Loss
    GEMINI_API_KEY=your_gemini_key
    AUTH_SECRET_KEY=your_random_secret_key
    ADMIN_USERNAME=
    ADMIN_PASSWORD=
    ```

### 3. Frontend Configuration
1.  **Navigate to the frontend folder**:
    ```bash
    cd frontend
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```

---

## 🏃 Running the Application

### Start Backend
From the root directory:
```bash
uvicorn backend.main:app --reload
```
The API will be available at: `http://localhost:8000`
Docs: `http://localhost:8000/docs`

### Start Frontend
From the `frontend/` directory:
```bash
npm run dev
```
The app will be available at: `http://localhost:5173`

---

## 📂 Project Structure

```text
.
├── backend/            # FastAPI source (API, Routers, Models, Services)
│   ├── auth/           # Security & JWT logic
│   ├── etl/            # Data cleaning & ingestion scripts
│   ├── routers/        # API Endpoints
│   └── services/       # Core ML logic (Anomalies, Forecast)
├── frontend/           # React Source Code
│   ├── src/            # Components, Pages, Assets
│   └── index.html      # Main entry point
├── ml_models/          # Trained & Serialized ML models (.pkl/.joblib)
├── data/               # Local data storage for testing
└── requirements.txt    # Backend Dependencies
```

---

## 📊 Evaluation & Metrics
- **Anomaly Detection**: Precision & Recall are optimized through per-ACORN group modeling.
- **Forecasting**: MAP (Mean Absolute Percentage Error) is minimized by including weather as an external regressor.

---

## 🤝 Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any major changes.

**License**: MIT
