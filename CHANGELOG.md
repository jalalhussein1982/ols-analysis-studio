# Changelog

All notable changes to the OLS Analysis Studio project.

## [2.0.0] - 2025-01-06

### 🎉 Major Architecture Change: FastAPI → PyScript

#### Revolutionized the Application
- **Converted from FastAPI backend to 100% client-side PyScript**
- Python now runs directly in browser via WebAssembly
- Eliminated need for backend server entirely
- All data processing happens client-side for complete privacy

#### Key Changes
- Created `public/analysis.py` - Main Python module that runs in browser
- Updated `services/apiService.ts` - Changed from HTTP calls to direct Python function calls
- Modified `index.html` - Added PyScript runtime and Python package configuration
- All Python libraries (pandas, numpy, matplotlib, scipy, statsmodels) load in browser RAM

---

## [1.5.0] - 2025-01-06

### 🎨 UI/UX Improvements

#### Loading Screen
- **Added beautiful loading screen** while Python libraries initialize
- Displays progress bar that animates from 0% to 100%
- Shows list of libraries being loaded (pandas, numpy, matplotlib, scipy, statsmodels)
- Realistic progress pacing (fast start, slows down near completion)
- Gradient background with branded design

#### Color & Contrast Fixes
- **Improved loading page readability**:
  - Changed text colors from gray to white for better contrast
  - Enhanced progress bar visibility (gradient blue, increased height)
  - Made percentage indicator bold and white
  - Added gradient background for visual depth

- **Fixed tab navigation visibility**:
  - Changed inactive tabs from light gray to dark gray
  - Added background highlight on hover
  - Active tabs now have light blue background
  - Increased font weight to semibold
  - Added smooth transitions

- **Enhanced spinner component**:
  - Increased border thickness from 2px to 4px
  - Added light gray base color for visibility on dark backgrounds
  - Better visual feedback during loading states

#### Interactive Features
- **Click-to-enlarge plots**: Users can click any distribution plot to view it full-screen
- Modal includes:
  - Dark semi-transparent overlay
  - Close button (✕)
  - Click outside to close
  - ESC key to close
  - Smooth transitions and hover effects on thumbnails

---

## [1.4.0] - 2025-01-06

### 🐛 Bug Fixes

#### Plot Generation Fixed
- **Resolved matplotlib backend issues with PyScript**
- Fixed `'NoneType' object has no attribute 'toDataURL'` error
- Explicitly set matplotlib to use 'Agg' backend inside plot generation function
- Plots now successfully generate as base64-encoded PNG images
- Distribution plots show:
  - Histogram with KDE overlay
  - Box plot
  - Statistical summary text

#### PyScript Integration Issues Resolved
- Fixed 404 error loading `analysis.py` (moved to `public/` folder)
- Fixed path resolution issue in `index.html` (changed from `/ols-analysis-studio/analysis.py` to `/analysis.py`)
- Added missing `console` import in Python module
- Implemented cache-busting strategy with version parameters

---

## [1.3.0] - 2025-01-06

### 📝 Documentation

#### Created Comprehensive Integration Test
- Created `public/test-integration.html` for direct PyScript testing
- Tests full workflow:
  1. Upload CSV file
  2. Clean data
  3. Calculate descriptive statistics
  4. Generate distribution plots
  5. Run OLS regression
- Includes detailed logging and error handling
- Used to verify PyScript functionality independent of React

---

## [1.2.0] - Earlier

### 🏗️ Initial FastAPI Backend (Deprecated)

#### Backend Implementation (Reference Only)
- Created FastAPI backend with proper statistical analysis
- Implemented endpoints for:
  - File upload and validation
  - Data cleaning with multiple strategies
  - Descriptive statistics calculation
  - Plot generation with matplotlib/seaborn
  - OLS regression with statsmodels diagnostics
- **Note**: This backend is no longer used but kept in `backend/` folder for reference

---

## [1.0.0] - Earlier

### 🎬 Initial Release

#### Core Application Structure
- React + TypeScript frontend
- Three-step workflow:
  1. Upload Step - CSV file upload
  2. Validation Step - Data cleaning decisions
  3. Analysis Step - Statistics, plots, and OLS models
- Tailwind CSS for styling
- Component-based architecture
- Initial placeholder API integration

---

## Technical Debt & Known Issues

### Fixed in This Session ✅
- ✅ Random placeholder images instead of real plots
- ✅ Backend dependency (now 100% client-side)
- ✅ Matplotlib compatibility with PyScript
- ✅ Poor loading screen UX
- ✅ Low contrast on dark backgrounds
- ✅ Small plots hard to read on laptop screens

### Future Improvements 🎯
- [ ] Add PDF export functionality for results
- [ ] Implement data download feature
- [ ] Add more regression diagnostics (VIF, Durbin-Watson, etc.)
- [ ] Support for categorical variable encoding
- [ ] Add scatter plot matrix
- [ ] Implement residual plots
- [ ] Add model comparison tools
- [ ] Support for different file formats (Excel, JSON)

---

## Architecture Evolution

```
v1.0: React Frontend → Placeholder API
v1.2: React Frontend → FastAPI Backend → Python Analysis
v2.0: React Frontend → PyScript (Python in Browser) ✅ CURRENT
```

### Why PyScript?
1. **Privacy**: All data stays in browser, never sent to server
2. **Cost**: No backend hosting costs
3. **Speed**: No network latency for API calls
4. **Deployment**: Can deploy as static site (GitHub Pages, Netlify, etc.)
5. **Capabilities**: Full Python power with pandas, numpy, matplotlib, statsmodels

### Trade-offs
- Initial load: ~50-100MB (Python + libraries downloaded once)
- Startup time: 5-10 seconds to initialize Python runtime
- Performance: Slightly slower than native Python (WebAssembly overhead)

---

## Contributors

- **Claude Code** (AI Assistant) - Architecture design, implementation, debugging
- **User** - Product vision, UX feedback, testing

---

## License

MIT License - See LICENSE file for details
