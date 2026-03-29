"use client";

import { useState, useTransition } from "react";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { updateBaseCurrency } from "@/actions/settings";

const CURRENCIES = [
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "US Dollar" },
  { code: "GBP", label: "British Pound" },
];

interface SettingsFormProps {
  currentCurrency: string;
}

export function SettingsForm({ currentCurrency }: SettingsFormProps) {
  const [currency, setCurrency] = useState(currentCurrency);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateBaseCurrency(currency);
        setMessage({ type: "success", text: "Settings saved successfully" });
      } catch {
        setMessage({ type: "error", text: "Error saving settings" });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="glass-card">
        <h2 className="text-xl font-semibold text-white mb-4">
          Currency Preferences
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Primary Currency
            </label>
            <p className="text-xs text-slate-500 mb-3">
              This is the currency in which your total net worth will be
              displayed.
            </p>

            <div className="flex gap-4">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => setCurrency(curr.code)}
                  className={`px-6 py-3 rounded-xl border transition-all duration-200 flex items-center gap-2 ${
                    currency === curr.code
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="font-bold">{curr.code}</span>
                  <span className="text-xs opacity-70">{curr.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex-1">
              {message && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    message.type === "success"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  {message.text}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={isPending}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                isPending
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-white text-slate-900 hover:bg-slate-200"
              }`}
            >
              {isPending ? (
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
  );
}
