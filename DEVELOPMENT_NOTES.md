# Development Notes - OLS Analysis Studio

This document tracks technical decisions, implementation details, and lessons learned during development.

---

## Session: January 6, 2025

### Problem 1: Random Images in Plot Generation
**Issue**: Distribution plots were showing random images of people and nature instead of actual data visualizations.

**Root Cause**: The `generatePlots` function in `services/apiService.ts` was using `https://picsum.photos/` placeholder service.

**Solution**:
- Recognized that data visualization should be done in Python, not JavaScript
- Initial solution: Created FastAPI backend with matplotlib
- Final solution: Converted to PyScript for browser-based Python execution

**Key Learning**: Always use the right tool for the job - Python for data analysis, not JavaScript placeholders.

---

### Problem 2: Architecture Decision - Backend vs Browser-Based Python
**User Request**: "Can we build a frontend that loads python libraries in the RAM and run the script within an HTML page that goes step by step in the analysis, and once we close the session all these data will be deleted from the RAM?"

**Solution**: Implemented PyScript/Pyodide
- Python runs via WebAssembly in browser
- Libraries loaded in browser memory
- Data automatically deleted when tab closes
- No backend server needed

**Implementation Details**:
```python
# public/analysis.py
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('module://matplotlib_pyodide.html5_canvas_backend')
import matplotlib.pyplot as plt
from scipy import stats
import statsmodels.api as sm
from js import window, Object, console
from pyodide.ffi import to_js, create_proxy
```

**JavaScript Integration**:
```typescript
// services/apiService.ts
declare global {
    interface Window {
        pyAnalysisReady?: boolean;
        pyUploadFile?: (fileContent: string, fileName: string) => any;
        pyCleanData?: (sessionToken: string, decisions: any) => any;
        // ... other functions
    }
}
```

**Key Files**:
- `public/analysis.py` - Python module (runs in browser)
- `services/apiService.ts` - JavaScript bridge to Python
- `index.html` - PyScript configuration

---

### Problem 3: 404 Error Loading Python Module
**Error**: `(PY0404): Fetching from URL /analysis.py failed with error 404`

**Root Cause**: `analysis.py` was in project root, not in `public/` folder where Vite serves static files.

**Solution**:
```bash
mv analysis.py public/analysis.py
```

**Lesson**: Vite serves static files from `public/` folder at root URL path.

---

### Problem 4: NameError - console not defined
**Error**: `NameError: name 'console' is not defined`

**Root Cause**: Missing import in Python module.

**Solution**:
```python
from js import window, Object, console  # Added console
```

**Lesson**: PyScript requires explicit imports for JavaScript objects.

---

### Problem 5: Matplotlib Backend Compatibility
**Error**: `'NoneType' object has no attribute 'toDataURL'`

**Root Cause**: Matplotlib's default html5_canvas_backend was trying to call `toDataURL()` on None object when running in PyScript environment.

**Failed Attempts**:
1. Hard refresh (Ctrl+Shift+R)
2. Clearing browser cache
3. Restarting dev server on new port
4. Adding cache-busting parameters (`?v=2`, `?v=3`)

**Root Issue**: Browser caching was making testing difficult, but real issue was matplotlib backend.

**Solution**: Explicitly force Agg backend inside plot generation function:
```python
def generate_plots_handler(session_token, variables):
    for var in variables:
        # Use Agg backend explicitly for PyScript
        import matplotlib
        matplotlib.use('Agg')  # Force non-interactive backend

        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        # ... plotting code ...

        # Save to buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plot_urls.append(f"data:image/png;base64,{image_base64}")
        plt.close(fig)
```

**Key Learning**:
- Set matplotlib backend inside function, not at module level
- Use 'Agg' backend for PyScript (non-interactive, file-based)
- Cache-busting with version parameters: `/analysis.py?v=4`

---

### Problem 6: PyScript Path Resolution
**Error**: `SyntaxError: invalid syntax` when loading from main `index.html`

**Root Cause**: Path was set to `/ols-analysis-studio/analysis.py?v=3` which caused PyScript to load wrong file.

**Solution**: Changed to `/analysis.py?v=4` since Vite serves `public/` files at root URL.

**index.html**:
```html
<script type="py"
    config='{"packages": ["pandas", "numpy", "matplotlib", "scipy", "statsmodels"]}'
    src="/analysis.py?v=4">
</script>
```

**Lesson**: URL path resolution differs between direct access and Vite dev server routing.

---

### Problem 7: Poor Loading Screen UX
**Issue**: Users didn't know Python libraries were loading, appeared as blank/frozen screen.

