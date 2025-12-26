"""
Manual test script for ML service
Tests the prediction endpoint with sample data
"""

import requests
import json
from datetime import datetime, timedelta

# ML Service URL
BASE_URL = "http://localhost:5000"


def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def generate_sample_history(symbol, months=24):
    """Generate sample historical data for testing"""
    base_prices = {
        'AAPL': 150.0,
        'BTC-USD': 40000.0,
        'SPY': 400.0
    }

    base_price = base_prices.get(symbol, 100.0)
    history = []

    for i in range(months):
        date = (datetime.now() - timedelta(days=30 * (months - i))).strftime('%Y-%m-%d')
        # Simple trend with noise
        price = base_price * (1 + 0.02 * i + 0.1 * (i % 3 - 1))
        history.append({
            'date': date,
            'close': round(price, 2)
        })

    return history


def test_prediction(symbol, horizon='6m'):
    """Test prediction endpoint"""
    print(f"\n=== Testing Prediction for {symbol} (horizon: {horizon}) ===")

    history = generate_sample_history(symbol)
    print(f"Generated {len(history)} historical data points")
    print(f"Price range: {history[0]['close']} -> {history[-1]['close']}")

    payload = {
        'symbol': symbol,
        'history': history,
        'horizon': horizon,
        'currency': 'USD'
    }

    try:
        response = requests.post(
            f"{BASE_URL}/api/predict",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=60  # Allow 60s for inference
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"Model: {result['model_version']}")
            print(f"Inference time: {result['inference_time_ms']}ms")
            print(f"Predictions generated: {len(result['predictions'])}")

            # Show first 3 predictions
            print("\nFirst 3 predictions:")
            for pred in result['predictions'][:3]:
                print(f"  {pred['date']}: ${pred['predicted_close']}")

            return True
        else:
            print(f"Error response: {response.text}")
            return False

    except requests.Timeout:
        print("Request timed out (inference took >60s)")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_error_handling():
    """Test error handling with invalid inputs"""
    print("\n=== Testing Error Handling ===")

    # Test 1: Missing required fields
    print("\n1. Missing required fields:")
    response = requests.post(f"{BASE_URL}/api/predict", json={})
    print(f"   Status: {response.status_code} (expected: 400)")

    # Test 2: Invalid horizon
    print("\n2. Invalid horizon:")
    response = requests.post(
        f"{BASE_URL}/api/predict",
        json={
            'symbol': 'AAPL',
            'history': generate_sample_history('AAPL', 12),
            'horizon': 'invalid'
        }
    )
    print(f"   Status: {response.status_code} (expected: 400)")

    # Test 3: Empty history
    print("\n3. Empty history:")
    response = requests.post(
        f"{BASE_URL}/api/predict",
        json={
            'symbol': 'AAPL',
            'history': [],
            'horizon': '6m'
        }
    )
    print(f"   Status: {response.status_code} (expected: 400)")

    # Test 4: Insufficient data points
    print("\n4. Insufficient data points:")
    response = requests.post(
        f"{BASE_URL}/api/predict",
        json={
            'symbol': 'AAPL',
            'history': [{'date': '2024-01-01', 'close': 150}],
            'horizon': '6m'
        }
    )
    print(f"   Status: {response.status_code} (expected: 400)")


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("ML SERVICE MANUAL TESTS")
    print("=" * 60)

    # Check if service is running
    if not test_health():
        print("\n❌ ML Service is not running!")
        print("Start the service with: python app.py")
        return

    print("\n✅ ML Service is running")

    # Test predictions for different assets
    test_prediction('AAPL', '6m')
    test_prediction('BTC-USD', '1y')
    test_prediction('SPY', '3m')

    # Test different horizons
    print("\n=== Testing Different Horizons ===")
    for horizon in ['3m', '6m', '1y', '2y', '5y']:
        print(f"\nHorizon: {horizon}")
        success = test_prediction('AAPL', horizon)
        print("✅ Success" if success else "❌ Failed")

    # Test error handling
    test_error_handling()

    print("\n" + "=" * 60)
    print("TESTS COMPLETED")
    print("=" * 60)


if __name__ == '__main__':
    run_all_tests()
