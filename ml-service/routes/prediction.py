"""
Prediction API routes
"""

import time
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

prediction_bp = Blueprint('prediction', __name__)


@prediction_bp.route('/predict', methods=['POST'])
def predict():
    """
    Generate price predictions for an asset

    Request JSON:
        {
            "symbol": "AAPL",
            "history": [
                {"date": "2023-01-01", "close": 130.50},
                {"date": "2023-02-01", "close": 135.20},
                ...
            ],
            "horizon": "6m",
            "currency": "USD"
        }

    Returns:
        JSON response with predictions or error message
    """
    try:
        # Parse request data
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        required_fields = ['symbol', 'history', 'horizon']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                'error': f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        symbol = data['symbol']
        history = data['history']
        horizon_str = data['horizon']
        currency = data.get('currency', 'USD')

        logger.info(f"Prediction request for {symbol}, horizon: {horizon_str}")

        # Get model instance (lazy loaded)
        from app import get_model
        model = get_model()

        # Validate input data
        is_valid, error_msg = model.validate_input(history)
        if not is_valid:
            logger.warning(f"Invalid input: {error_msg}")
            return jsonify({'error': error_msg}), 400

        # Parse horizon
        try:
            horizon_months = model.parse_horizon(horizon_str)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Extract prices from history
        from utils.data_processor import extract_prices
        prices, dates = extract_prices(history)

        # Validate dates if provided
        if any(dates):
            from utils.data_processor import validate_date_sequence
            if not validate_date_sequence(dates):
                logger.warning("Dates are not in chronological order")

        # Generate predictions
        start_time = time.time()

        try:
            predicted_prices = model.predict(
                historical_prices=prices,
                horizon_months=horizon_months,
                num_samples=10
            )
        except Exception as e:
            logger.error(f"Model prediction failed: {e}")
            return jsonify({'error': 'Prediction generation failed'}), 500

        inference_time_ms = int((time.time() - start_time) * 1000)

        # Generate future dates
        last_date_str = history[-1].get('date')
        if last_date_str:
            try:
                last_date = datetime.fromisoformat(last_date_str.split('T')[0])
            except:
                last_date = datetime.now()
        else:
            last_date = datetime.now()

        future_dates = model.generate_future_dates(last_date, horizon_months)

        # Format predictions
        predictions = [
            {
                'date': date,
                'predicted_close': round(price, 2)
            }
            for date, price in zip(future_dates, predicted_prices)
        ]

        # Build response
        response = {
            'symbol': symbol,
            'horizon': horizon_str,
            'predictions': predictions,
            'model_version': model.model_name,
            'inference_time_ms': inference_time_ms,
            'input_data_points': len(history),
            'currency': currency
        }

        logger.info(f"Successfully generated {len(predictions)} predictions in {inference_time_ms}ms")

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Unexpected error in prediction endpoint: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500