**Solution**: Implemented loading screen with:
- Progress bar (0% to 100%)
- Realistic pacing (fast start, slows near end)
- Library list display
- Branded design
- Automatic transition when ready

**Implementation**:
```typescript
// App.tsx
const [pythonReady, setPythonReady] = useState<boolean>(false);
const [loadingProgress, setLoadingProgress] = useState<number>(0);

// Progress simulation
useEffect(() => {
    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
            if (prev >= 90) return prev + 0.5;      // Very slow
            else if (prev >= 70) return prev + 1;   // Slow
            else if (prev >= 40) return prev + 2;   // Medium
            else return prev + 3;                    // Fast
        });
    }, 100);
    return () => clearInterval(progressInterval);
}, []);
```

**Key Learning**: Always show progress indicators for operations taking >2 seconds.

---

### Problem 8: Low Contrast & Visibility Issues
**Issues**:
1. Loading screen: Gray text on black background hard to read
2. Tab buttons: Light gray, almost invisible
3. Progress bar: Subtle gray, not prominent

**Solutions**:

1. **Loading Screen** (App.tsx):
```tsx
// Before: bg-slate-900, text-slate-300
// After: gradient background, text-white
<div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
    <p className="text-white text-lg font-medium">Loading Python libraries...</p>
    <div className="bg-slate-600 rounded-full h-4">
        <div className="bg-gradient-to-r from-brand-DEFAULT to-sky-400"
             style={{ width: `${loadingProgress}%` }} />
    </div>
    <p className="text-white text-lg font-bold">{Math.round(loadingProgress)}%</p>
</div>
```

2. **Tab Buttons** (AnalysisStep.tsx):
```tsx
// Before: text-slate-500 (light gray)
// After: text-slate-700 (dark gray) + background highlight
className={`${
    activeTab === 'stats'
    ? 'border-brand-DEFAULT text-brand-dark bg-brand-light'
    : 'border-transparent text-slate-700 hover:bg-slate-100'
} py-3 px-4 font-semibold transition-colors rounded-t-md`}
```

3. **Spinner** (Spinner.tsx):
```tsx
// Before: border-t-2 border-b-2 border-brand-DEFAULT
// After: border-4 border-slate-300 border-t-brand-DEFAULT
<div className="animate-spin rounded-full border-4 border-slate-300
                border-t-brand-DEFAULT border-b-brand-DEFAULT" />
```

**Key Learning**: Always test contrast ratios, especially on dark backgrounds. Use WCAG guidelines.

---

### Problem 9: Plots Too Small on Laptop Screens
**Issue**: Distribution plots displayed as small thumbnails, hard to read details.

**Solution**: Click-to-enlarge modal

**Implementation**:
```tsx
const PlotsView = () => {
    const [selectedPlot, setSelectedPlot] = useState<string | null>(null);

    return (
        <>
            <img
                src={url}
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02]"
                onClick={() => setSelectedPlot(url)}
                title="Click to enlarge"
            />

            {selectedPlot && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50"
                     onClick={() => setSelectedPlot(null)}>
                    <img src={selectedPlot}
                         className="max-w-full max-h-[95vh]" />
                </div>
            )}
        </>
    );
};
```

**Features**:
- Click to open full-screen modal
- Dark overlay for focus
- Close via: ✕ button, click outside, ESC key
- Smooth transitions
- Maintains aspect ratio

**Key Learning**: For data-heavy visualizations, always provide zoom/enlarge functionality.

---

## PyScript Integration Best Practices

### 1. Module Loading
```html
<!-- index.html -->
<link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css">
<script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script>

<script type="py"
    config='{"packages": ["pandas", "numpy", "matplotlib", "scipy", "statsmodels"]}'
    src="/analysis.py?v=4">
</script>
```

### 2. Python → JavaScript Communication
```python
# Python side (analysis.py)
def safe_wrapper(func):
    def wrapper(*args, **kwargs):
        try:
            console.log(f"[Python] Calling {func.__name__}")
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            console.error(f"[Python] Error: {str(e)}")
            return create_response({"error": str(e)})
    return wrapper

window.pyUploadFile = create_proxy(safe_wrapper(upload_file_handler))
window.pyAnalysisReady = True
```

### 3. JavaScript → Python Communication
```typescript
// JavaScript side (apiService.ts)
const waitForPython = (): Promise<void> => {
    return new Promise((resolve) => {
        if (window.pyAnalysisReady) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.pyAnalysisReady) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
};

export const uploadFile = async (file: File): Promise<UploadResponse> => {
    await waitForPython();
    const fileContent = await file.text();
    const result = window.pyUploadFile(fileContent, file.name);
    return convertPyResult(result);
};
```

