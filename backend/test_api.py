import requests
import json

# Test the API with the real dataset
session_token = "session_b2a495cf61ae4027b902dbb7e84a9f2c"

# First, clean the data (even if no cleaning needed)
print("Cleaning data...")
response = requests.post(
    f"http://localhost:8000/clean/{session_token}",
    json={"decisions": {}}
)

if response.status_code == 200:
    print("[OK] Data cleaned successfully!")
else:
    print(f"[ERROR] Clean failed: {response.status_code}")
    print(response.text)
    exit(1)

# Test generating plots
print("Testing plot generation...")
response = requests.post(
    f"http://localhost:8000/plots/{session_token}",
    json={"variables": ["income", "experience_year", "age"]}
)

if response.status_code == 200:
    data = response.json()
    print(f"[OK] Plots generated successfully!")
    print(f"  Number of plots: {len(data['plot_urls'])}")
    print(f"  First plot data size: {len(data['plot_urls'][0])} characters")
else:
    print(f"[ERROR] Status: {response.status_code}")
    print(response.text)

# Test descriptive stats
print("\nTesting descriptive statistics...")
response = requests.post(
    f"http://localhost:8000/stats/{session_token}",
    json={
        "dependent_var": "income",
        "independent_vars": ["experience_year", "work_hours", "age"]
    }
)

if response.status_code == 200:
    stats = response.json()
    print("[OK] Stats generated successfully!")
    for var, data in stats.items():
        print(f"  {var}:")
        print(f"    Mean: {data['mean']:.2f}")
        print(f"    Std Dev: {data['std_dev']:.2f}")
else:
    print(f"[ERROR] Status: {response.status_code}")
    print(response.text)

# Test OLS analysis
print("\nTesting OLS regression...")
response = requests.post(
    f"http://localhost:8000/ols/{session_token}",
    json={
        "dependent_var": "income",
        "independent_vars": ["experience_year", "work_hours", "age"],
        "model_name": "Income Model"
    }
)

if response.status_code == 200:
    ols_result = response.json()
    print("[OK] OLS analysis completed successfully!")
    print(f"  Model: {ols_result['model_name']}")
    print(f"  R-squared: {ols_result['r_squared']:.4f}")
    print(f"  Adj R-squared: {ols_result['adj_r_squared']:.4f}")
    print("  Coefficients:")
    for var, coef in ols_result['coefficients'].items():
        significance = "***" if coef['p_value'] < 0.001 else "**" if coef['p_value'] < 0.01 else "*" if coef['p_value'] < 0.05 else ""
        print(f"    {var}: {coef['coefficient']:.4f} (p={coef['p_value']:.4f}) {significance}")

    if ols_result['warnings']:
        print("  Warnings:")
        for warning in ols_result['warnings']:
            print(f"    - {warning}")
else:
    print(f"[ERROR] Status: {response.status_code}")
    print(response.text)

print("\n[OK] All tests completed!")
