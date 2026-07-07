FROM python:3.11-slim

WORKDIR /app

# Model to pre-download at build time (must match runtime MODEL_NAME)
ARG MODEL_NAME=amazon/chronos-t5-small

# HuggingFace cache in a predictable location; weights are baked into the image
ENV HF_HOME=/app/.cache/huggingface

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install PyTorch CPU-only first (avoids ~3GB of CUDA libraries). Pinned for reproducibility.
RUN pip install --no-cache-dir torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download model weights at build time so the first request does not cold-download
# and blow the client's 30s timeout. Done BEFORE copying app code so code changes do
# not invalidate this (expensive) layer. Weights land in HF_HOME (baked into the image).
RUN python -c "from chronos import ChronosPipeline; ChronosPipeline.from_pretrained('${MODEL_NAME}')"

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "120", "app:app"]