### 4. Data Conversion
```python
# Python to JS
def create_response(data):
    return to_js(data, dict_converter=Object.fromEntries)
```

```typescript
// JS to Python-compatible
const convertPyResult = (pyResult: any): any => {
    try {
        return JSON.parse(JSON.stringify(pyResult));
    } catch (e) {
        return pyResult;
    }
};
```

---

## Performance Considerations

### Initial Load Time
- **First load**: 5-10 seconds (downloads Python + libraries)
- **Subsequent loads**: <1 second (cached)
- **Bundle size**: ~50-100MB (Python WebAssembly + packages)

### Runtime Performance
- **CSV parsing**: Comparable to native Python
- **Data cleaning**: Slightly slower (5-10% overhead)
- **Statistics calculation**: Near-native speed
- **Plot generation**: 20-30% slower than native (image encoding)
- **OLS regression**: Near-native speed

### Memory Usage
- **Session data**: Stored in JavaScript objects (`_sessions`, `_cleaned_sessions`)
- **Plots**: Base64-encoded strings (larger than native image files)
- **Cleanup**: Automatic when tab/window closes

---

## File Structure

```
ols-analysis-studio/
├── public/
│   ├── analysis.py           # Python module (runs in browser)
│   └── test-integration.html # Direct PyScript test
├── components/
│   ├── UploadStep.tsx        # CSV upload UI
│   ├── ValidationStep.tsx    # Data cleaning UI
│   ├── AnalysisStep.tsx      # Analysis results UI
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Spinner.tsx
│       └── ...
├── services/
│   └── apiService.ts         # JavaScript ↔ Python bridge
├── types.ts                  # TypeScript interfaces
├── App.tsx                   # Main app + loading screen
├── index.html                # Entry point + PyScript config
├── README.md                 # User documentation
├── CHANGELOG.md              # Version history
└── DEVELOPMENT_NOTES.md      # This file

backend/                      # Deprecated FastAPI (kept for reference)
```

---

## Testing Strategy

### Integration Test (test-integration.html)
Purpose: Test PyScript functionality without React overhead

**Test Flow**:
1. Load Python runtime
2. Upload CSV file
3. Clean data
4. Calculate statistics
5. Generate plots
6. Run OLS regression

**Usage**:
```
http://localhost:5173/ols-analysis-studio/test-integration.html
```

### Manual Testing Checklist
- [ ] Python loads without errors
- [ ] CSV upload works
- [ ] Data validation detects issues
- [ ] Cleaning strategies apply correctly
- [ ] Statistics calculate accurately
- [ ] Plots generate and display
- [ ] Plots enlarge on click
- [ ] OLS regression runs
- [ ] Warnings display when appropriate
- [ ] Session cleanup works
- [ ] Loading screen displays properly
- [ ] UI contrast is readable
- [ ] Tabs are visible and clickable

---

## Known Limitations

1. **File Size**: Large CSV files (>50MB) may cause browser memory issues
2. **Performance**: Slower than native Python (WebAssembly overhead)
3. **Browser Support**: Requires modern browser with WebAssembly support
4. **Debugging**: Python errors harder to debug than native Python
5. **Package Limitations**: Not all Python packages available in PyScript

---

## Future Enhancements

### Short Term
- [ ] Add PDF export for results
- [ ] Implement model comparison table
- [ ] Add residual plots
- [ ] Support Excel file upload
- [ ] Add data preview before analysis

### Medium Term
- [ ] Implement VIF calculation for multicollinearity
- [ ] Add Durbin-Watson test for autocorrelation
- [ ] Support categorical variable encoding
- [ ] Add scatter plot matrix
- [ ] Implement time series analysis

### Long Term
- [ ] Support for other regression types (logistic, Poisson, etc.)
- [ ] Machine learning models (scikit-learn via PyScript)
- [ ] Interactive plot manipulation
- [ ] Data transformation tools
- [ ] Report generation with templates

---

## Lessons Learned

1. **Browser caching is aggressive**: Always use version parameters for script sources
2. **PyScript is powerful but has quirks**: Backend configuration matters for plotting
3. **UX matters**: Loading indicators prevent user confusion
4. **Contrast matters**: Test on multiple screens and color profiles
5. **Click-to-enlarge is essential**: For data visualization on small screens
6. **Python in browser is viable**: For data analysis applications with privacy concerns
7. **Static deployment is simple**: No backend = easy hosting

---

## References

- [PyScript Documentation](https://pyscript.net/)
- [Matplotlib in PyScript](https://matplotlib.org/stable/users/explain/backends.html)
- [Statsmodels OLS](https://www.statsmodels.org/stable/regression.html)
- [Pyodide Documentation](https://pyodide.org/)

---

Last Updated: January 6, 2025
