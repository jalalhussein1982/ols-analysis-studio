from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import statsmodels.api as sm
from scipy import stats
import io
import base64
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime

app = FastAPI(title="OLS Analysis Studio API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for sessions
sessions: Dict[str, pd.DataFrame] = {}
cleaned_sessions: Dict[str, pd.DataFrame] = {}

# Pydantic models
class CleaningDecisions(BaseModel):
    decisions: Dict[str, str]

class DescriptiveStatsRequest(BaseModel):
    dependent_var: str
    independent_vars: List[str]

class PlotRequest(BaseModel):
    variables: List[str]

class OLSRequest(BaseModel):
    dependent_var: str
    independent_vars: List[str]
    model_name: str


@app.get("/")
async def root():
    return {"message": "OLS Analysis Studio API", "status": "running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and validate a CSV file."""
    try:
        # Read the uploaded file
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        # Generate session token
        session_token = f"session_{uuid.uuid4().hex}"
        sessions[session_token] = df

        # Validation results
        validation_results = {
            "missing_data": {},
            "type_mismatches": {},
            "categorical_flags": []
        }

        # Check for missing data
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            if missing_count > 0:
                validation_results["missing_data"][col] = int(missing_count)

        # Check for type mismatches and categorical columns
        for col in df.columns:
            # Try to convert to numeric
            try:
                pd.to_numeric(df[col], errors='raise')
            except (ValueError, TypeError):
                # Check if it's categorical
                if df[col].dtype == 'object':
                    validation_results["categorical_flags"].append(col)
                else:
                    # Find rows with type mismatches
                    numeric_mask = pd.to_numeric(df[col], errors='coerce').notna()
                    non_null_mask = df[col].notna()
                    mismatch_indices = df[~numeric_mask & non_null_mask].index.tolist()
                    if mismatch_indices:
                        validation_results["type_mismatches"][col] = mismatch_indices[:10]  # Limit to 10

        # Prepare preview (first 5 rows)
        preview = df.head(5).replace({np.nan: None}).to_dict('records')

        return {
            "session_token": session_token,
            "columns": df.columns.tolist(),
            "validation_results": validation_results,
            "row_count": len(df),
            "preview": preview
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@app.post("/clean/{session_token}")
async def clean_data(session_token: str, cleaning_decisions: CleaningDecisions):
    """Clean data based on user decisions."""
    if session_token not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    df = sessions[session_token].copy()

    for column, decision in cleaning_decisions.decisions.items():
        if column not in df.columns:
            continue

        if decision == "delete_rows":
            df = df.dropna(subset=[column])
        elif decision == "impute_mean":
            df[column] = pd.to_numeric(df[column], errors='coerce')
            df[column].fillna(df[column].mean(), inplace=True)
        elif decision == "impute_median":
            df[column] = pd.to_numeric(df[column], errors='coerce')
            df[column].fillna(df[column].median(), inplace=True)
        elif decision == "forward_fill":
            df[column].fillna(method='ffill', inplace=True)
        elif decision == "drop_column":
            df = df.drop(columns=[column])
        elif decision == "convert_to_numeric":
            df[column] = pd.to_numeric(df[column], errors='coerce')

    # Store cleaned data
    cleaned_sessions[session_token] = df

    # Prepare preview
    preview = df.head(5).replace({np.nan: None}).to_dict('records')

    return {
        "columns": df.columns.tolist(),
        "preview": preview
    }


@app.post("/stats/{session_token}")
async def get_descriptive_stats(session_token: str, request: DescriptiveStatsRequest):
    """Get descriptive statistics for selected variables."""
    if session_token not in cleaned_sessions:
        raise HTTPException(status_code=404, detail="Cleaned session not found")

    df = cleaned_sessions[session_token]
    variables = [request.dependent_var] + request.independent_vars

    stats_result = {}

    for var in variables:
        if var not in df.columns:
            continue

        series = pd.to_numeric(df[var], errors='coerce').dropna()

        if len(series) == 0:
            continue

        # Calculate outliers using IQR method
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        outliers = series[(series < Q1 - 1.5 * IQR) | (series > Q3 + 1.5 * IQR)]

        stats_result[var] = {
            "mean": float(series.mean()),
            "median": float(series.median()),
            "std_dev": float(series.std()),
            "min": float(series.min()),
            "max": float(series.max()),
            "skewness": float(series.skew()),
            "kurtosis": float(series.kurtosis()),
            "outliers_count": len(outliers)
        }

    return stats_result


@app.post("/plots/{session_token}")
async def generate_plots(session_token: str, request: PlotRequest):
    """Generate distribution plots for selected variables."""
    if session_token not in cleaned_sessions:
        raise HTTPException(status_code=404, detail="Cleaned session not found")

    df = cleaned_sessions[session_token]
    plot_urls = []

    for var in request.variables:
        if var not in df.columns:
            continue

        series = pd.to_numeric(df[var], errors='coerce').dropna()

        if len(series) == 0:
            continue

        # Create figure with two subplots
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        fig.suptitle(f'Distribution of {var}', fontsize=16, fontweight='bold')

        # Histogram with KDE
        axes[0].hist(series, bins=30, edgecolor='black', alpha=0.7, color='steelblue')
        axes[0].set_xlabel(var)
        axes[0].set_ylabel('Frequency')
        axes[0].set_title('Histogram')
        axes[0].grid(True, alpha=0.3)

        # Add KDE on secondary axis
        ax_kde = axes[0].twinx()
        series.plot.kde(ax=ax_kde, color='red', linewidth=2)
        ax_kde.set_ylabel('Density', color='red')
        ax_kde.tick_params(axis='y', labelcolor='red')

        # Box plot
        axes[1].boxplot(series, vert=True)
        axes[1].set_ylabel(var)
        axes[1].set_title('Box Plot')
        axes[1].grid(True, alpha=0.3)

        # Add statistics text
        stats_text = f"Mean: {series.mean():.2f}\nMedian: {series.median():.2f}\nStd: {series.std():.2f}"
        axes[1].text(0.02, 0.98, stats_text, transform=axes[1].transAxes,
                     verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

        plt.tight_layout()

        # Convert plot to base64 string
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        plt.close()

        plot_urls.append(f"data:image/png;base64,{image_base64}")

    return {"plot_urls": plot_urls}


@app.post("/ols/{session_token}")
async def run_ols_analysis(session_token: str, request: OLSRequest):
    """Run OLS regression analysis."""
    if session_token not in cleaned_sessions:
        raise HTTPException(status_code=404, detail="Cleaned session not found")

    df = cleaned_sessions[session_token]

    # Prepare data
    y = pd.to_numeric(df[request.dependent_var], errors='coerce').dropna()
    X_data = df[request.independent_vars].apply(pd.to_numeric, errors='coerce')

    # Align X and y indices
    common_idx = y.index.intersection(X_data.dropna().index)
    y = y.loc[common_idx]
    X_data = X_data.loc[common_idx]

    # Add constant
    X = sm.add_constant(X_data)

    # Fit model
    model = sm.OLS(y, X)
    results = model.fit()

    # Extract coefficients
    coefficients = {}
    for i, var in enumerate(X.columns):
        coefficients[var] = {
            "coefficient": float(results.params[i]),
            "std_error": float(results.bse[i]),
            "t_statistic": float(results.tvalues[i]),
            "p_value": float(results.pvalues[i])
        }

    # Check for warnings
    warnings = []

    # Check condition number for multicollinearity
    if results.condition_number > 30:
        warnings.append(f"High multicollinearity detected (Condition Number: {results.condition_number:.1f}). Results may be unreliable.")

    # Check for heteroscedasticity (Breusch-Pagan test)
    from statsmodels.stats.diagnostic import het_breuschpagan
    try:
        bp_test = het_breuschpagan(results.resid, results.model.exog)
        if bp_test[1] < 0.05:  # p-value < 0.05
            warnings.append("Heteroscedasticity detected (Breusch-Pagan test p < 0.05). Consider using robust standard errors.")
    except:
        pass

    return {
        "model_name": request.model_name,
        "coefficients": coefficients,
        "r_squared": float(results.rsquared),
        "adj_r_squared": float(results.rsquared_adj),
        "f_statistic": float(results.fvalue),
        "f_p_value": float(results.f_pvalue),
        "warnings": warnings
    }


@app.delete("/session/{session_token}")
async def end_session(session_token: str):
    """Delete session and clean up data."""
    if session_token in sessions:
        del sessions[session_token]
    if session_token in cleaned_sessions:
        del cleaned_sessions[session_token]

    return {"status": "Session deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
