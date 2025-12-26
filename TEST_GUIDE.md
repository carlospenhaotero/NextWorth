# NextWorth Chronos Integration - Test Guide

## ✅ Pre-Test Checklist

### 1. PostgreSQL Database
- [ ] PostgreSQL is running
- [ ] Database `nextworth_db` exists
- [ ] You have valid login credentials for the frontend

### 2. ML Service
- [ ] Python 3.9+ installed
- [ ] Virtual environment created and activated
- [ ] Dependencies installed
- [ ] Service running on port 5000

### 3. Backend
- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file has `ML_SERVICE_URL=http://localhost:5000`
- [ ] Service running on port 4000

### 4. Frontend
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file has `VITE_API_URL=http://localhost:4000/api`
- [ ] Service running on port 3000

---

## 🚀 Step-by-Step Test Procedure

### Phase 1: Service Startup (15 minutes)

#### Step 1.1: Start PostgreSQL
```bash
# Verify PostgreSQL is running
# Windows: Check Services or pgAdmin
# macOS/Linux: sudo service postgresql status
```

**✅ Success indicator**: PostgreSQL service is active

---

#### Step 1.2: Start ML Service
```bash
# Open Terminal 1
cd C:\Users\usuario\Desktop\TFG\nextworth\ml-service

# Activate virtual environment
venv\Scripts\activate

# Start the service
python app.py
```

**✅ Expected output:**
```
INFO - Starting ML Service on port 5000
INFO - Model: amazon/chronos-t5-small
INFO - Debug mode: True
 * Running on http://0.0.0.0:5000
```

**🧪 Quick test:**
```bash
# Open new terminal
curl http://localhost:5000/health
```

**✅ Expected response:**
```json
{"status":"ok","model":"amazon/chronos-t5-small","version":"1.0.0"}
```

**❌ If it fails:**
- Check port 5000 is not in use: `netstat -ano | findstr :5000`
- Check virtual environment is activated
- Check all dependencies installed: `pip list`

---

#### Step 1.3: Start Backend
```bash
# Open Terminal 2
cd C:\Users\usuario\Desktop\TFG\nextworth\backend

# Start backend
npm run dev
```

**✅ Expected output:**
```
✅ Conectado a PostgreSQL
✅ Tabla 'users' lista
✅ Tabla 'assets' lista
✅ Tabla 'user_portfolio' lista
✅ Tabla 'asset_price_history' lista
✅ Tabla 'asset_predictions' lista (creada o ya existente)
✅ Índices para 'asset_predictions' listos
Server running on port 4000
```

**🧪 Quick test:**
```bash
# Open new terminal
curl http://localhost:4000/health
```

**✅ Expected response:**
```json
{"status":"ok","message":"NextWorth backend funcionando 🚀"}
```

**❌ If "asset_predictions" table not created:**
- Check PostgreSQL connection in backend logs
- Manually verify: `psql -d nextworth_db -c "\dt asset_predictions"`
- Restart backend with `npm run dev`

---

#### Step 1.4: Start Frontend
```bash
# Open Terminal 3
cd C:\Users\usuario\Desktop\TFG\nextworth\frontend

# Start frontend
npm run dev
```

**✅ Expected output:**
```
VITE v5.x.x ready in XXX ms
➜  Local:   http://localhost:3000/
```

**🧪 Open browser**: http://localhost:3000

**✅ Success indicator**: Login page loads without errors

---

### Phase 2: Backend API Tests (10 minutes)

Before testing the UI, let's verify the backend API works correctly.

#### Step 2.1: Login and Get Token

**Browser DevTools method:**
1. Open http://localhost:3000
2. Login with your credentials
3. Open DevTools (F12) → Application → Local Storage
4. Copy the `token` value

**Save your token for next steps:**
```
YOUR_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### Step 2.2: Test Prediction Endpoint (First Request - Cache Miss)

```bash
# Replace YOUR_TOKEN with actual token
curl -X GET "http://localhost:4000/api/predictions/AAPL?horizon=6m" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Expected response (first time - takes 5-15 seconds):**
```json
{
  "symbol": "AAPL",
  "assetId": 1,
  "horizon": "6m",
  "predictions": [
    {"date": "2025-01-01", "predicted_close": 180.50},
    {"date": "2025-02-01", "predicted_close": 185.30},
    {"date": "2025-03-01", "predicted_close": 182.75},
    {"date": "2025-04-01", "predicted_close": 188.20},
    {"date": "2025-05-01", "predicted_close": 190.15},
    {"date": "2025-06-01", "predicted_close": 195.80}
  ],
  "source": "ml_service",
  "cachedAt": "2024-12-22T...",
  "ttl": 3600,
  "modelVersion": "chronos-t5-small",
  "inferenceTimeMs": 4500
}
```

