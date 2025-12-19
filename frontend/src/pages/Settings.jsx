import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

const Settings = () => {
    const { user, updateUserCurrency } = useAuth();
    const [currency, setCurrency] = useState(user?.baseCurrency || 'EUR');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        try {
            await userService.updateCurrency(currency);
            updateUserCurrency(currency);
            setMessage({ type: 'success', text: 'Settings saved successfully' });
        } catch (error) {
            console.error('Error updating settings:', error);
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-slate-400">Customize your NextWorth experience</p>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {/* Currency Settings Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Currency Preferences</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Primary Currency
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                                This is the currency in which your total net worth will be displayed.
                            </p>

                            <div className="flex gap-4">
                                {['EUR', 'USD'].map((curr) => (
                                    <button
                                        key={curr}
                                        onClick={() => setCurrency(curr)}
                                        className={`px-6 py-3 rounded-xl border transition-all duration-200 flex items-center gap-2 ${currency === curr
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                                            }`}
                                    >
                                        <span className="font-bold">{curr}</span>
                                        <span className="text-xs opacity-70">
                                            {curr === 'EUR' ? 'Euro' : 'US Dollar'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                            <div className="flex-1">
                                {message && (
                                    <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        {message.text}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${loading
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-white text-slate-900 hover:bg-slate-200'
                                    }`}
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Save size={18} />
                                )}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
