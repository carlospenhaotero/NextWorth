# Asset History API Contract

Version: 1.0
Last Updated: 2025-12-21

## Overview

This API endpoint provides historical price data for assets over a specified time range. It returns monthly closing prices for the last 24 months by default, along with asset metadata. This endpoint supports the asset detail page with historical price charts.

---

## Endpoint

### Get Asset Historical Prices

```
GET /api/v1/market/history/:symbol
```

**Authentication**: Required (JWT Bearer token)

**Description**: Retrieves historical monthly price data for a specified asset symbol, along with asset metadata.

---

## Path Parameters

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| symbol    | string | Yes      | Asset symbol (Yahoo Finance format, e.g., AAPL, BTC-USD) |

---

## Query Parameters

| Parameter | Type   | Required | Default | Description                                    |
|-----------|--------|----------|---------|------------------------------------------------|
| range     | string | No       | 24m     | Time range for historical data. Valid values: `6m`, `12m`, `24m`, `60m` |
| interval  | string | No       | 1mo     | Data point interval. Valid values: `1d`, `1wk`, `1mo` |

**Range Options**:
- `6m` - Last 6 months
- `12m` - Last 12 months (1 year)
- `24m` - Last 24 months (2 years)
- `60m` - Last 60 months (5 years)

**Interval Options**:
- `1d` - Daily prices (only available for ranges ≤ 6m due to data volume)
- `1wk` - Weekly prices
- `1mo` - Monthly prices (recommended for ranges ≥ 12m)

**Default Configuration**: `range=24m&interval=1mo` (24 monthly data points)

---

## Request Example

```http
GET /api/v1/market/history/AAPL?range=24m&interval=1mo
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Success Response

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "symbol": "AAPL",
  "yahooSymbol": "AAPL",
  "name": "Apple Inc.",
  "assetType": "stocks",
  "currency": "USD",
  "currentPrice": 195.89,
  "range": "24m",
  "interval": "1mo",
  "dataPoints": 24,
  "series": [
    {
      "date": "2023-12-01",
      "timestamp": 1701388800000,
      "close": 189.95,
      "open": 189.92,
      "high": 190.32,
      "low": 188.19,
      "volume": 48744405,
      "currency": "USD"
    },
    {
      "date": "2024-01-01",
      "timestamp": 1704067200000,
      "close": 184.40,
      "open": 187.15,
      "high": 191.05,
      "low": 180.17,
      "volume": 48744405,
      "currency": "USD"
    },
    {
      "date": "2024-02-01",
      "timestamp": 1706745600000,
      "close": 181.42,
      "open": 183.99,
      "high": 184.98,
      "low": 179.25,
      "volume": 41089593,
      "currency": "USD"
    }
    // ... 21 more monthly data points
  ],
  "metadata": {
    "marketCap": 3010000000000,
    "fiftyTwoWeekHigh": 199.62,
    "fiftyTwoWeekLow": 164.08,
    "averageVolume": 56582053
  },
  "source": "yahoo",
  "cachedAt": "2025-12-21T10:30:00.000Z",
  "ttl": 3600
}
```

**Response Fields**:

| Field         | Type    | Description                                              |
|---------------|---------|----------------------------------------------------------|
| symbol        | string  | Original requested symbol                                |
| yahooSymbol   | string  | Actual symbol used for Yahoo Finance lookup              |
| name          | string  | Full asset name                                          |
| assetType     | string  | Asset type: `stocks`, `crypto`, `etf`, `commodities`     |
| currency      | string  | Price currency (ISO 4217 code)                           |
| currentPrice  | number  | Most recent closing price                                |
| range         | string  | Applied time range parameter                             |
| interval      | string  | Applied interval parameter                               |
| dataPoints    | number  | Number of data points returned in series                 |
| series        | array   | Historical price data points (ordered chronologically)   |
| metadata      | object  | Additional asset metadata (optional)                     |
| source        | string  | Data source identifier (`yahoo`)                         |
| cachedAt      | string  | ISO 8601 timestamp of when data was cached               |
| ttl           | number  | Cache time-to-live in seconds                            |

**Series Object Fields**:

| Field      | Type   | Description                                              |
|------------|--------|----------------------------------------------------------|
| date       | string | ISO 8601 date string (YYYY-MM-DD)                        |
| timestamp  | number | Unix timestamp in milliseconds                           |
| close      | number | Closing price for the period                             |
| open       | number | Opening price for the period                             |
| high       | number | Highest price during the period                          |
| low        | number | Lowest price during the period                           |
| volume     | number | Trading volume for the period                            |
| currency   | string | Price currency (matches parent currency)                 |

**Notes**:
- Series array is ordered chronologically (oldest to newest)
- All price values are in the asset's native currency
- Timestamps use Unix epoch milliseconds for easy charting library integration
- Missing data points (e.g., weekends, holidays) are omitted from the series

---

## Error Responses

### 400 Bad Request - Missing Symbol

```json
{
  "error": "El símbolo del activo es obligatorio"
}
```

### 400 Bad Request - Invalid Range

```json
{
  "error": "Rango inválido. Valores permitidos: 6m, 12m, 24m, 60m"
}
```

### 400 Bad Request - Invalid Interval

```json
{
  "error": "Intervalo inválido. Valores permitidos: 1d, 1wk, 1mo"
}
```

### 400 Bad Request - Invalid Range/Interval Combination

```json
{
  "error": "El intervalo '1d' solo está disponible para rangos de 6m o menos"
}
```

