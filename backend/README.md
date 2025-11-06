# OLS Analysis Studio - Backend

Python FastAPI backend for the OLS Analysis Studio application.

## Features

- CSV file upload and validation
- Data cleaning with multiple strategies (imputation, deletion, etc.)
- Descriptive statistics calculation
- Distribution plot generation using matplotlib/seaborn
- OLS regression analysis using statsmodels

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation is available at `http://localhost:8000/docs`

## API Endpoints

- `POST /upload` - Upload CSV file
- `POST /clean/{session_token}` - Clean data with specified strategies
- `POST /stats/{session_token}` - Get descriptive statistics
- `POST /plots/{session_token}` - Generate distribution plots
- `POST /ols/{session_token}` - Run OLS regression analysis
- `DELETE /session/{session_token}` - Delete session data
