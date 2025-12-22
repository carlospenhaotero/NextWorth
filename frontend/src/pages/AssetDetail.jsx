import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { ArrowLeft, RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { getAssetHistory } from '../services/assetService';
import { portfolioService } from '../services/portfolioService';

/**
 * AssetDetail page - Displays historical price chart for an asset.
 * Accessed via /assets/:symbol route.
 * Expects asset metadata passed via React Router location.state or fetches by symbol.
 *
 * @example Route usage:
 * navigate(`/assets/${encodeURIComponent(pos.symbol)}`, {
 *   state: { asset: { id, symbol, name, assetType, currency } }
 * });
 */
const AssetDetail = () => {
    const { symbol } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Asset metadata from navigation state (passed from AssetList)
    const assetFromState = location.state?.asset;

    // Check if this is a cash/savings/bond asset (no price history)
    const isNonPricedAsset = assetFromState && ['cash', 'savings', 'bond'].includes(assetFromState.assetType);

    // State
    const [historyData, setHistoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRange, setSelectedRange] = useState('24m');

    // Range options for the chart
    const rangeOptions = [
        { value: '6m', label: '6M' },
        { value: '12m', label: '1Y' },
        { value: '24m', label: '2Y' },
        { value: '60m', label: '5Y' }
    ];

    /**
     * Fetches historical price data from backend
     */
    const fetchHistory = useCallback(async () => {
        if (!symbol) return;

        setLoading(true);
        setError(null);

        try {
            const decodedSymbol = decodeURIComponent(symbol);
            const data = await getAssetHistory(decodedSymbol, {
                range: selectedRange,
                interval: '1mo'
            });
            setHistoryData(data);
        } catch (err) {
            console.error('Error fetching asset history:', err);
            const message = err.response?.data?.error
                || err.message
                || 'Failed to load price history';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [symbol, selectedRange]);

    // Fetch data on mount and when range changes (skip for cash/savings)
    useEffect(() => {
        if (!isNonPricedAsset) {
            fetchHistory();
        } else {
            setLoading(false);
        }
    }, [fetchHistory, isNonPricedAsset]);

    /**
     * Transform series data for recharts with memoization
     */
    const chartData = useMemo(() => {
        if (!historyData?.series || historyData.series.length === 0) {
            return [];
        }

        return historyData.series.map((point) => ({
            date: new Date(point.date).toLocaleDateString('en-US', {
                month: 'short',
                year: '2-digit'
            }),
            fullDate: new Date(point.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }),
            close: point.close,
            open: point.open,
            high: point.high,
            low: point.low,
            volume: point.volume,
            timestamp: point.timestamp
        }));
    }, [historyData]);

    /**
     * Calculate price statistics with memoization
     */
    const priceStats = useMemo(() => {
        if (chartData.length === 0) return null;

        const closes = chartData.map(d => d.close).filter(c => c != null);
        if (closes.length === 0) return null;

        const currentPrice = closes[closes.length - 1];
        const startPrice = closes[0];
        const minPrice = Math.min(...closes);
        const maxPrice = Math.max(...closes);
        const priceChange = currentPrice - startPrice;
        const priceChangePercent = ((priceChange / startPrice) * 100);

        return {
            currentPrice,
            startPrice,
            minPrice,
            maxPrice,
            priceChange,
            priceChangePercent,
            isPositive: priceChange >= 0
        };
    }, [chartData]);

    /**
     * Format currency value
     */
    const formatCurrency = useCallback((value, compact = false) => {
        if (value == null) return 'N/A';
        const currency = historyData?.currency || assetFromState?.currency || 'USD';

        if (compact && Math.abs(value) >= 1000000) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                notation: 'compact',
                maximumFractionDigits: 2
            }).format(value);
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }, [historyData?.currency, assetFromState?.currency]);

    /**
     * Format volume
     */
    const formatVolume = useCallback((value) => {
        if (value == null) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(value);
    }, []);

    /**
     * Navigate back to portfolio
     */
    const handleGoBack = useCallback(() => {
        navigate('/assets');
    }, [navigate]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
            handleGoBack();
        }
    }, [handleGoBack]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    /**
     * Custom tooltip component for the chart
     */
    const CustomTooltip = useCallback(({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;

        const data = payload[0].payload;

        return (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
                <p className="text-slate-300 text-sm font-medium mb-2">{data.fullDate}</p>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Close:</span>
                        <span className="text-white font-medium">{formatCurrency(data.close)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Open:</span>
                        <span className="text-slate-300">{formatCurrency(data.open)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">High:</span>
                        <span className="text-green-400">{formatCurrency(data.high)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Low:</span>
                        <span className="text-red-400">{formatCurrency(data.low)}</span>
                    </div>
                    {data.volume != null && (
                        <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
                            <span className="text-slate-400">Volume:</span>
                            <span className="text-slate-300">{formatVolume(data.volume)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [formatCurrency, formatVolume]);

    /**
     * Get asset type badge color
     */
    const getAssetTypeBadgeClass = (type) => {
        const typeClasses = {
            stock: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            crypto: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            etf: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            commodity: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            bond: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
            cash: 'bg-green-500/20 text-green-400 border-green-500/30',
            savings: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
        };
        return typeClasses[type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    };

    /**
     * Get personalized message for assets without price charts
     */
    const getNoChartMessage = (assetType) => {
        const messages = {
            cash: {
                icon: '💵',
                title: 'Price History Not Available',
                description: 'Cash accounts maintain a constant value of 1.00 per unit in their native currency. Historical price charts are not applicable for cash holdings.',
                showTae: false
            },
            savings: {
                icon: '🏦',
                title: 'Fixed Return Investment',
                description: 'Savings accounts have a fixed annual return (TAE) and do not trade on markets. The value remains constant based on your deposit.',
                showTae: true
            },
            bond: {
                icon: '🏛️',
                title: 'Fixed Income Asset',
                description: 'You purchased this bond at a fixed yield (TAE). Market price fluctuations don\'t affect your guaranteed return if held to maturity.',
                showTae: true
            }
        };
        return messages[assetType] || messages.cash;
    };

    /**
     * Inline TAE editor component
     * Shows current TAE and allows editing with save/cancel
     */
    const TaeEditor = ({ assetId, currentTae, onUpdate }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [taeValue, setTaeValue] = useState(currentTae || '');
        const [isSaving, setIsSaving] = useState(false);
        const [error, setError] = useState(null);

        const handleSave = async () => {
            // Validación
            const numTae = parseFloat(taeValue);
            if (isNaN(numTae) || numTae < 0 || numTae > 100) {
                setError('TAE must be between 0 and 100');
                return;
            }

            setIsSaving(true);
            setError(null);

            try {
                await onUpdate(assetId, numTae);
                setIsEditing(false);
            } catch (err) {
                setError('Failed to update TAE');
            } finally {
                setIsSaving(false);
            }
        };

        const handleCancel = () => {
            setTaeValue(currentTae || '');
            setIsEditing(false);
            setError(null);
        };

        return (
            <div className="w-full max-w-sm bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                        Annual Return (TAE %)
                    </label>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                        >
                            <span>✏️</span> Edit
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-3">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={taeValue}
                            onChange={(e) => setTaeValue(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. 3.50"
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-400 text-sm">{error}</p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-4xl font-bold text-white">
                            {currentTae ? `${currentTae}%` : 'Not set'}
                        </p>
                        {!currentTae && (
                            <p className="text-slate-500 text-sm mt-1">Click edit to set TAE</p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    /**
     * Updates TAE for bond/savings asset using the new PATCH endpoint
     */
    const handleTaeUpdate = useCallback(async (assetId, newTae) => {
        if (!assetFromState) return;

        try {
            await portfolioService.updateTae(assetId, newTae);

            // Update local state to reflect change immediately
            if (location.state?.asset) {
                location.state.asset.tae = newTae;
            }

        } catch (err) {
            console.error('Error updating TAE:', err);
            throw err;
        }
    }, [assetFromState, location]);

    // Decode symbol for display
    const displaySymbol = decodeURIComponent(symbol || '');
    const assetName = assetFromState?.name || displaySymbol;
    const assetType = assetFromState?.assetType || 'stock';
    const assetCurrency = historyData?.currency || assetFromState?.currency || 'USD';

    // Cash/Savings/Bond info state - no price history available
    if (isNonPricedAsset) {
        const messageConfig = getNoChartMessage(assetType);

        return (
            <div className="space-y-6">
                {/* Header with back button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleGoBack}
                        className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                        aria-label="Go back to portfolio (Escape key)"
                        title="Go back (Esc)"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                {displaySymbol}
                            </h1>
                            <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-md border ${getAssetTypeBadgeClass(assetType)}`}>
                                {assetType}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm sm:text-base">{assetName}</p>
                    </div>
                </div>

                {/* Info message with TAE editor */}
                <div className="max-w-2xl mx-auto mt-12">
                    <div className="glass-card">
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="text-7xl mb-6">{messageConfig.icon}</div>
                            <h2 className="text-2xl font-semibold text-white mb-3">
                                {messageConfig.title}
                            </h2>
                            <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
                                {messageConfig.description}
                            </p>

                            {/* TAE Section - Solo para bond y savings */}
                            {messageConfig.showTae && (
                                <div className="mb-8">
                                    <TaeEditor
                                        assetId={assetFromState.id}
                                        currentTae={assetFromState.tae}
                                        onUpdate={handleTaeUpdate}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleGoBack}
                                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                Back to Portfolio
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Header skeleton */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg"></div>
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-slate-800 rounded"></div>
                        <div className="h-4 w-32 bg-slate-800 rounded"></div>
                    </div>
                </div>
                {/* Chart skeleton */}
                <div className="glass-card">
                    <div className="h-[400px] bg-slate-800/50 rounded-xl flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
                            <p className="text-slate-500">Loading price history...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                {/* Header with back button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleGoBack}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Go back to portfolio"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{displaySymbol}</h1>
                        <p className="text-slate-400">{assetName}</p>
                    </div>
                </div>

                {/* Error card */}
                <div className="glass-card">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Unable to Load Price History
                        </h3>
                        <p className="text-slate-400 mb-6 max-w-md">{error}</p>
                        <button
                            onClick={fetchHistory}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Empty data state
    if (!chartData || chartData.length === 0) {
        return (
            <div className="space-y-6">
                {/* Header with back button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleGoBack}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Go back to portfolio"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{displaySymbol}</h1>
                        <p className="text-slate-400">{assetName}</p>
                    </div>
                </div>

                {/* Empty state card */}
                <div className="glass-card">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-5xl mb-4 opacity-50">📊</div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            No Historical Data Available
                        </h3>
                        <p className="text-slate-400 max-w-md">
                            Price history for this asset is not available at the moment.
                            This may be due to the asset being recently added or limited market data.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Success state - render chart
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleGoBack}
                        className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                        aria-label="Go back to portfolio (Escape key)"
                        title="Go back (Esc)"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                {displaySymbol}
                            </h1>
                            <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-md border ${getAssetTypeBadgeClass(assetType)}`}>
                                {assetType}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm sm:text-base">{assetName}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                                {assetCurrency}
                            </span>
                            {historyData?.source === 'stale' && (
                                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    Data may be outdated
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Price stats on right */}
                {priceStats && (
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-right">
                            <p className="text-2xl sm:text-3xl font-bold text-white">
                                {formatCurrency(priceStats.currentPrice)}
                            </p>
                            <div className={`flex items-center justify-end gap-1 ${priceStats.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {priceStats.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                <span className="font-medium">
                                    {priceStats.isPositive ? '+' : ''}{formatCurrency(priceStats.priceChange)}
                                </span>
                                <span className="text-sm">
                                    ({priceStats.isPositive ? '+' : ''}{priceStats.priceChangePercent.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Range Selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 mr-2">Period:</span>
                {rangeOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setSelectedRange(option.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            selectedRange === option.value
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 border border-transparent'
                        }`}
                        aria-pressed={selectedRange === option.value}
                    >
                        {option.label}
                    </button>
                ))}
                <button
                    onClick={fetchHistory}
                    className="ml-auto p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Refresh data"
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Chart Card */}
            <div
                className="glass-card"
                role="img"
                aria-label={`Price chart for ${displaySymbol} showing ${selectedRange} of monthly data. Current price: ${formatCurrency(priceStats?.currentPrice)}`}
            >
                <div className="h-[350px] sm:h-[400px] md:h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor={priceStats?.isPositive ? '#10b981' : '#ef4444'}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={priceStats?.isPositive ? '#10b981' : '#ef4444'}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.05)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                dy={10}
                                interval="preserveStartEnd"
                                minTickGap={50}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(value) => formatCurrency(value, true)}
                                width={80}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="close"
                                stroke={priceStats?.isPositive ? '#10b981' : '#ef4444'}
                                strokeWidth={2}
                                fill="url(#colorPrice)"
                                dot={false}
                                activeDot={{
                                    r: 6,
                                    fill: priceStats?.isPositive ? '#10b981' : '#ef4444',
                                    stroke: '#1e293b',
                                    strokeWidth: 2
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Price Statistics Cards */}
            {priceStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="glass-card py-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Period High</p>
                        <p className="text-lg font-bold text-green-400">
                            {formatCurrency(priceStats.maxPrice)}
                        </p>
                    </div>
                    <div className="glass-card py-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Period Low</p>
                        <p className="text-lg font-bold text-red-400">
                            {formatCurrency(priceStats.minPrice)}
                        </p>
                    </div>
                    <div className="glass-card py-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Start Price</p>
                        <p className="text-lg font-bold text-white">
                            {formatCurrency(priceStats.startPrice)}
                        </p>
                    </div>
                    <div className="glass-card py-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Data Points</p>
                        <p className="text-lg font-bold text-white">
                            {chartData.length}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetDetail;
