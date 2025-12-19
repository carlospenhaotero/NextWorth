import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { portfolioService } from '../services/portfolioService';
import Layout from '../components/Layout';
import PieChart from '../components/PieChart';
import '../styles/dashboard.css';

const Dashboard = () => {
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

  const handleDeleteAsset = async (positionId, symbol) => {
    if (!window.confirm(`Are you sure you want to delete ${symbol} from your portfolio?`)) {
      return;
    }

    try {
      await portfolioService.deleteAsset(positionId);
      // Reload portfolio after deletion
      await loadPortfolio();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error deleting asset';

      // If endpoint doesn't exist (404 or method not allowed), show info message
      if (err.response?.status === 404 || err.response?.status === 405) {
        alert('The delete endpoint is not yet available in the backend. Please contact the administrator.');
      } else {
        alert(errorMessage);
      }
      console.error('Error deleting asset:', err);
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

  // Preparar datos para la gráfica circular
  const pieChartData = useMemo(() => {
    if (!portfolio?.positions || portfolio.positions.length === 0) {
      return [];
    }

    return portfolio.positions
      .filter((pos) => pos.currentValue !== null && pos.currentValue > 0)
      .map((pos) => ({
        name: pos.symbol,
        value: pos.currentValue,
        fullName: pos.name,
      }))
      .sort((a, b) => b.value - a.value);
  }, [portfolio]);

  const totalPieValue = useMemo(() => {
    return pieChartData.reduce((sum, item) => sum + item.value, 0);
  }, [pieChartData]);

  if (loading) {
    return (
      <Layout>
        <div className="loading">
          <div>Loading portfolio...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadPortfolio} className="btn btn-primary">
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>My Portfolio</h1>
          <Link to="/add-asset" className="btn btn-primary">
            + Add Asset
          </Link>
        </div>

        {portfolio && portfolio.positions && portfolio.positions.length === 0 ? (
          <div className="empty-portfolio">
            <h2>Your portfolio is empty</h2>
            <p>Start by adding your first asset</p>
            <Link to="/add-asset" className="btn btn-primary">
              Add First Asset
            </Link>
          </div>
        ) : (
          <div className="dashboard-main">
            {/* Summary Cards */}
            <div className="summary-section">
              <div className="summary-card">
                <h3>Total Value</h3>
                <p className="summary-value">
                  {formatCurrency(portfolio?.totalCurrentValue || 0)}
                </p>
                <span className="summary-label">Base currency: {portfolio?.baseCurrency}</span>
              </div>



              <div className="summary-card">
                <h3>Profit/Loss</h3>
                <p
                  className={`summary-value ${(portfolio?.totalProfitLoss || 0) >= 0 ? 'positive' : 'negative'
                    }`}
                >
                  {formatCurrency(portfolio?.totalProfitLoss || 0)}
                </p>
                {portfolio?.totalInvested > 0 && (
                  <span className="summary-label">
                    {formatPercent(
                      ((portfolio?.totalProfitLoss || 0) / portfolio.totalInvested) * 100
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Charts Section */}
            {pieChartData.length > 0 && (
              <div className="charts-section">
                <div className="pie-chart-card">
                  <h2>Portfolio Distribution</h2>
                  <PieChart data={pieChartData} totalValue={totalPieValue} />
                </div>
              </div>
            )}

            {/* Portfolio Table */}
            <div className="portfolio-table-section">
              <div className="portfolio-table-header">
                <h2>My Positions</h2>
              </div>
              <div className="portfolio-table-container">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th className="sticky-column">Asset</th>
                      <th className="sticky-column actions-header">Actions</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Avg Price</th>
                      <th>Current Price</th>

                      <th>Current Value</th>
                      <th>Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio?.positions?.map((position) => (
                      <tr key={position.id}>
                        <td className="asset-name-cell sticky-column">
                          <div className="asset-name-wrapper">
                            <strong className="asset-symbol">{position.symbol}</strong>
                            <span className="asset-full-name">{position.name}</span>
                          </div>
                        </td>
                        <td className="actions-cell sticky-column">
                          <button
                            onClick={() => handleDeleteAsset(position.id, position.symbol)}
                            className="delete-btn"
                            title="Delete asset"
                          >
                            🗑️
                          </button>
                        </td>
                        <td>
                          <span className="asset-type-badge">{position.assetType}</span>
                        </td>
                        <td>{position.quantity.toFixed(4)}</td>
                        <td>{formatCurrency(position.avgBuyPrice)}</td>
                        <td>
                          {position.currentPrice !== null
                            ? formatCurrency(position.currentPrice)
                            : 'N/A'}
                        </td>

                        <td>
                          {position.currentValue !== null
                            ? formatCurrency(position.currentValue)
                            : 'N/A'}
                        </td>
                        <td>
                          {position.profitLoss !== null ? (
                            <span
                              className={
                                position.profitLoss >= 0 ? 'profit-positive' : 'profit-negative'
                              }
                            >
                              {formatCurrency(position.profitLoss)} ({formatPercent(position.profitLossPct)})
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
