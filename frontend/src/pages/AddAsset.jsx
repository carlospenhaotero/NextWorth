import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioService } from '../services/portfolioService';
import { assetService } from '../services/assetService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/addAsset.css';

const AddAsset = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  // Estados principales
  const [step, setStep] = useState(1); // 1: Search/Browse, 2: Select from category, 3: Form
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Estados de búsqueda global
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allAssets, setAllAssets] = useState([]);

  // Estados del paso 2 (browse category)
  const [popularAssets, setPopularAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    assetType: 'stock',
    currency: user?.baseCurrency || 'USD',
    quantity: '',
    avgBuyPrice: '',
    tae: '',
    faceValue: '',
    couponRate: '',
    couponFrequency: '1',
    maturityDate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [bondDetailsOpen, setBondDetailsOpen] = useState(false);

  // Tipos de activos con iconos emoji
  const assetTypes = [
    { value: 'stock', label: 'Stock', icon: '📈', description: 'Stocks & Equities' },
    { value: 'etf', label: 'ETF', icon: '📊', description: 'Exchange Traded Funds' },
    { value: 'crypto', label: 'Crypto', icon: '₿', description: 'Digital Assets' },
    { value: 'commodity', label: 'Commodity', icon: '🥇', description: 'Physical Assets' },
    { value: 'bond', label: 'Bond', icon: '🏛️', description: 'Debt Securities' },
  ];

  // Quick Actions para Cash y Savings
  const quickActions = [
    {
      value: 'cash',
      label: 'Cash',
      icon: '💵',
      description: 'Bank balance',
      preset: { symbol: 'CASH', name: 'Cash in bank', currency: user?.baseCurrency || 'EUR', avgBuyPrice: '1' }
    },
    {
      value: 'savings',
      label: 'Savings',
      icon: '🏦',
      description: 'Interest-earning',
      preset: { symbol: 'SAVINGS', name: 'Savings account', currency: user?.baseCurrency || 'EUR', avgBuyPrice: '1' }
    },
  ];

  // Cargar todos los activos para búsqueda global al montar
  useEffect(() => {
    const loadAllAssets = async () => {
      try {
        const [stocks, etfs, cryptos, commodities, bonds] = await Promise.all([
          assetService.getPopularAssets('stock'),
          assetService.getPopularAssets('etf'),
          assetService.getPopularAssets('crypto'),
          assetService.getPopularAssets('commodity'),
          assetService.getPopularAssets('bond'),
        ]);

        const combined = [
          ...stocks.map(a => ({ ...a, assetType: 'stock' })),
          ...etfs.map(a => ({ ...a, assetType: 'etf' })),
          ...cryptos.map(a => ({ ...a, assetType: 'crypto' })),
          ...commodities.map(a => ({ ...a, assetType: 'commodity' })),
          ...bonds.map(a => ({ ...a, assetType: 'bond' })),
        ];

        setAllAssets(combined);
      } catch (err) {
        console.error('Error loading assets for global search:', err);
      }
    };

    loadAllAssets();
  }, []);

  // Búsqueda global con debounce
  useEffect(() => {
    if (globalSearchQuery.trim().length < 2) {
      setGlobalSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(() => {
      const query = globalSearchQuery.toLowerCase();
      const results = allAssets.filter(asset =>
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        (asset.displaySymbol && asset.displaySymbol.toLowerCase().includes(query))
      ).slice(0, 15); // Limitar a 15 resultados

      setGlobalSearchResults(results);
      setShowSearchResults(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearchQuery, allAssets]);

  // Agrupar resultados de búsqueda por tipo
  const groupedSearchResults = useMemo(() => {
    const groups = {};
    globalSearchResults.forEach(asset => {
      const type = asset.assetType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(asset);
    });
    return groups;
  }, [globalSearchResults]);

  // Calcular inversión total
  const investmentTotal = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.avgBuyPrice) || 0;
    return qty * price;
  }, [formData.quantity, formData.avgBuyPrice]);

  // Cargar activos de una categoría específica
  const loadPopularAssets = async (assetType) => {
    setLoadingAssets(true);
    setError('');
    setSearchQuery('');
    try {
      const assets = await assetService.getPopularAssets(assetType);
      setPopularAssets(assets);
      setFilteredAssets(assets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssets(false);
    }
  };

  // Filtrar activos en paso 2
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAssets(popularAssets);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = popularAssets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query) ||
          (asset.displaySymbol && asset.displaySymbol.toLowerCase().includes(query))
      );
      setFilteredAssets(filtered);
    }
  }, [searchQuery, popularAssets]);

  // Handlers
  const handleGlobalSearchSelect = (asset) => {
    setSelectedAsset(asset);
    setSelectedAssetType(asset.assetType);
    setFormData(prev => ({
      ...prev,
      symbol: asset.symbol,
      name: asset.name,
      assetType: asset.assetType,
      currency: asset.currency || 'USD',
      quantity: '',
      avgBuyPrice: '',
    }));
    setGlobalSearchQuery('');
    setShowSearchResults(false);
    setStep(3);
  };

  const handleCategorySelect = (assetType) => {
    setSelectedAssetType(assetType);
    setFormData(prev => ({
      ...prev,
      assetType,
      currency: assetType === 'crypto' ? 'USD' : (user?.baseCurrency || 'USD'),
    }));
    loadPopularAssets(assetType);
    setStep(2);
  };

  const handleQuickAction = (action) => {
    setSelectedAssetType(action.value);
    setFormData(prev => ({
      ...prev,
      ...action.preset,
      assetType: action.value,
      quantity: '',
    }));
    setSelectedAsset(null);
    setManualEntry(true);
    setStep(3);
  };

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setFormData(prev => ({
      ...prev,
      symbol: asset.symbol,
      name: asset.name,
      assetType: selectedAssetType,
      currency: asset.currency || (selectedAssetType === 'crypto' ? 'USD' : (user?.baseCurrency || 'USD')),
      quantity: '',
      avgBuyPrice: '',
    }));
    setStep(3);
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    setStep(3);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.symbol || !formData.quantity || !formData.avgBuyPrice) {
      setError('Please complete all required fields');
      setLoading(false);
      return;
    }

    try {
      await portfolioService.addAsset({
        symbol: formData.symbol.toUpperCase(),
        name: formData.name || formData.symbol.toUpperCase(),
        assetType: formData.assetType,
        currency: formData.currency,
        quantity: parseFloat(formData.quantity),
        avgBuyPrice: parseFloat(formData.avgBuyPrice),
        tae: formData.assetType === 'savings' && formData.tae ? parseFloat(formData.tae) : null,
        faceValue: formData.assetType === 'bond' ? parseFloat(formData.faceValue) : null,
        couponRate: formData.assetType === 'bond' ? parseFloat(formData.couponRate) : null,
        couponFrequency: formData.assetType === 'bond' ? parseInt(formData.couponFrequency) : null,
        maturityDate: formData.assetType === 'bond' ? formData.maturityDate : null,
      });

      setSuccess('Asset added successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding asset');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      if (manualEntry || ['cash', 'savings'].includes(selectedAssetType)) {
        setStep(1);
        setSelectedAssetType(null);
        setSelectedAsset(null);
        setManualEntry(false);
        return;
      }
      setStep(2);
      setManualEntry(false);
    } else if (step === 2) {
      setStep(1);
      setSelectedAssetType(null);
      setPopularAssets([]);
      setFilteredAssets([]);
      setSearchQuery('');
    }
  };

  // Obtener label del tipo de activo
  const getAssetTypeLabel = (type) => {
    const found = [...assetTypes, ...quickActions].find(t => t.value === type);
    return found?.label || type;
  };

  const getAssetTypeIcon = (type) => {
    const found = [...assetTypes, ...quickActions].find(t => t.value === type);
    return found?.icon || '📄';
  };

  // ============================================
  // PASO 1: Búsqueda Global + Quick Actions + Categories
  // ============================================
  if (step === 1) {
    return (
      <Layout>
        <div className="add-asset">
          <div className="add-asset-header">
            <h1>Add Asset</h1>
            <p className="add-asset-subtitle">Search for any asset or browse by category</p>
          </div>

          {/* Búsqueda Global */}
          <div className="global-search-container">
            <div className="global-search-wrapper">
              <span className="global-search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                className="global-search-input"
                placeholder="Search stocks, ETFs, crypto, commodities..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onFocus={() => globalSearchQuery.length >= 2 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                autoFocus
              />
            </div>

            <p className="search-hint">
              Try <kbd>AAPL</kbd> <kbd>Bitcoin</kbd> <kbd>VOO</kbd> <kbd>Gold</kbd>
            </p>

            {/* Resultados de búsqueda */}
            {showSearchResults && globalSearchResults.length > 0 && (
              <div className="search-results">
                {Object.entries(groupedSearchResults).map(([type, assets]) => (
                  <div key={type} className="search-results-group">
                    <div className="search-results-group-title">
                      {getAssetTypeIcon(type)} {getAssetTypeLabel(type)}s
                    </div>
                    {assets.map((asset, idx) => (
                      <button
                        key={idx}
                        className="search-result-item"
                        onMouseDown={() => handleGlobalSearchSelect(asset)}
                      >
                        <div className="search-result-info">
                          <span className="search-result-symbol">
                            {asset.displaySymbol || asset.symbol}
                          </span>
                          <span className="search-result-name">{asset.name}</span>
                        </div>
                        {asset.exchange && (
                          <span className="search-result-badge">{asset.exchange}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {showSearchResults && globalSearchQuery.length >= 2 && globalSearchResults.length === 0 && (
              <div className="search-results">
                <div className="no-search-results">
                  <p>No assets found for "{globalSearchQuery}"</p>
                  <button onClick={() => { setShowSearchResults(false); handleManualEntry(); }}>
                    Add manually
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions para Cash y Savings */}
          <div className="quick-actions-section">
            <div className="section-divider">Quick Actions</div>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <button
                  key={action.value}
                  className="quick-action-card"
                  onClick={() => handleQuickAction(action)}
                >
                  <div className="quick-action-icon">{action.icon}</div>
                  <div className="quick-action-text">
                    <span className="quick-action-title">{action.label}</span>
                    <span className="quick-action-desc">{action.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Categorías como Chips */}
          <div className="category-section">
            <div className="section-divider">Browse by Category</div>
            <div className="category-chips">
              {assetTypes.map((type) => (
                <button
                  key={type.value}
                  className="category-chip"
                  onClick={() => handleCategorySelect(type.value)}
                >
                  <span className="category-chip-icon">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ============================================
  // PASO 2: Selección de activo dentro de categoría
  // ============================================
  if (step === 2) {
    const selectedTypeData = assetTypes.find(t => t.value === selectedAssetType);

    return (
      <Layout>
        <div className="add-asset">
          <div className="add-asset-header">
            <button onClick={handleBack} className="back-button">
              ← Back
            </button>
            <h1>{selectedTypeData?.icon} Select {selectedTypeData?.label}</h1>
            <p className="add-asset-subtitle">
              Choose from popular assets or enter manually
            </p>
          </div>

          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Filter by symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {loadingAssets ? (
            <div className="loading">Loading assets...</div>
          ) : (
            <>
              <div className="popular-assets-grid">
                {filteredAssets.map((asset, index) => (
                  <button
                    key={index}
                    className="popular-asset-card"
                    onClick={() => handleAssetSelect(asset)}
                  >
                    <div className="asset-card-header">
                      <span className="asset-symbol">{asset.displaySymbol || asset.symbol}</span>
                      {asset.exchange && (
                        <span className="asset-exchange-badge">{asset.exchange}</span>
                      )}
                    </div>
                    <div className="asset-name">{asset.name}</div>
                  </button>
                ))}
              </div>

              {filteredAssets.length === 0 && searchQuery && (
                <div className="no-results">
                  <p>No assets found matching "{searchQuery}"</p>
                </div>
              )}

              <div className="manual-entry-section">
                <button
                  className="btn btn-secondary"
                  onClick={handleManualEntry}
                  style={{ width: '100%' }}
                >
                  Can't find it? Add manually
                </button>
              </div>
            </>
          )}
        </div>
      </Layout>
    );
  }

  // ============================================
  // PASO 3: Formulario
  // ============================================
  const isCashOrSavings = ['cash', 'savings'].includes(formData.assetType);
  const isBond = formData.assetType === 'bond';

  return (
    <Layout>
      <div className="add-asset">
        <div className="add-asset-header">
          <button onClick={handleBack} className="back-button">
            ← Back
          </button>
          <h1>Complete Details</h1>
          <p className="add-asset-subtitle">
            {selectedAsset ? `Adding ${selectedAsset.name}` : 'Enter asset details'}
          </p>
        </div>

        <div className="add-asset-card">
          {/* Asset Preview Card */}
          {selectedAsset && (
            <div className="asset-preview">
              <div className="asset-preview-icon">{getAssetTypeIcon(formData.assetType)}</div>
              <div className="asset-preview-info">
                <div className="asset-preview-name">{selectedAsset.name}</div>
                <div className="asset-preview-symbol">
                  {selectedAsset.displaySymbol || selectedAsset.symbol}
                  {selectedAsset.exchange && ` • ${selectedAsset.exchange}`}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="add-asset-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Hint para Cash/Savings */}
            {isCashOrSavings && (
              <div className="info-banner">
                <span className="info-banner-icon">💡</span>
                Enter your total balance. The price is automatically set to 1.
              </div>
            )}

            {/* Campos de Symbol y Name (solo si es entrada manual) */}
            {(manualEntry || !selectedAsset) && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Symbol</label>
                  <input
                    type="text"
                    name="symbol"
                    className="form-input"
                    value={formData.symbol}
                    onChange={handleChange}
                    required
                    placeholder="e.g. AAPL"
                    style={{ textTransform: 'uppercase' }}
                    disabled={isCashOrSavings}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Asset name"
                    disabled={isCashOrSavings}
                  />
                </div>
              </div>
            )}

            {/* Campos principales: Quantity + Price */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  {isCashOrSavings ? 'Balance' : 'Quantity'}
                  {selectedAsset?.unit && <span className="unit-label">({selectedAsset.unit})</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  name="quantity"
                  className="form-input"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  autoFocus={!manualEntry && selectedAsset}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isCashOrSavings ? 'Unit Price' : 'Avg Buy Price'}
                  <span className="unit-label">({formData.currency})</span>
                </label>
                <input
                  type="number"
                  step="any"
                  name="avgBuyPrice"
                  className="form-input"
                  value={formData.avgBuyPrice}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  disabled={isCashOrSavings}
                />
              </div>
            </div>

            {/* Currency selector (solo si no es crypto) */}
            {(isCashOrSavings || manualEntry) && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select
                    name="currency"
                    className="form-select"
                    value={formData.currency}
                    onChange={handleChange}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                {formData.assetType === 'savings' && (
                  <div className="form-group">
                    <label className="form-label">Annual Interest (TAE %)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="tae"
                      className="form-input"
                      value={formData.tae}
                      onChange={handleChange}
                      placeholder="e.g. 3.50"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Bond Details (Collapsible) */}
            {isBond && (
              <div className="collapsible-section">
                <button
                  type="button"
                  className="collapsible-header"
                  onClick={() => setBondDetailsOpen(!bondDetailsOpen)}
                >
                  <span className="collapsible-title">Bond Details (optional)</span>
                  <span className={`collapsible-icon ${bondDetailsOpen ? 'open' : ''}`}>▼</span>
                </button>
                {bondDetailsOpen && (
                  <div className="collapsible-content">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Face Value</label>
                        <input
                          type="number"
                          step="any"
                          name="faceValue"
                          className="form-input"
                          value={formData.faceValue}
                          onChange={handleChange}
                          placeholder="1000.00"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Maturity Date</label>
                        <input
                          type="date"
                          name="maturityDate"
                          className="form-input"
                          value={formData.maturityDate}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Coupon Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="couponRate"
                          className="form-input"
                          value={formData.couponRate}
                          onChange={handleChange}
                          placeholder="e.g. 5.00"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Coupon Frequency</label>
                        <select
                          name="couponFrequency"
                          className="form-select"
                          value={formData.couponFrequency}
                          onChange={handleChange}
                        >
                          <option value="1">Annual (1/yr)</option>
                          <option value="2">Semi-annual (2/yr)</option>
                          <option value="4">Quarterly (4/yr)</option>
                          <option value="12">Monthly (12/yr)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Investment Summary */}
            {!isCashOrSavings && investmentTotal > 0 && (
              <div className="investment-summary">
                <span className="investment-summary-label">Total Investment</span>
                <span className="investment-summary-value">
                  {formData.currency} {investmentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AddAsset;
