from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
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
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

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
analysis_results: Dict[str, Dict[str, Any]] = {}  # Store analysis results per session

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

    # Store results
    if session_token not in analysis_results:
        analysis_results[session_token] = {}
    analysis_results[session_token]['stats'] = stats_result

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

    # Store results
    if session_token not in analysis_results:
        analysis_results[session_token] = {}
    analysis_results[session_token]['plots'] = plot_urls

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

    result = {
        "model_name": request.model_name,
        "coefficients": coefficients,
        "r_squared": float(results.rsquared),
        "adj_r_squared": float(results.rsquared_adj),
        "f_statistic": float(results.fvalue),
        "f_p_value": float(results.f_pvalue),
        "warnings": warnings
    }

    # Store results
    if session_token not in analysis_results:
        analysis_results[session_token] = {}
    if 'ols_models' not in analysis_results[session_token]:
        analysis_results[session_token]['ols_models'] = []
    analysis_results[session_token]['ols_models'].append(result)

    return result


@app.get("/export/stats/{session_token}")
async def export_stats_pdf(session_token: str):
    """Export descriptive statistics as PDF."""
    if session_token not in analysis_results or 'stats' not in analysis_results[session_token]:
        raise HTTPException(status_code=404, detail="No statistics found for this session")

    stats = analysis_results[session_token]['stats']

    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title = Paragraph("Descriptive Statistics Report", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 0.3 * inch))

    # Add generation date
    date_text = Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal'])
    story.append(date_text)
    story.append(Spacer(1, 0.3 * inch))

    # Create table data
    table_data = [['Variable', 'Mean', 'Median', 'Std. Dev.', 'Min', 'Max', 'Skewness', 'Kurtosis', 'Outliers']]

    for var, data in stats.items():
        table_data.append([
            var,
            f"{data['mean']:.2f}",
            f"{data['median']:.2f}",
            f"{data['std_dev']:.2f}",
            f"{data['min']:.2f}",
            f"{data['max']:.2f}",
            f"{data['skewness']:.2f}",
            f"{data['kurtosis']:.2f}",
            str(data['outliers_count'])
        ])

    # Create table
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))

    story.append(table)
    doc.build(story)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=descriptive_stats_{session_token[:8]}.pdf"}
    )


@app.get("/export/ols/{session_token}/{model_name}")
async def export_ols_pdf(session_token: str, model_name: str):
    """Export OLS model results as PDF."""
    if session_token not in analysis_results or 'ols_models' not in analysis_results[session_token]:
        raise HTTPException(status_code=404, detail="No OLS models found for this session")

    # Find the specific model
    model = None
    for m in analysis_results[session_token]['ols_models']:
        if m['model_name'] == model_name:
            model = m
            break

    if not model:
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")

    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title = Paragraph(f"OLS Regression Results: {model_name}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 0.3 * inch))

    # Add generation date
    date_text = Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal'])
    story.append(date_text)
    story.append(Spacer(1, 0.3 * inch))

    # Model Summary
    summary_text = f"""
    <b>Model Summary:</b><br/>
    R-squared: {model['r_squared']:.4f}<br/>
    Adj. R-squared: {model['adj_r_squared']:.4f}<br/>
    F-statistic: {model['f_statistic']:.4f}<br/>
    F-statistic p-value: {model['f_p_value']:.6f}
    """
    story.append(Paragraph(summary_text, styles['Normal']))
    story.append(Spacer(1, 0.3 * inch))

    # Warnings
    if model['warnings']:
        story.append(Paragraph("<b>Warnings:</b>", styles['Heading2']))
        for warning in model['warnings']:
            story.append(Paragraph(f"• {warning}", styles['Normal']))
        story.append(Spacer(1, 0.3 * inch))

    # Coefficients table
    story.append(Paragraph("<b>Coefficients:</b>", styles['Heading2']))
    story.append(Spacer(1, 0.2 * inch))

    table_data = [['Variable', 'Coefficient', 'Std. Error', 't-statistic', 'P>|t|']]

    for var, data in model['coefficients'].items():
        table_data.append([
            var,
            f"{data['coefficient']:.4f}",
            f"{data['std_error']:.4f}",
            f"{data['t_statistic']:.3f}",
            f"{data['p_value']:.4f}"
        ])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))

    story.append(table)
    doc.build(story)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={model_name}_{session_token[:8]}.pdf"}
    )


@app.delete("/session/{session_token}")
async def end_session(session_token: str):
    """Delete session and clean up data."""
    if session_token in sessions:
        del sessions[session_token]
    if session_token in cleaned_sessions:
        del cleaned_sessions[session_token]
    if session_token in analysis_results:
        del analysis_results[session_token]

    return {"status": "Session deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
