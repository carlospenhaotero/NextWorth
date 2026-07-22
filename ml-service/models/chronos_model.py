"""
Chronos Model Wrapper
Handles loading and inference with Amazon Chronos T5 model
"""

import torch
import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)


class ChronosModel:
    """
    Wrapper for Amazon Chronos time-series forecasting model
    """

    def __init__(self, model_name="amazon/chronos-t5-small"):
        """
        Initialize the Chronos model

        Args:
            model_name (str): Hugging Face model identifier
        """
        self.model_name = model_name
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        logger.info(f"Initializing Chronos model: {model_name}")
        logger.info(f"Using device: {self.device}")

        try:
            from chronos import ChronosPipeline

            # Load the model pipeline
            self.pipeline = ChronosPipeline.from_pretrained(
                model_name,
                device_map=self.device,
                torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
            )

            logger.info(f"Model loaded successfully on {self.device}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def predict(self, historical_prices, horizon_months, num_samples=30):
        """
        Generate price predictions for the specified horizon.

        Chronos samples several possible trajectories; we keep the median as the
        central estimate and the p10/p90 quantiles as an 80% confidence band that
        widens with the horizon. 30 samples keeps the deciles stable (10 is noisy)
        at negligible CPU cost for chronos-t5-small over short horizons.

        Args:
            historical_prices (list): List of historical close prices [p1, p2, ..., pn]
            horizon_months (int): Number of months to predict
            num_samples (int): Number of sample trajectories to generate

        Returns:
            dict: {"median": [...], "low": [...], "high": [...]} — one value per
            month in the horizon.
        """
        try:
            logger.info(f"Generating predictions for {horizon_months} months")
            logger.info(f"Input data points: {len(historical_prices)}")

            # Convert to tensor
            context = torch.tensor(historical_prices, dtype=torch.float32)

            # Generate predictions (chronos-forecasting 1.5.x: context is positional)
            forecast = self.pipeline.predict(
                context,
                prediction_length=horizon_months,
                num_samples=num_samples,
            )

            # forecast shape: (batch_size, num_samples, prediction_length).
            # Cast to float32 first: torch.quantile does not support bfloat16
            # (the GPU dtype). Aggregate over the samples dim (1): median as the
            # central estimate, p10/p90 as the confidence band.
            forecast = forecast.float().cpu()
            median = torch.median(forecast, dim=1).values[0].numpy()
            low = torch.quantile(forecast, 0.1, dim=1)[0].numpy()
            high = torch.quantile(forecast, 0.9, dim=1)[0].numpy()

            # Ensure no negative prices
            median = np.maximum(median, 0.01)
            low = np.maximum(low, 0.01)
            high = np.maximum(high, 0.01)

            logger.info(f"Generated {len(median)} predictions with confidence band")

            return {
                "median": median.tolist(),
                "low": low.tolist(),
                "high": high.tolist(),
            }

        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise

    def validate_input(self, history):
        """
        Validate historical data input

        Args:
            history (list): List of price dictionaries

        Returns:
            tuple: (is_valid, error_message)
        """
        if not history or len(history) == 0:
            return False, "History cannot be empty"

        if len(history) < 3:
            return False, "At least 3 historical data points required"

        for i, point in enumerate(history):
            if 'close' not in point:
                return False, f"Missing 'close' price at index {i}"

            if not isinstance(point['close'], (int, float)):
                return False, f"Invalid price type at index {i}"

            if point['close'] <= 0:
                return False, f"Price must be positive at index {i}"

        return True, None

    @staticmethod
    def parse_horizon(horizon_str):
        """
        Parse horizon string to number of months

        Args:
            horizon_str (str): Horizon string ('3m', '6m', '1y', '2y', '5y')

        Returns:
            int: Number of months
        """
        horizon_map = {
            '3m': 3,
            '6m': 6,
            '1y': 12,
            '2y': 24,
            '5y': 60
        }

        if horizon_str not in horizon_map:
            raise ValueError(f"Invalid horizon: {horizon_str}")

        return horizon_map[horizon_str]

    @staticmethod
    def generate_future_dates(start_date, num_months):
        """
        Generate future monthly dates

        Args:
            start_date (datetime): Starting date
            num_months (int): Number of months to generate

        Returns:
            list: List of date strings in YYYY-MM-DD format
        """
        dates = []
        current_date = start_date

        for i in range(1, num_months + 1):
            future_date = current_date + relativedelta(months=i)
            dates.append(future_date.strftime('%Y-%m-%d'))

        return dates