**📊 Check backend logs (Terminal 2):**
```
📊 Prediction request: AAPL, horizon: 6m, TTL: 3600s
🔮 Prediction request: AAPL (horizon: 6m, ttl: 3600s)
❌ Prediction cache MISS for AAPL (6m), generating...
INFO - Prediction request for AAPL, horizon: 6m
INFO - Generated 6 predictions
INFO - Successfully generated 6 predictions in 4500ms
💾 Stored 6 predictions for AAPL (6m)
```

**❌ If it fails:**
- **"Predictions temporarily unavailable"**: ML service is not running or unreachable
- **"Insufficient historical data"**: Asset needs at least 6 months of price history
- **Timeout after 30s**: ML service is overloaded or model loading
- **401 Unauthorized**: Token is invalid or expired

---

#### Step 2.3: Test Cache Hit (Second Request - Should be <1s)

```bash
# Same request again - should be instant
curl -X GET "http://localhost:4000/api/predictions/AAPL?horizon=6m" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Expected response (instant):**
```json
{
  ...
  "source": "cache",  // ← Should be "cache" now, not "ml_service"
  "cachedAt": "2024-12-22T...",
  ...
}
```

**📊 Check backend logs:**
```
✅ Prediction cache HIT for AAPL (6m): 6 points
```

---

#### Step 2.4: Test Different Horizons

```bash
# Test 3-month predictions
curl -X GET "http://localhost:4000/api/predictions/AAPL?horizon=3m" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 1-year predictions
curl -X GET "http://localhost:4000/api/predictions/AAPL?horizon=1y" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2-year predictions
curl -X GET "http://localhost:4000/api/predictions/AAPL?horizon=2y" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Expected**: Each horizon generates different predictions with appropriate TTLs
- 3m, 6m: TTL = 3600 (1 hour)
- 1y, 2y, 5y: TTL = 86400 (24 hours)

---

#### Step 2.5: Test Different Assets

```bash
# Bitcoin
curl -X GET "http://localhost:4000/api/predictions/BTC-USD?horizon=6m" \
  -H "Authorization: Bearer YOUR_TOKEN"

# S&P 500 ETF
curl -X GET "http://localhost:4000/api/predictions/SPY?horizon=6m" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Expected**: Works for any asset with historical data

---

### Phase 3: Frontend UI Tests (15 minutes)

Now let's test the complete user experience in the browser.

#### Step 3.1: Navigate to Asset Detail

1. Open http://localhost:3000 in your browser
2. Login if not already logged in
3. Click on "Assets" in the sidebar
4. Add AAPL to your portfolio if not already there (use "Add Asset" button)
5. **Double-click on AAPL** to open the asset detail page

**✅ Success indicator**:
- Historical price chart loads
- You see range selector buttons (6M, 1Y, 2Y, 5Y)
- Current price and stats are displayed

---

#### Step 3.2: Enable Predictions

1. Find the "Show AI Predictions" checkbox (below the range selector)
2. **Check the box** to enable predictions

**✅ Expected behavior:**
- Checkbox becomes checked
- Horizon selector buttons appear (3M, 6M, 1Y, 2Y, 5Y)
- 6M button is selected by default (blue background)
- Loading message appears: "Generating predictions..."

**📊 After 5-15 seconds (first time):**
- Loading message disappears
- **Blue dotted line** appears on the chart extending into the future
- **"Today" vertical dashed line** separates historical from predicted data
- Chart automatically scales to include predictions

**✅ Visual verification:**
- Historical data: Solid area (green or red gradient)
- Predictions: Blue dotted line starting from last historical point
- "Today" line: Gray dashed vertical line with "Today" label

---

#### Step 3.3: Test Tooltip Hover

1. **Hover over historical data** (before "Today" line)

**✅ Expected tooltip:**
```
Dec 22, 2024
Close: $180.50
Open: $179.20
High: $181.75
Low: $178.90
Volume: 45.2M
```

2. **Hover over prediction data** (after "Today" line)

**✅ Expected tooltip:**
```
Feb 15, 2025
Predicted: $185.30
AI forecast
```

---

#### Step 3.4: Change Prediction Horizon

1. Click **"3M"** button

**✅ Expected:**
- Loading message briefly appears
- Chart updates with 3-month predictions (shorter blue line)
- 3M button highlighted in blue

2. Click **"1Y"** button

**✅ Expected:**
- Chart updates with 12-month predictions (longer blue line)
- Chart X-axis extends to show full year

3. Try all horizons: **3M → 6M → 1Y → 2Y → 5Y**

**✅ Expected:**
- Each changes the prediction length
- Loading is instant after first load (cache hit!)
- Chart smoothly updates

---

#### Step 3.5: Toggle Predictions On/Off

1. **Uncheck** "Show AI Predictions"

**✅ Expected:**
- Blue dotted line disappears
- "Today" line disappears
- Chart shows only historical data
- Horizon buttons disappear

2. **Check** "Show AI Predictions" again

**✅ Expected:**
- Predictions reappear instantly (from cache)
- 6M horizon is still selected
- No loading delay

---

#### Step 3.6: Test with Different Assets

1. Go back to Assets page (click back arrow or navigate to /assets)
2. Click on **BTC-USD** (Bitcoin)
3. Enable predictions

**✅ Expected:**
- Works the same way as AAPL
- Price scale adjusts to Bitcoin prices (thousands of dollars)
- Predictions extend appropriately

3. Try **SPY** (S&P 500 ETF)

**✅ Expected:**
- Also works correctly
- Different price scale

---

#### Step 3.7: Test Cache Behavior

1. With AAPL open and predictions enabled (6m)
2. **Disable** predictions (uncheck)
3. **Enable** predictions again
4. **Note the speed**: Should be instant (cache hit)

**📊 Check browser DevTools:**
- Open DevTools (F12) → Network tab
- Enable predictions
- Look for request to `/api/predictions/AAPL?horizon=6m`
- Response should be <1s
- Check Response tab: `"source": "cache"`

---

### Phase 4: Advanced Tests (10 minutes)

#### Test 4.1: ML Service Failure (Stale Cache Fallback)

1. With AAPL predictions loaded and working
2. **Stop the ML service** (Go to Terminal 1, press Ctrl+C)
3. In browser, navigate to a **new asset** (e.g., MSFT)
4. Enable predictions

**✅ Expected behavior:**
- Error message appears: "Failed to load predictions"
- No predictions shown (no cache exists yet)

5. Navigate back to **AAPL**
6. Enable predictions

**✅ Expected behavior:**
- Predictions still appear (from cache)
- If cache is expired, you might see a warning: "Predictions may be outdated"

7. **Restart ML service** (Terminal 1: `python app.py`)

---

#### Test 4.2: Concurrent Requests (Request Deduplication)

1. Open **two browser tabs** with AAPL asset detail
2. In **both tabs simultaneously**, enable predictions for the same horizon

**📊 Check backend logs:**
```
🔄 Returning in-flight prediction request for AAPL:6m
```

**✅ Expected:**
- Both tabs get predictions
- Only ONE request sent to ML service (deduplication works!)

---

#### Test 4.3: Database Cache Verification

**Open psql or pgAdmin:**
```sql
-- Check cached predictions
SELECT
  a.symbol,
  ap.prediction_horizon,
  COUNT(*) as prediction_count,
  MAX(ap.fetched_at) as last_fetched