### 401 Unauthorized - Missing Token

```json
{
  "error": "Token no proporcionado"
}
```

### 401 Unauthorized - Invalid Token

```json
{
  "error": "Token inválido o expirado"
}
```

### 404 Not Found - Symbol Not Found

```json
{
  "error": "Símbolo no encontrado o sin datos históricos disponibles"
}
```

### 429 Too Many Requests - Rate Limit

```json
{
  "error": "Demasiadas solicitudes. Intenta de nuevo en 60 segundos",
  "retryAfter": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "Error obteniendo datos históricos del activo"
}
```

### 503 Service Unavailable - External API Failure

```json
{
  "error": "Servicio de datos de mercado temporalmente no disponible"
}
```

---

## Error Response Fields

| Field       | Type   | Required | Description                                    |
|-------------|--------|----------|------------------------------------------------|
| error       | string | Yes      | Human-readable error message in Spanish        |
| retryAfter  | number | No       | Seconds to wait before retrying (rate limits only) |

---

## Caching Strategy

### Cache Configuration

- **Cache Location**: Server-side in-memory cache (Redis recommended for production)
- **Cache Key**: `asset_history:{symbol}:{range}:{interval}`
- **TTL (Time-To-Live)**:
  - 1 hour (3600s) for interval=1mo
  - 30 minutes (1800s) for interval=1wk
  - 15 minutes (900s) for interval=1d
- **Cache Invalidation**: Automatic expiration via TTL

### Caching Behavior

1. **Cache Hit**: Returns cached data with original `cachedAt` timestamp
2. **Cache Miss**: Fetches from Yahoo Finance, caches response, returns fresh data
3. **Stale Data**: If TTL expires, refetch from source and update cache
4. **Failed Refresh**: If Yahoo Finance is unavailable, serve stale cache for up to 24 hours with warning in response

### Cache Headers (Future Enhancement)

Response should include HTTP cache headers for client-side caching:

```
Cache-Control: public, max-age=3600
ETag: "hash-of-response-data"
Last-Modified: Sat, 21 Dec 2025 10:30:00 GMT
```

---

## Rate Limiting

### Limits

- **Per User**: 60 requests per minute per authenticated user
- **Per IP**: 100 requests per minute per IP address (for burst protection)
- **Global**: 10,000 requests per hour (for upstream API protection)

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1703172600
```

### Rate Limit Exceeded Response

When limits are exceeded, returns `429 Too Many Requests` with retry information.

---

## Data Source Notes

### Yahoo Finance API

- **Provider**: yahoo-finance2 npm package
- **Historical Data Method**: `yahooFinance.historical(symbol, { period1, period2, interval })`
- **Coverage**: Global stocks, ETFs, crypto, commodities, currencies
- **Availability**: Free tier with no API key required
- **Limitations**:
  - 2000 requests per hour per IP (shared across all endpoints)
  - Maximum 5 years of daily data
  - Maximum 10 years of weekly/monthly data
  - Some symbols may have incomplete historical data

### Symbol Format

Follows Yahoo Finance symbol conventions:
- **Stocks**: `AAPL`, `TSLA`, `MSFT`
- **Crypto**: `BTC-USD`, `ETH-USD`, `ADA-USD`
- **Commodities**: `GC=F` (gold), `CL=F` (crude oil)
- **FX**: `EURUSD=X`, `GBPUSD=X`

---

## Implementation Notes

### Sequential Processing

To avoid Yahoo Finance rate limits and timeouts, historical data fetching should be sequential (not parallel) when multiple requests are made.

### Error Handling Strategy

1. **Symbol Not Found**: Try alternative symbol formats (e.g., add exchange suffix)
2. **Partial Data**: If Yahoo returns fewer data points than expected, return available data with warning
3. **No Data**: Return 404 with appropriate error message
4. **Upstream Timeout**: Retry once with exponential backoff, then fail gracefully

### Response Time

Expected response times:
- **Cache Hit**: < 50ms
- **Cache Miss**: 1-3 seconds (Yahoo Finance latency)
- **Timeout Threshold**: 10 seconds

### Currency Handling

- All historical prices are returned in the asset's native currency
- No automatic conversion to user's base currency (frontend responsibility)
- For multi-currency charting, frontend should fetch FX rates separately via `/api/market/fx/:from/:to`

### Asset Type Detection

If asset is not in the `assets` table, infer type from symbol:
- Contains `-USD`: `crypto`
- Contains `=F`: `commodities`
- Contains `=X`: `currency`
- Default: `stocks`

---

## Future Enhancements

### Planned Features (Not Yet Implemented)

1. **Intraday Data**: Support for `1m`, `5m`, `15m` intervals for day trading
2. **Adjusted Close**: Include dividend/split-adjusted closing prices
3. **Technical Indicators**: Optional query params for MA, RSI, MACD
4. **Batch Requests**: Support for fetching multiple symbols in one request
5. **Export Formats**: Support for CSV, Excel download via `Accept` header
6. **Comparison Data**: Multi-symbol comparison with normalized percentage returns
7. **WebSocket Stream**: Real-time price updates via WebSocket connection

---

## Changelog

### v1.0 (2025-12-21)
- Initial API contract definition
- Support for 6m, 12m, 24m, 60m ranges
- Support for 1d, 1wk, 1mo intervals
- Server-side caching with configurable TTL
- Rate limiting per user and IP
- Comprehensive error handling
