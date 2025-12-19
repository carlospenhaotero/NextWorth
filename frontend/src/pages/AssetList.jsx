import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioService } from '../services/portfolioService';
import '../styles/assetList.css';

const AssetList = () => {
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            setLoading(true);
            const data = await portfolioService.getPortfolio();
            setPortfolio(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, symbol) => {
        if (!window.confirm(`Are you sure you want to delete ${symbol}?`)) return;
        try {
            await portfolioService.deleteAsset(id);
            loadPortfolio();
        } catch (err) {
            alert('Error deleting asset');
        }
    };

    // Formatear moneda
    const formatCurrency = (value, showSign = false) => {
        if (value === null || value === undefined) return 'N/A';
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: portfolio?.baseCurrency || 'USD',
            minimumFractionDigits: 2,
        }).format(Math.abs(value));

        if (showSign && value !== 0) {
            return value >= 0 ? `+${formatted}` : `-${formatted}`;
        }
        return formatted;
    };

    // Obtener icono por tipo de activo
    const getAssetIcon = (type) => {
        const icons = {
            stock: '📈',
            etf: '📊',
            crypto: '₿',
            commodity: '🥇',
            bond: '🏛️',
            cash: '💵',
            savings: '🏦',
        };
        return icons[type] || '📄';
    };

    // Contar activos por tipo
    const assetCounts = useMemo(() => {
        if (!portfolio?.positions) return {};
        return portfolio.positions.reduce((acc, pos) => {
            acc[pos.assetType] = (acc[pos.assetType] || 0) + 1;
            return acc;
        }, {});
    }, [portfolio]);

    // Tipos de filtros disponibles
    const filterOptions = useMemo(() => {
        const types = [
            { value: 'all', label: 'All', icon: '🔥' },
            { value: 'stock', label: 'Stocks', icon: '📈' },
            { value: 'etf', label: 'ETFs', icon: '📊' },
            { value: 'crypto', label: 'Crypto', icon: '₿' },
            { value: 'commodity', label: 'Commodities', icon: '🥇' },
            { value: 'bond', label: 'Bonds', icon: '🏛️' },
            { value: 'cash', label: 'Cash', icon: '💵' },
            { value: 'savings', label: 'Savings', icon: '🏦' },
        ];
        // Solo mostrar filtros que tienen al menos un activo (excepto 'all')
        return types.filter(t => t.value === 'all' || assetCounts[t.value] > 0);
    }, [assetCounts]);

    // Filtrar posiciones
    const filteredPositions = useMemo(() => {
        if (!portfolio?.positions) return [];

        return portfolio.positions.filter(pos => {
            const matchesSearch =
                pos.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pos.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = activeFilter === 'all' || pos.assetType === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [portfolio, searchTerm, activeFilter]);

    // Estadísticas
    const stats = useMemo(() => {
        if (!portfolio) return null;

        const gainers = portfolio.positions?.filter(p => p.profitLoss > 0).length || 0;
        const losers = portfolio.positions?.filter(p => p.profitLoss < 0).length || 0;

        return {
            totalAssets: portfolio.positions?.length || 0,
            totalValue: portfolio.totalCurrentValue || 0,
            totalPL: portfolio.totalProfitLoss || 0,
            totalPLPct: portfolio.totalInvested > 0
                ? ((portfolio.totalProfitLoss / portfolio.totalInvested) * 100)
                : 0,
            gainers,
            losers,
        };
    }, [portfolio]);

    // Loading state
    if (loading) {
        return (
            <div className="assets-page">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading your assets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="assets-page">
            {/* Header */}
            <div className="assets-header">
                <div className="assets-header-top">
                    <div>
                        <h1 className="assets-title">My Assets</h1>
                        <p className="assets-subtitle">Track and manage your portfolio holdings</p>
                    </div>
                </div>

                {/* Stats Row */}
                {stats && (
                    <div className="stats-row">
                        <div className="stat-card">
                            <div className="stat-label">Total Assets</div>
                            <div className="stat-value">{stats.totalAssets}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Portfolio Value</div>
                            <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Total P/L</div>
                            <div className={`stat-value ${stats.totalPL >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(stats.totalPL, true)}
                            </div>
                            <div className={`stat-change ${stats.totalPLPct >= 0 ? 'positive' : 'negative'}`}>
                                {stats.totalPLPct >= 0 ? '↑' : '↓'} {Math.abs(stats.totalPLPct).toFixed(2)}%
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Performance</div>
                            <div className="stat-value">
                                <span style={{ color: '#10b981' }}>{stats.gainers}</span>
                                {' / '}
                                <span style={{ color: '#ef4444' }}>{stats.losers}</span>
                            </div>
                            <div className="stat-change" style={{ color: 'var(--text-secondary)' }}>
                                gainers / losers
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div className="assets-toolbar">
                {/* Search */}
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter Chips */}
                <div className="filter-chips">
                    {filterOptions.map(filter => (
                        <button
                            key={filter.value}
                            className={`filter-chip ${activeFilter === filter.value ? 'active' : ''}`}
                            onClick={() => setActiveFilter(filter.value)}
                        >
                            <span className="filter-chip-icon">{filter.icon}</span>
                            {filter.label}
                            {filter.value !== 'all' && assetCounts[filter.value] && (
                                <span className="filter-chip-count">{assetCounts[filter.value]}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                <div className="view-toggle">
                    <button
                        className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                        onClick={() => setViewMode('cards')}
                        title="Card view"
                    >
                        ▦
                    </button>
                    <button
                        className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => setViewMode('table')}
                        title="Table view"
                    >
                        ≡
                    </button>
                </div>
            </div>

            {/* Content */}
            {filteredPositions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3 className="empty-state-title">
                        {searchTerm || activeFilter !== 'all'
                            ? 'No assets match your filters'
                            : 'No assets yet'}
                    </h3>
                    <p className="empty-state-description">
                        {searchTerm || activeFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Start building your portfolio by adding your first asset'}
                    </p>
                    {!searchTerm && activeFilter === 'all' && (
                        <button
                            className="empty-state-btn"
                            onClick={() => navigate('/add-asset')}
                        >
                            + Add Asset
                        </button>
                    )}
                </div>
            ) : viewMode === 'cards' ? (
                /* Card View */
                <div className="assets-grid">
                    {filteredPositions.map((pos) => (
                        <div key={pos.id} className="asset-card">
                            <button
                                className="asset-delete-btn"
                                onClick={() => handleDelete(pos.id, pos.symbol)}
                                title="Delete asset"
                            >
                                🗑️
                            </button>

                            <div className="asset-card-header">
                                <div className="asset-info">
                                    <div className={`asset-icon ${pos.assetType}`}>
                                        {getAssetIcon(pos.assetType)}
                                    </div>
                                    <div className="asset-details">
                                        <div className="asset-name">{pos.name || pos.symbol}</div>
                                        <div className="asset-symbol">{pos.symbol}</div>
                                    </div>
                                </div>
                                <span className="asset-type-badge">{pos.assetType}</span>
                            </div>

                            <div className="asset-card-body">
                                <div className="asset-metric">
                                    <span className="asset-metric-label">Quantity</span>
                                    <span className="asset-metric-value">
                                        {pos.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                                    </span>
                                </div>
                                <div className="asset-metric">
                                    <span className="asset-metric-label">Avg Price</span>
                                    <span className="asset-metric-value">{formatCurrency(pos.avgBuyPrice)}</span>
                                </div>
                                <div className="asset-metric">
                                    <span className="asset-metric-label">Current Price</span>
                                    <span className="asset-metric-value">{formatCurrency(pos.currentPrice)}</span>
                                </div>
                                <div className="asset-metric">
                                    <span className="asset-metric-label">Currency</span>
                                    <span className="asset-metric-value">{pos.assetCurrency}</span>
                                </div>
                            </div>

                            <div className="asset-card-footer">
                                <div className="asset-value-section">
                                    <span className="asset-value-label">Current Value</span>
                                    <span className="asset-value">{formatCurrency(pos.currentValue)}</span>
                                </div>
                                <div className="asset-pl-section">
                                    <span className={`asset-pl ${pos.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                                        {formatCurrency(pos.profitLoss, true)}
                                    </span>
                                    <span className={`asset-pl-pct ${pos.profitLossPct >= 0 ? 'positive' : 'negative'}`}>
                                        {pos.profitLossPct >= 0 ? '↑' : '↓'} {Math.abs(pos.profitLossPct || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="assets-table-wrapper">
                    <table className="assets-table">
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Type</th>
                                <th className="text-right">Quantity</th>
                                <th className="text-right">Avg Price</th>
                                <th className="text-right">Current Price</th>
                                <th className="text-right">Value</th>
                                <th className="text-right">P/L</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPositions.map((pos) => (
                                <tr key={pos.id}>
                                    <td>
                                        <div className="table-asset-info">
                                            <div className={`table-asset-icon ${pos.assetType}`}>
                                                {getAssetIcon(pos.assetType)}
                                            </div>
                                            <div className="table-asset-details">
                                                <span className="table-asset-name">{pos.name || pos.symbol}</span>
                                                <span className="table-asset-symbol">{pos.symbol}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="table-type-badge">{pos.assetType}</span>
                                    </td>
                                    <td className="text-right">
                                        {pos.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                                    </td>
                                    <td className="text-right">{formatCurrency(pos.avgBuyPrice)}</td>
                                    <td className="text-right">{formatCurrency(pos.currentPrice)}</td>
                                    <td className="text-right table-value">{formatCurrency(pos.currentValue)}</td>
                                    <td className={`text-right table-pl ${pos.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                                        {formatCurrency(pos.profitLoss, true)}
                                        <span className="table-pl-pct">
                                            ({pos.profitLossPct >= 0 ? '+' : ''}{(pos.profitLossPct || 0).toFixed(2)}%)
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <button
                                            className="table-delete-btn"
                                            onClick={() => handleDelete(pos.id, pos.symbol)}
                                            title="Delete asset"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AssetList;
