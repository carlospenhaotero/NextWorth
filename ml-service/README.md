# ML Service - Amazon Chronos Time-Series Predictions

Machine learning microservice for generating asset price predictions using Amazon's Chronos T5-small model.

## Overview

This service provides time-series forecasting capabilities for financial assets using the pre-trained Chronos model from Amazon. It exposes a REST API for generating predictions based on historical price data.

## Prerequisites

- Python 3.9 or higher
- 4GB+ RAM (recommended: 8GB)
- pip package manager

## Installation

1. Navigate to the ml-service directory:
```bash
cd ml-service
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env if needed (default values should work)
```

## Running the Service

### Development Mode

Start the Flask development server:
```bash
python app.py
```

The service will be available at `http://localhost:5000`

### Production Mode

Use Gunicorn for production deployment:
```bash
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

**Note**: Using 2 workers is recommended for the Chronos model to avoid memory issues.

## API Endpoints

### Health Check

Check if the service is running:

```bash
GET /health

Response:
{
  "status": "ok",
  "model": "chronos-t5-small",
  "version": "1.0.0"
}
```

### Generate Predictions

Generate price predictions for an asset:

```bash
POST /api/predict
Content-Type: application/json

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

Response:
{
  "symbol": "AAPL",
  "horizon": "6m",
  "predictions": [
    {"date": "2024-07-01", "predicted_close": 145.30},
    {"date": "2024-08-01", "predicted_close": 148.50},
    ...
  ],
  "model_version": "chronos-t5-small",
  "inference_time_ms": 3500,
  "input_data_points": 24
}
```

**Parameters:**
- `symbol` (string, required): Asset symbol
- `history` (array, required): Historical price data with date and close price
- `horizon` (string, required): Prediction horizon - one of: `3m`, `6m`, `1y`, `2y`, `5y`
- `currency` (string, optional): Currency code (default: USD)

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `500 Internal Server Error`: Model inference error

## Performance

- **Cold start**: ~30 seconds (model loading on first request)
- **Inference time**: 3-5 seconds per prediction (CPU)
- **Memory usage**: ~1.5GB RAM
- **Concurrent requests**: 3 recommended maximum

## Troubleshooting

### Out of Memory Errors

If you encounter memory errors:
1. Ensure at least 4GB RAM is available
2. Reduce the number of Gunicorn workers to 1
3. Close other memory-intensive applications
4. Consider using the smaller `chronos-t5-tiny` model

### Slow Predictions

To improve inference speed:
1. **Use GPU acceleration** (if available):
   - Install PyTorch with CUDA support
   - The model will automatically detect and use GPU
2. **Reduce prediction horizon**: Shorter horizons are faster
3. **Use smaller model**: Switch to `chronos-t5-tiny` in `.env`

### Connection Refused

If the backend cannot connect:
1. Verify the service is running: `curl http://localhost:5000/health`
2. Check firewall settings allow connections on port 5000
3. Ensure `ML_SERVICE_URL` in backend `.env` points to correct address

## Model Information

- **Model**: amazon/chronos-t5-small
- **Parameters**: 46 million
- **Architecture**: T5-based encoder-decoder
- **Training**: Pre-trained on diverse time-series datasets
- **License**: Apache 2.0

## Development

### Project Structure

```
ml-service/
├── app.py                    # Flask application entry point
├── models/
│   └── chronos_model.py      # Chronos model wrapper
├── routes/
│   └── prediction.py         # API route handlers
├── utils/
│   └── data_processor.py     # Data preprocessing utilities
├── requirements.txt          # Python dependencies
├── .env.example             # Environment configuration template
└── README.md                # This file
```

### Adding New Features

1. Create new route handlers in `routes/`
2. Add utility functions in `utils/`
3. Update API documentation in this README
4. Add tests for new functionality

## License

This service is part of the NextWorth portfolio management platform.
