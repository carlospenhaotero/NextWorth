"""
Data preprocessing utilities for time-series data
"""

import numpy as np
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def extract_prices(history):
    """
    Extract close prices from history data

    Args:
        history (list): List of dictionaries with 'date' and 'close' keys

    Returns:
        tuple: (prices, dates) - lists of prices and corresponding dates
    """
    prices = []
    dates = []

    for point in history:
        prices.append(float(point['close']))
        dates.append(point.get('date', None))

    return prices, dates


def normalize_prices(prices):
    """
    Normalize prices using min-max scaling

    Args:
        prices (list): List of prices

    Returns:
        tuple: (normalized_prices, min_price, max_price)
    """
    prices_array = np.array(prices)
    min_price = np.min(prices_array)
    max_price = np.max(prices_array)

    if max_price == min_price:
        # Constant prices - return as is
        return prices, min_price, max_price

    normalized = (prices_array - min_price) / (max_price - min_price)
    return normalized.tolist(), min_price, max_price


def denormalize_prices(normalized_prices, min_price, max_price):
    """
    Denormalize prices back to original scale

    Args:
        normalized_prices (list): Normalized prices
        min_price (float): Minimum price from original data
        max_price (float): Maximum price from original data

    Returns:
        list: Denormalized prices
    """
    if max_price == min_price:
        return normalized_prices

    normalized_array = np.array(normalized_prices)
    denormalized = normalized_array * (max_price - min_price) + min_price
    return denormalized.tolist()


def validate_date_sequence(dates):
    """
    Validate that dates are in chronological order

    Args:
        dates (list): List of date strings

    Returns:
        bool: True if dates are valid and sorted
    """
    try:
        parsed_dates = [datetime.fromisoformat(d.split('T')[0]) for d in dates if d]

        if len(parsed_dates) < 2:
            return True  # Single date is always valid

        for i in range(1, len(parsed_dates)):
            if parsed_dates[i] <= parsed_dates[i - 1]:
                logger.warning(f"Dates not in chronological order at index {i}")
                return False

        return True

    except Exception as e:
        logger.error(f"Date validation error: {e}")
        return False


def calculate_statistics(prices):
    """
    Calculate basic statistics for price data

    Args:
        prices (list): List of prices

    Returns:
        dict: Statistics (mean, std, min, max, etc.)
    """
    prices_array = np.array(prices)

    return {
        'mean': float(np.mean(prices_array)),
        'std': float(np.std(prices_array)),
        'min': float(np.min(prices_array)),
        'max': float(np.max(prices_array)),
        'median': float(np.median(prices_array)),
        'count': len(prices)
    }


def detect_outliers(prices, threshold=3.0):
    """
    Detect outliers using z-score method

    Args:
        prices (list): List of prices
        threshold (float): Z-score threshold for outlier detection

    Returns:
        list: Indices of outliers
    """
    prices_array = np.array(prices)
    mean = np.mean(prices_array)
    std = np.std(prices_array)

    if std == 0:
        return []  # No outliers if constant prices

    z_scores = np.abs((prices_array - mean) / std)
    outliers = np.where(z_scores > threshold)[0].tolist()

    if outliers:
        logger.warning(f"Detected {len(outliers)} outliers in price data")

    return outliers