FROM asset_predictions ap
JOIN assets a ON a.id = ap.asset_id
GROUP BY a.symbol, ap.prediction_horizon
ORDER BY last_fetched DESC;
```

**✅ Expected output:**
```
 symbol | prediction_horizon | prediction_count |       last_fetched
--------+--------------------+------------------+------------------------
 AAPL   | 6m                 |                6 | 2024-12-22 10:30:00
 AAPL   | 3m                 |                3 | 2024-12-22 10:25:00
 BTC-USD| 6m                 |                6 | 2024-12-22 10:20:00
```

**Check specific predictions:**
```sql
SELECT
  prediction_date,
  predicted_close,
  model_version,
  fetched_at
FROM asset_predictions ap
JOIN assets a ON a.id = ap.asset_id
WHERE a.symbol = 'AAPL'
  AND ap.prediction_horizon = '6m'
ORDER BY prediction_date;
```

---

#### Test 4.4: TTL Expiration Test

**Manual TTL test (optional):**
```sql
-- Manually expire a cache entry
UPDATE asset_predictions
SET fetched_at = NOW() - INTERVAL '2 hours'
WHERE asset_id = (SELECT id FROM assets WHERE symbol = 'AAPL')
  AND prediction_horizon = '6m';
```

**Then in browser:**
1. Navigate to AAPL
2. Enable 6m predictions

**✅ Expected:**
- Loading appears (cache expired)
- New predictions fetched from ML service
- Database updated with fresh `fetched_at` timestamp

---

### Phase 5: Performance Tests (5 minutes)

#### Test 5.1: First Load Performance

1. Clear browser cache (Ctrl+Shift+Delete)
2. Navigate to a fresh asset (never loaded before)
3. Enable predictions
4. **Measure time** using DevTools Network tab

**✅ Target performance:**
- Cache miss (first load): 3-15 seconds
- Cache hit (second load): <1 second
- ML service inference: 3-10 seconds (visible in response JSON)

---

#### Test 5.2: Multiple Asset Performance

1. Rapidly switch between 5 different assets
2. Enable predictions on each

**✅ Expected:**
- First asset: 5-15s (cache miss)
- Subsequent assets: 5-15s each (different symbols, all cache misses)
- After all loaded once, switching back is instant (cache hits)

---

### Phase 6: Error Handling Tests (5 minutes)

#### Test 6.1: Invalid Horizon

```bash
curl -X GET "http://localhost:4000/api/predictions/AAPL?horizon=10y" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Expected response (400 Bad Request):**
```json
{
  "error": "Invalid horizon. Must be one of: 3m, 6m, 1y, 2y, 5y"
}
```

