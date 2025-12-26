// src/services/chronosService.js
// HTTP client for ML prediction service

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
const TIMEOUT_MS = 30000; // 30 seconds timeout

/**
 * Call ML service to generate price predictions
 *
 * @param {string} symbol - Asset symbol
 * @param {Array} history - Historical price data [{date, close}, ...]
 * @param {string} horizon - Prediction horizon ('3m', '6m', '1y', '2y', '5y')
 * @returns {Promise<Object|null>} Prediction result or null on failure
 */
export async function getPrediction(symbol, history, horizon) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${ML_SERVICE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        history,
        horizon,
        currency: 'USD'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ML service error (${response.status}):`, errorText);
      return null;
    }

    const result = await response.json();
    return result;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Chronos service timeout after 30s');
    } else {
      console.error('Chronos service error:', error.message);
    }
    return null; // Graceful fallback
  }
}

/**
 * Check if ML service is available
 *
 * @returns {Promise<boolean>} True if service is healthy
 */
export async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s health check timeout

    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return response.ok;

  } catch (error) {
    console.error('ML service health check failed:', error.message);
    return false;
  }
}
