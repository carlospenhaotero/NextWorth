import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { assetService } from '../services/assetService';
import AddAssetModal from '../components/AddAssetModal';
import '../styles/searchAssets.css';

/**
 * SearchAssets - Page for browsing and searching public assets to add to portfolio.
 * Displays a grid of asset cards with search and category filtering.
 * Opens a modal to add selected assets to the portfolio.
 *
 * Route: /search-assets (wrapped in Layout by App.jsx)
 *
 * Features:
 * - Loads all popular assets (stocks, crypto, ETFs, commodities, bonds)
 * - Search with 300ms debounce (filters by symbol and name)
 * - Category filter chips (All, Stocks, Crypto, ETFs, Commodities, Bonds)
 * - Responsive grid (4 cols desktop, 3 tablet, 2 small tablet, 1 mobile)
 * - AddAssetModal for adding selected asset to portfolio
 */
const SearchAssets = () => {
  // State for all assets loaded from service
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Category filter options
  const categories = [
    { value: 'all', label: 'All', icon: '🌐' },
    { value: 'stock', label: 'Stocks', icon: '📈' },
    { value: 'crypto', label: 'Crypto', icon: '₿' },
    { value: 'etf', label: 'ETFs', icon: '📊' },
    { value: 'commodity', label: 'Commodities', icon: '🥇' },
    { value: 'bond', label: 'Bonds', icon: '🏛️' },
  ];

  // Load all assets on mount
  useEffect(() => {
    const loadAllAssets = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const [stocks, cryptos, etfs, commodities, bonds] = await Promise.all([
          assetService.getPopularStocks(),
          assetService.getPopularCryptos(),
          assetService.getPopularEtfs(),
          assetService.getPopularCommodities(),
          assetService.getPopularBonds(),
        ]);

        // Combine all assets with assetType property
        const combined = [
          ...stocks.map((a) => ({ ...a, assetType: 'stock' })),
          ...cryptos.map((a) => ({ ...a, assetType: 'crypto' })),
          ...etfs.map((a) => ({ ...a, assetType: 'etf' })),
          ...commodities.map((a) => ({ ...a, assetType: 'commodity' })),
          ...bonds.map((a) => ({ ...a, assetType: 'bond' })),
        ];

        setAllAssets(combined);
      } catch (err) {
        console.error('Error loading assets:', err);
        setLoadError('Failed to load assets. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadAllAssets();
  }, []);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter assets based on search query and category
  const filteredAssets = useMemo(() => {
    let result = allAssets;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((asset) => asset.assetType === selectedCategory);
    }

    // Filter by search query (case-insensitive match on symbol, displaySymbol, or name)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query) ||
          (asset.displaySymbol && asset.displaySymbol.toLowerCase().includes(query))
      );
    }

    return result;
  }, [allAssets, selectedCategory, debouncedSearch]);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle category chip click
  const handleCategoryClick = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  // Handle add button click on asset card
  const handleAddClick = useCallback((asset) => {
    setSelectedAsset(asset);
    setModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedAsset(null);
  }, []);

  // Handle successful asset addition
  const handleAddSuccess = useCallback(() => {
    // Optionally refresh data or show a toast notification
    // For now, the modal handles the success message internally
  }, []);

  // Get asset type label for badge
  const getAssetTypeLabel = (type) => {
    const category = categories.find((c) => c.value === type);
    return category?.label?.replace(/s$/, '') || type;
  };

  return (
    <div className="search-assets">
      {/* Header */}
      <div className="search-assets-header">
        <h1>Search Assets</h1>
        <p className="search-assets-subtitle">
          Browse and add stocks, crypto, ETFs, commodities, and bonds to your portfolio
        </p>
      </div>

      {/* Search Bar */}
      <div className="search-assets-search-container">
        <div className="search-assets-search-wrapper">
          <Search className="search-assets-search-icon" size={22} />
          <input
            type="text"
            className="search-assets-search-input"
            placeholder="Search by symbol or name..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search assets"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="search-assets-filters" role="group" aria-label="Filter by category">
        {categories.map((category) => (
          <button
            key={category.value}
            className={`search-assets-filter-chip ${
              selectedCategory === category.value ? 'active' : ''
            }`}
            onClick={() => handleCategoryClick(category.value)}
            aria-pressed={selectedCategory === category.value}
          >
            <span className="search-assets-filter-chip-icon">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Results Info */}
      {!loading && !loadError && (
        <div className="search-assets-results-info">
          Showing <span className="search-assets-results-count">{filteredAssets.length}</span>{' '}
          {filteredAssets.length === 1 ? 'asset' : 'assets'}
          {debouncedSearch && ` matching "${debouncedSearch}"`}
          {selectedCategory !== 'all' &&
            ` in ${categories.find((c) => c.value === selectedCategory)?.label}`}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="search-assets-loading">
          <div className="search-assets-loading-spinner" />
          <p>Loading assets...</p>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="search-assets-empty">
          <div className="search-assets-empty-icon">&#9888;</div>
          <h3>Error Loading Assets</h3>
          <p>{loadError}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !loadError && filteredAssets.length === 0 && (
        <div className="search-assets-empty">
          <div className="search-assets-empty-icon">&#128270;</div>
          <h3>No assets found</h3>
          <p>
            {debouncedSearch
              ? `No assets match "${debouncedSearch}". Try a different search term.`
              : 'No assets available in this category.'}
          </p>
        </div>
      )}

      {/* Asset Cards Grid */}
      {!loading && !loadError && filteredAssets.length > 0 && (
        <div className="search-assets-grid">
          {filteredAssets.map((asset, index) => (
            <div key={`${asset.symbol}-${index}`} className="search-asset-card">
              <div className="search-asset-card-header">
                <div className="search-asset-card-info">
                  <div className="search-asset-card-symbol">
                    {asset.displaySymbol || asset.symbol}
                  </div>
                  <div className="search-asset-card-name" title={asset.name}>
                    {asset.name}
                  </div>
                </div>
                <span className={`search-asset-card-type-badge ${asset.assetType}`}>
                  {getAssetTypeLabel(asset.assetType)}
                </span>
              </div>

              {asset.exchange && (
                <div className="search-asset-card-exchange">{asset.exchange}</div>
              )}

              <button
                className="search-asset-card-add-btn"
                onClick={() => handleAddClick(asset)}
                aria-label={`Add ${asset.name} to portfolio`}
              >
                <Plus size={16} />
                Add to Portfolio
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        asset={selectedAsset}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default SearchAssets;
