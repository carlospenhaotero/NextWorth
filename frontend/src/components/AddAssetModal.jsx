import React, { useState, useMemo, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { portfolioService } from '../services/portfolioService';
import { useAuth } from '../context/AuthContext';

/**
 * AddAssetModal - Modal component for adding an asset to the portfolio.
 * Replicates the form from AddAsset.jsx step 3 with glassmorphism design.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Object} props.asset - The asset to add (symbol, name, assetType, currency, exchange, displaySymbol, unit)
 * @param {Function} props.onSuccess - Callback after successful asset addition
 *
 * @example
 * <AddAssetModal
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   asset={{ symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', currency: 'USD' }}
 *   onSuccess={() => navigate('/dashboard')}
 * />
 */
const AddAssetModal = ({ isOpen, onClose, asset, onSuccess }) => {
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    quantity: '',
    avgBuyPrice: '',
    currency: 'USD',
    tae: '',
    faceValue: '',
    couponRate: '',
    couponFrequency: '1',
    maturityDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bondDetailsOpen, setBondDetailsOpen] = useState(false);

  // Reset form when asset changes or modal opens
  useEffect(() => {
    if (isOpen && asset) {
      setFormData({
        quantity: '',
        avgBuyPrice: '',
        currency: asset.currency || user?.baseCurrency || 'USD',
        tae: '',
        faceValue: '',
        couponRate: '',
        couponFrequency: '1',
        maturityDate: '',
      });
      setError('');
      setSuccess(false);
      setBondDetailsOpen(false);
    }
  }, [isOpen, asset, user?.baseCurrency]);

  // Asset type helpers
  const assetTypeIcons = {
    stock: '📈',
    etf: '📊',
    crypto: '₿',
    commodity: '🥇',
    bond: '🏛️',
    cash: '💵',
    savings: '🏦',
  };

  const isCashOrSavings = asset && ['cash', 'savings'].includes(asset.assetType);
  const isBond = asset && asset.assetType === 'bond';
  const isSavings = asset && asset.assetType === 'savings';

  // Calculate investment total
  const investmentTotal = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.avgBuyPrice) || 0;
    return qty * price;
  }, [formData.quantity, formData.avgBuyPrice]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.quantity || !formData.avgBuyPrice) {
      setError('Please complete all required fields');
      setLoading(false);
      return;
    }

    try {
      await portfolioService.addAsset({
        symbol: asset.symbol.toUpperCase(),
        name: asset.name || asset.symbol.toUpperCase(),
        assetType: asset.assetType,
        currency: formData.currency,
        quantity: parseFloat(formData.quantity),
        avgBuyPrice: parseFloat(formData.avgBuyPrice),
        tae: isSavings && formData.tae ? parseFloat(formData.tae) : null,
        faceValue: isBond && formData.faceValue ? parseFloat(formData.faceValue) : null,
        couponRate: isBond && formData.couponRate ? parseFloat(formData.couponRate) : null,
        couponFrequency: isBond ? parseInt(formData.couponFrequency) : null,
        maturityDate: isBond && formData.maturityDate ? formData.maturityDate : null,
      });

      setSuccess(true);

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding asset');
    } finally {
      setLoading(false);
    }
  };

  // Handle overlay click to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render if not open or no asset
  if (!isOpen || !asset) return null;

  return (
    <div
      className="add-asset-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="add-asset-modal-content">
        {/* Modal Header */}
        <div className="add-asset-modal-header">
          <h2 id="modal-title" className="add-asset-modal-title">
            Add to Portfolio
          </h2>
          <button
            className="add-asset-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="add-asset-modal-body">
          {/* Asset Preview Card */}
          <div className="modal-asset-preview">
            <div className="modal-asset-preview-icon">
              {assetTypeIcons[asset.assetType] || '📄'}
            </div>
            <div className="modal-asset-preview-info">
              <div className="modal-asset-preview-name">{asset.name}</div>
              <div className="modal-asset-preview-symbol">
                {asset.displaySymbol || asset.symbol}
                {asset.exchange && ` - ${asset.exchange}`}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="modal-form">
            {/* Error/Success Messages */}
            {error && <div className="modal-error">{error}</div>}
            {success && (
              <div className="modal-success">
                <Check size={20} />
                Asset added successfully!
              </div>
            )}

            {/* Main Fields: Quantity + Price */}
            <div className="modal-form-row">
              <div className="modal-form-group">
                <label htmlFor="quantity" className="modal-form-label">
                  {isCashOrSavings ? 'Balance' : 'Quantity'}
                  {asset.unit && <span className="unit">({asset.unit})</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  id="quantity"
                  name="quantity"
                  className="modal-form-input"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div className="modal-form-group">
                <label htmlFor="avgBuyPrice" className="modal-form-label">
                  {isCashOrSavings ? 'Unit Price' : 'Avg Buy Price'}
                  <span className="unit">({formData.currency})</span>
                </label>
                <input
                  type="number"
                  step="any"
                  id="avgBuyPrice"
                  name="avgBuyPrice"
                  className="modal-form-input"
                  value={formData.avgBuyPrice}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  disabled={isCashOrSavings}
                />
              </div>
            </div>

            {/* Currency Selector */}
            <div className="modal-form-row">
              <div className="modal-form-group">
                <label htmlFor="currency" className="modal-form-label">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  className="modal-form-select"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              {/* TAE for Savings */}
              {isSavings && (
                <div className="modal-form-group">
                  <label htmlFor="tae" className="modal-form-label">
                    Annual Interest (TAE %)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="tae"
                    name="tae"
                    className="modal-form-input"
                    value={formData.tae}
                    onChange={handleChange}
                    placeholder="e.g. 3.50"
                  />
                </div>
              )}
            </div>

            {/* Bond Details (Collapsible) */}
            {isBond && (
              <div className="modal-collapsible">
                <button
                  type="button"
                  className="modal-collapsible-header"
                  onClick={() => setBondDetailsOpen(!bondDetailsOpen)}
                  aria-expanded={bondDetailsOpen}
                >
                  <span className="modal-collapsible-title">Bond Details (optional)</span>
                  <span className={`modal-collapsible-icon ${bondDetailsOpen ? 'open' : ''}`}>
                    &#9660;
                  </span>
                </button>
                {bondDetailsOpen && (
                  <div className="modal-collapsible-content">
                    <div className="modal-form-row">
                      <div className="modal-form-group">
                        <label htmlFor="faceValue" className="modal-form-label">
                          Face Value
                        </label>
                        <input
                          type="number"
                          step="any"
                          id="faceValue"
                          name="faceValue"
                          className="modal-form-input"
                          value={formData.faceValue}
                          onChange={handleChange}
                          placeholder="1000.00"
                        />
                      </div>
                      <div className="modal-form-group">
                        <label htmlFor="maturityDate" className="modal-form-label">
                          Maturity Date
                        </label>
                        <input
                          type="date"
                          id="maturityDate"
                          name="maturityDate"
                          className="modal-form-input"
                          value={formData.maturityDate}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="modal-form-row">
                      <div className="modal-form-group">
                        <label htmlFor="couponRate" className="modal-form-label">
                          Coupon Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="couponRate"
                          name="couponRate"
                          className="modal-form-input"
                          value={formData.couponRate}
                          onChange={handleChange}
                          placeholder="e.g. 5.00"
                        />
                      </div>
                      <div className="modal-form-group">
                        <label htmlFor="couponFrequency" className="modal-form-label">
                          Coupon Frequency
                        </label>
                        <select
                          id="couponFrequency"
                          name="couponFrequency"
                          className="modal-form-select"
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
              <div className="modal-investment-summary">
                <span className="modal-investment-summary-label">Total Investment</span>
                <span className="modal-investment-summary-value">
                  {formData.currency}{' '}
                  {investmentTotal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            {/* Form Actions */}
            <div className="modal-form-actions">
              <button
                type="button"
                onClick={onClose}
                className="modal-btn modal-btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn modal-btn-primary"
                disabled={loading || success}
              >
                {loading ? 'Saving...' : 'Add Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAssetModal;