---

#### Test 6.2: Invalid Symbol

```bash
curl -X GET "http://localhost:4000/api/predictions/INVALID123?horizon=6m" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Expected:**
- Either 503 error (no data available)
- Or generates predictions if Yahoo Finance accepts the symbol

---

#### Test 6.3: No Authentication

```bash
curl -X GET "http://localhost:4000/api/predictions/AAPL?horizon=6m"
# No Authorization header
```

**✅ Expected response (401 Unauthorized):**
```json
{
  "error": "No token provided"
}
```

---

## 📋 Final Verification Checklist

### ML Service ✅
- [ ] Health endpoint responds
- [ ] Can generate predictions for sample data
- [ ] Inference time is 3-10 seconds
- [ ] Memory usage stable (~1.5GB)

### Backend ✅
- [ ] Predictions endpoint requires authentication
- [ ] First request hits ML service (cache miss)
- [ ] Second request uses cache (instant response)
- [ ] Different horizons work correctly
- [ ] TTL logic works (3600s for 3m/6m, 86400s for others)
- [ ] Stale cache fallback works when ML service down
- [ ] Database stores predictions correctly

### Frontend ✅
- [ ] "Show AI Predictions" toggle works
- [ ] Horizon selector buttons work (3M, 6M, 1Y, 2Y, 5Y)
- [ ] Chart displays blue dotted line for predictions
- [ ] "Today" reference line appears
- [ ] Tooltip shows different format for predictions
- [ ] Loading state displays during fetch
- [ ] Error messages display on failure
- [ ] Toggle on/off works smoothly
- [ ] Works on multiple assets (AAPL, BTC-USD, SPY)

### Performance ✅
- [ ] Cache hit responses < 1 second
- [ ] Cache miss responses < 15 seconds
- [ ] ML service handles concurrent requests
- [ ] No memory leaks after extended use

### Database ✅
- [ ] `asset_predictions` table exists
- [ ] Predictions stored with correct schema
- [ ] Indexes created successfully
- [ ] TTL expiration works
- [ ] UNIQUE constraint prevents duplicates

---

## 🎯 Success Criteria

**The integration is successful if:**

1. ✅ All 3 services start without errors
2. ✅ Backend API returns predictions for AAPL
3. ✅ Frontend displays predictions as blue dotted line
4. ✅ Cache hit is instant (<1s)
5. ✅ All 5 horizons work correctly
6. ✅ Toggle on/off works smoothly
7. ✅ Works on different assets (stocks, crypto, ETFs)
8. ✅ Stale cache fallback works when ML service stops
9. ✅ Database stores predictions correctly
10. ✅ No errors in browser console or backend logs

---

## 🐛 Common Issues & Solutions

### Issue: ML Service won't start
**Solution:**
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Issue: "Module 'chronos' not found"
**Solution:**
```bash
pip install git+https://github.com/amazon-science/chronos-forecasting.git
```

### Issue: Backend can't connect to ML service
**Solution:**
- Check `ML_SERVICE_URL` in `backend/.env`
- Verify ML service is running: `curl http://localhost:5000/health`
- Check firewall isn't blocking port 5000

### Issue: Predictions don't appear in chart
**Solution:**
- Open browser DevTools → Console (check for errors)
- Check Network tab for `/api/predictions/` request
- Verify response has `predictions` array
- Check React component state in React DevTools

### Issue: "Insufficient historical data"
**Solution:**
- Asset needs at least 6 months of price history
- Try a different asset with more history (e.g., AAPL, MSFT)

### Issue: Very slow predictions (>30s)
**Solution:**
- First prediction downloads model (~200MB, one-time)
- Check ML service logs for "Loading Chronos model"
- Wait for model to fully load, then retry

---

## 📊 Performance Benchmarks

**Expected Performance:**
- ML Service startup: 5-10 seconds
- Model loading (first prediction): 30-60 seconds (one-time)
- Inference time: 3-10 seconds
- Cache hit response: <1 second
- Database query: <100ms
- Frontend render: <500ms

**System Requirements:**
- RAM: 4GB minimum (2GB for ML service + 2GB for other services)
- CPU: Any modern processor
- Disk: 5GB free (for Python packages and model cache)

---

## ✅ Test Complete!

If all tests pass, your Chronos integration is fully functional! 🎉

**Next Steps:**
- Add more assets to test with
- Monitor performance over time
- Consider adding confidence intervals
- Explore batch prediction pre-computation for popular assets
