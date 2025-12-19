import React, { useState, useEffect, useMemo } from 'react';
import { portfolioService } from '../services/portfolioService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DashboardBento = () => {
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            setLoading(true);
            const data = await portfolioService.getPortfolio();
            setPortfolio(data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Error loading portfolio');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: portfolio?.baseCurrency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatPercent = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const chartData = useMemo(() => {
        if (!portfolio?.positions) return [];
        return portfolio.positions
            .filter(p => p.currentValue > 0)
            .map(p => ({
                name: p.name || p.symbol,
                value: p.currentValue,
                fill: '#3b82f6' // Default color, will be overridden
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 assets
    }, [portfolio]);

    const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

    if (loading) return <div className="p-8 text-white">Loading dashboard...</div>;
    if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

    const totalValue = portfolio?.totalCurrentValue || 0;
    const totalProfit = portfolio?.totalProfitLoss || 0;
    const isProfit = totalProfit >= 0;

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
                <p className="text-slate-400">Welcome back, here's your financial overview.</p>
            </header>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Net Worth Card - Large */}
                <div className="col-span-1 md:col-span-2 glass-card relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={120} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-slate-400 font-medium mb-1 flex items-center gap-2">
                            <DollarSign size={18} /> Total Net Worth
                        </h3>
                        <div className="text-5xl font-bold text-white mb-4 tracking-tight">
                            {formatCurrency(totalValue)}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${isProfit ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {formatCurrency(totalProfit)}
                            </div>
                            <span className="text-slate-500 text-sm">Total Profit/Loss</span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats / Earnings Card */}
                <div className="col-span-1 glass-card flex flex-col justify-center">
                    <h3 className="text-slate-400 font-medium mb-4">Performance</h3>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-sm text-slate-500">Total Invested</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(portfolio?.totalInvested)}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                            <Wallet size={20} className="text-blue-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Return</p>
                            <p className={`text-xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                {formatPercent((totalProfit / (portfolio?.totalInvested || 1)) * 100)}
                            </p>
                        </div>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isProfit ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {isProfit ? <ArrowUpRight size={20} className="text-green-400" /> : <ArrowDownRight size={20} className="text-red-400" />}
                        </div>
                    </div>
                </div>

                {/* Chart Card - Compact */}
                <div className="col-span-1 glass-card min-h-[300px] flex flex-col">
                    <h3 className="text-slate-400 font-medium mb-2">Allocation</h3>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.75rem' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-xs text-slate-500">Total</p>
                                <p className="text-sm font-bold text-white">{formatCurrency(totalValue)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Movers - Wide */}
                <div className="col-span-1 md:col-span-2 glass-card">
                    <h3 className="text-slate-400 font-medium mb-4">Top Movers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {portfolio?.positions
                            ?.sort((a, b) => Math.abs(b.profitLossPct) - Math.abs(a.profitLossPct))
                            .slice(0, 6)
                            .map((pos) => (
                                <div key={pos.id} className="flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                                            {(pos.name || pos.symbol).substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white truncate max-w-[120px]">{pos.name || pos.symbol}</p>
                                            <p className="text-xs text-slate-500">{formatCurrency(pos.currentPrice)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold ${pos.profitLossPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatPercent(pos.profitLossPct)}
                                        </div>
                                        <div className={`text-xs ${pos.profitLoss >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                                            {formatCurrency(pos.profitLoss)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardBento;
