

# OLS Analysis Studio

A **100% client-side** web application for performing Ordinary Least Squares (OLS) regression analysis with data cleaning, visualization, and statistical insights. Python runs **directly in your browser** via PyScript/WebAssembly!

## ✨ Features

- **Data Upload & Validation**: Upload CSV files with automatic validation
- **Data Cleaning**: Multiple cleaning strategies (imputation, deletion, type conversion)
- **Descriptive Statistics**: Comprehensive statistical analysis
- **Distribution Visualization**: Beautiful plots generated with matplotlib (histogram + KDE + box plot)
- **Interactive Plot Viewing**: Click on any plot to enlarge it in full-screen modal
- **OLS Regression**: Full regression analysis with statsmodels
- **Loading Screen**: Beautiful progress indicator while Python libraries load
- **100% Private**: All data processing happens in your browser - nothing sent to a server!
- **No Backend Required**: Python runs via WebAssembly in the browser

## 🏗️ Architecture

### Revolutionary Approach: Python in the Browser!

```
Browser (Your Computer):
├─ React Frontend (UI)
├─ PyScript/WebAssembly (Python Runtime)
└─ Python Libraries in RAM:
   ├─ Pandas (Data manipulation)
   ├─ NumPy (Numerical computing)
   ├─ Matplotlib (Visualization)
   ├─ Statsmodels (OLS regression)
   └─ SciPy (Statistics)

When you close the tab → Everything deleted! ✅
```

**Technology Stack:**
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Python Runtime**: PyScript (Python via WebAssembly)
- **Data Analysis**: Pandas, NumPy, Matplotlib, Seaborn, Statsmodels, SciPy

## 🚀 Run Locally

### Prerequisites

- **Node.js** (v16+) only!
- ❌ **No Python installation needed!** (runs in browser)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the app:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:5173
   ```

4. **First load:**
   - PyScript will download Python + libraries (~50-100MB)
   - Takes 5-10 seconds to initialize
   - After first load, it's cached!

## 📊 Usage

1. **Upload CSV**: Drop your data file
2. **Clean Data**: Apply cleaning strategies if needed
3. **Select Variables**: Choose dependent & independent variables
4. **Run Analysis**: Get:
   - Descriptive statistics
   - Distribution plots (histogram + box plot)
   - OLS regression results
   - Diagnostic warnings
5. **Close Tab**: All data automatically deleted from RAM!

## 🔒 Privacy

- **100% client-side processing**
- Your data **never leaves your browser**
- No backend server involved
- No data uploads to cloud
- Perfect for sensitive data!

## 🎯 Why This Architecture?

**Advantages:**
- ✅ Complete data privacy
- ✅ Works offline (after first load)
- ✅ No server costs
- ✅ Full Python capabilities
- ✅ Easy deployment (static site)
- ✅ Can host on GitHub Pages

**Trade-offs:**
- ⏳ Initial load: ~50-100MB (one-time)
- ⏳ Startup: 5-10 seconds (loads Python)
- 🐌 Slightly slower than native Python

## 📦 Deployment

Since everything runs client-side, you can deploy as a **static site**:

```bash
npm run build
# Upload 'dist' folder to:
# - GitHub Pages
# - Netlify
# - Vercel
# - Any static hosting
```

## 🧪 Testing

Test with your own CSV file or use the demo dataset in `C:\Users\Jalal\Desktop\dataset\ols_demo_dataset.csv`

## 🔧 Development

The `backend/` folder contains the old FastAPI implementation (kept for reference). The current app uses PyScript instead!
