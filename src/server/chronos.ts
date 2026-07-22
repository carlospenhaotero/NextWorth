import "server-only";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";
const TIMEOUT_MS = 30000;

interface PredictionResult {
  symbol: string;
  horizon: string;
  predictions: Array<{
    date: string;
    predicted_close: number;
    confidence_low?: number;
    confidence_high?: number;
  }>;
  model_version: string;
  inference_time_ms: number;
  input_data_points: number;
}

export async function getPrediction(
  symbol: string,
  history: Array<{ date: string; close: number }>,
  horizon: string
): Promise<PredictionResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${ML_SERVICE_URL}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, history, horizon, currency: "USD" }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    return (await response.json()) as PredictionResult;
  } catch {
    return null;
  }
}

/**
 * Proactively checks whether the ML service is ready.
 * Returns true when `/health` responds ok. Use it to degrade the UI gracefully
 * (e.g. hide/disable predictions) instead of waiting for a failed prediction.
 * Uses a short 5s timeout; does not affect the 30s prediction timeout.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
