"""
PUSKESMAS BONTOMANGAPE - Medicine Stock Prediction using Machine Learning

This Python script provides advanced prediction capabilities using:
1. Linear Regression (scikit-learn)
2. Moving Average

Usage:
  python ml_prediction.py --data <json_file> --output <output_file>

Requirements:
  pip install numpy pandas scikit-learn
"""

import json
import sys
import argparse
from typing import List, Dict, Tuple
import numpy as np

try:
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Warning: scikit-learn not installed. Using basic linear regression.")


def basic_linear_regression(x: List[float], y: List[float]) -> Tuple[float, float, float]:
    """Basic linear regression without scikit-learn"""
    n = len(x)
    if n < 2:
        return 0, y[0] if y else 0, 0
    
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)
    
    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
    intercept = (sum_y - slope * sum_x) / n
    
    # Calculate R-squared
    y_mean = sum_y / n
    ss_tot = sum((yi - y_mean) ** 2 for yi in y)
    ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))
    r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 1
    
    return slope, intercept, max(0, r2)


def linear_regression_predict(data: List[Dict], future_periods: int = 8) -> Dict:
    """
    Predict future values using Linear Regression
    
    Args:
        data: List of {period: int, value: float}
        future_periods: Number of periods to predict (default: 8 quarters = 2 years)
    
    Returns:
        Dict with predictions and accuracy
    """
    if len(data) < 2:
        return {
            "predictions": [data[0]["value"] if data else 0] * future_periods,
            "confidence": 0,
            "method": "linear_regression"
        }
    
    x = np.array([d["period"] for d in data]).reshape(-1, 1)
    y = np.array([d["value"] for d in data])
    
    if SKLEARN_AVAILABLE:
        model = LinearRegression()
        model.fit(x, y)
        
        # Predict future values
        future_x = np.array(range(len(data), len(data) + future_periods)).reshape(-1, 1)
        predictions = model.predict(future_x)
        
        # Calculate R-squared
        y_pred = model.predict(x)
        confidence = r2_score(y, y_pred)
    else:
        x_list = [d["period"] for d in data]
        y_list = [d["value"] for d in data]
        slope, intercept, confidence = basic_linear_regression(x_list, y_list)
        
        predictions = [slope * (len(data) + i) + intercept for i in range(future_periods)]
    
    return {
        "predictions": [max(0, int(round(p))) for p in predictions],
        "confidence": float(max(0, confidence)),
        "method": "linear_regression"
    }


def moving_average_predict(data: List[Dict], future_periods: int = 8, window: int = 3) -> Dict:
    """
    Predict future values using Moving Average
    
    Args:
        data: List of {period: int, value: float}
        future_periods: Number of periods to predict
        window: Window size for moving average
    
    Returns:
        Dict with predictions and trend
    """
    values = [d["value"] for d in data]
    
    if len(values) == 0:
        return {
            "predictions": [0] * future_periods,
            "trend": "stable",
            "method": "moving_average"
        }
    
    # Calculate moving average
    ma_values = []
    for i in range(len(values)):
        start_idx = max(0, i - window + 1)
        window_values = values[start_idx:i + 1]
        ma_values.append(sum(window_values) / len(window_values))
    
    # Determine trend
    if len(ma_values) >= 2:
        trend_diff = ma_values[-1] - ma_values[-2]
        avg_value = sum(values) / len(values)
        trend_percent = (trend_diff / avg_value * 100) if avg_value > 0 else 0
        
        if trend_percent > 5:
            trend = "up"
        elif trend_percent < -5:
            trend = "down"
        else:
            trend = "stable"
    else:
        trend = "stable"
        trend_diff = 0
    
    # Generate predictions
    predictions = []
    current_pred = ma_values[-1] if ma_values else values[-1] if values else 0
    growth_rate = trend_diff if len(ma_values) >= 2 else 0
    
    for _ in range(future_periods):
        current_pred = current_pred + growth_rate
        predictions.append(max(0, int(round(current_pred))))
    
    return {
        "predictions": predictions,
        "trend": trend,
        "method": "moving_average"
    }


