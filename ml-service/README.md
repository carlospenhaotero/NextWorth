# ML Service - Amazon Chronos Time-Series Predictions

Machine learning microservice for generating asset price predictions using Amazon's Chronos T5-small model.

## Overview

This service provides time-series forecasting capabilities for financial assets using the pre-trained Chronos model from Amazon. It exposes a REST API for generating predictions based on historical price data.

It runs as a Flask app served by Gunicorn inside a Docker container (Python 3.11, CPU-only PyTorch). Model weights are baked into the image at build time (see below), so there is no cold download on the first request.

## Running the Service (Docker)

The service is orchestrated from the repo root `docker-compose.yml`. From the project root:

```bash
# Build the image (installs deps and pre-downloads the Chronos weights)
docker compose build ml-service

# Start the service in the background
docker compose up -d ml-service
```

The service is exposed on `http://localhost:5001` (mapped to container port `5000`).

Check it is healthy:

```bash
curl http://localhost:5001/health
```

### Configuration

- `PORT` (default `5000`) — port Gunicorn binds to inside the container.
- `MODEL_NAME` (default `amazon/chronos-t5-small`) — Hugging Face model id. This is passed both as a build ARG (to bake the weights) and as a runtime env var. If you change it, rebuild the image so the new weights are baked in.
- `FLASK_ENV` — set to `production` in the compose file.

### Model weights are baked at build time

The Dockerfile pre-downloads the model during the build:

```dockerfile
RUN python -c "from chronos import ChronosPipeline; ChronosPipeline.from_pretrained('${MODEL_NAME}')"
```

Weights are stored under `HF_HOME=/app/.cache/huggingface` and shipped inside the image. This avoids the ~30s cold download that would otherwise exceed the backend client's 30s prediction timeout.

## API Endpoints

### Health Check

Check if the service is running:

```bash
GET /health

Response:
{
  "status": "ok",
  "model": "amazon/chronos-t5-small",
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

- **Cold start**: model weights are baked into the image, so there is no download on first request. The first inference still pays a one-time model load into memory (a few seconds).
- **Inference time**: 3-5 seconds per prediction (CPU)
- **Memory usage**: ~1.5GB RAM
- **Workers**: Gunicorn runs with 1 worker to keep memory usage low.

## Troubleshooting

### Out of Memory Errors

If you encounter memory errors:
1. Ensure at least 4GB RAM is available to Docker.
2. Keep Gunicorn at 1 worker (default).
3. Consider using the smaller `chronos-t5-tiny` model via `MODEL_NAME` (rebuild the image afterwards).

### Connection Refused

If the backend cannot connect:
1. Verify the service is running: `curl http://localhost:5001/health`
2. Ensure `ML_SERVICE_URL` in the backend `.env` points to the correct address.

## Model Information

- **Package**: `chronos-forecasting==1.5.3` (classic `ChronosPipeline` API)
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
│   └── chronos_model.py      # Chronos model wrapper (uses ChronosPipeline)
├── routes/
│   └── prediction.py         # API route handlers
├── utils/
│   └── data_processor.py     # Data preprocessing utilities
├── requirements.txt          # Python dependencies (pinned)
├── Dockerfile                # CPU-only image, bakes model weights at build
├── .dockerignore             # Excludes dev cruft from the image
├── .env.example              # Environment configuration template
└── README.md                # This file
```

### Adding New Features

1. Create new route handlers in `routes/`
2. Add utility functions in `utils/`
3. Update API documentation in this README
4. Add tests for new functionality

## License

This service is part of the NextWorth portfolio management platform.