def aggregate_to_quarterly(monthly_data: List[Dict]) -> List[Dict]:
    """
    Convert monthly data to quarterly
    
    Args:
        monthly_data: List of {month: int, year: int, value: float}
    
    Returns:
        List of {quarter: int, year: int, value: float, period: int}
    """
    quarterly_map = {}
    
    for item in monthly_data:
        quarter = (item["month"] - 1) // 3 + 1
        key = f"{item['year']}-Q{quarter}"
        
        if key not in quarterly_map:
            quarterly_map[key] = {
                "quarter": quarter,
                "year": item["year"],
                "values": []
            }
        quarterly_map[key]["values"].append(item["value"])
    
    # Calculate averages and sort
    quarterly_data = []
    for key, item in quarterly_map.items():
        quarterly_data.append({
            "quarter": item["quarter"],
            "year": item["year"],
            "value": sum(item["values"]) / len(item["values"])
        })
    
    # Sort by year and quarter
    quarterly_data.sort(key=lambda x: (x["year"], x["quarter"]))
    
    # Add period index
    for i, item in enumerate(quarterly_data):
        item["period"] = i
    
    return quarterly_data


def process_medicine_data(medicine_data: Dict) -> Dict:
    """
    Process medicine data and generate predictions
    
    Args:
        medicine_data: {
            name: str,
            histories: [{month: int, year: int, value: float}]
        }
    
    Returns:
        Dict with predictions from both methods
    """
    histories = medicine_data.get("histories", [])
    
    # Convert to quarterly
    quarterly_data = aggregate_to_quarterly(histories)
    
    if len(quarterly_data) < 2:
        return {
            "name": medicine_data.get("name", "Unknown"),
            "error": "Insufficient data for prediction",
            "linear_regression": {"predictions": [], "confidence": 0},
            "moving_average": {"predictions": [], "trend": "stable"}
        }
    
    # Get predictions
    lr_result = linear_regression_predict(quarterly_data, 8)
    ma_result = moving_average_predict(quarterly_data, 8, 3)
    
    # Generate quarter labels
    last_quarter = quarterly_data[-1]
    labels = []
    year = last_quarter["year"]
    quarter = last_quarter["quarter"]
    
    for _ in range(8):
        quarter += 1
        if quarter > 4:
            quarter = 1
            year += 1
        labels.append(f"Q{quarter} {year}")
    
    return {
        "name": medicine_data.get("name", "Unknown"),
        "historical_data": quarterly_data,
        "linear_regression": lr_result,
        "moving_average": ma_result,
        "labels": labels
    }


def main():
    parser = argparse.ArgumentParser(description="Medicine Stock Prediction using ML")
    parser.add_argument("--data", type=str, help="Input JSON file with medicine data")
    parser.add_argument("--output", type=str, help="Output JSON file for predictions")
    parser.add_argument("--demo", action="store_true", help="Run demo with sample data")
    
    args = parser.parse_args()
    
    if args.demo:
        # Demo with sample data
        sample_data = {
            "name": "Paracetamol 500mg",
            "histories": [
                {"month": 1, "year": 2023, "value": 100},
                {"month": 2, "year": 2023, "value": 120},
                {"month": 3, "year": 2023, "value": 110},
                {"month": 4, "year": 2023, "value": 130},
                {"month": 5, "year": 2023, "value": 140},
                {"month": 6, "year": 2023, "value": 135},
                {"month": 7, "year": 2023, "value": 150},
                {"month": 8, "year": 2023, "value": 160},
                {"month": 9, "year": 2023, "value": 155},
                {"month": 10, "year": 2023, "value": 170},
                {"month": 11, "year": 2023, "value": 180},
                {"month": 12, "year": 2023, "value": 175},
            ]
        }
        
        result = process_medicine_data(sample_data)
        print(json.dumps(result, indent=2))
        return
    
    if args.data:
        with open(args.data, 'r') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            results = [process_medicine_data(med) for med in data]
        else:
            results = process_medicine_data(data)
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"Predictions saved to {args.output}")
        else:
            print(json.dumps(results, indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
