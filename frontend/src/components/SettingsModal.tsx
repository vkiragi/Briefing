import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  refreshInterval,
  onRefreshIntervalChange,
}) => {
  const [localInterval, setLocalInterval] = useState(refreshInterval);

  useEffect(() => {
    setLocalInterval(refreshInterval);
  }, [refreshInterval]);

  if (!isOpen) return null;

  const handleSave = () => {
    onRefreshIntervalChange(localInterval);
    onClose();
  };

  const presetIntervals = [
    { label: '15 seconds', value: 15000 },
    { label: '30 seconds', value: 30000 },
    { label: '1 minute', value: 60000 },
    { label: '2 minutes', value: 120000 },
    { label: '5 minutes', value: 300000 },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Rate Limiting Disclaimer */}
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-500 mb-2">ESPN API Rate Limiting</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                This app uses ESPN's public API, which has rate limiting to prevent abuse. 
                Setting refresh rates too low (under 30 seconds) may result in temporary blocks.
              </p>
              <p className="text-sm text-accent mt-2 font-medium">
                Recommended: 30-60 seconds for optimal performance and reliability.
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Rate Setting */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Auto-Refresh Interval
            </label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {presetIntervals.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setLocalInterval(preset.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      localInterval === preset.value
                        ? "bg-accent text-background border-accent"
                        : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="10000"
                  max="600000"
                  step="1000"
                  value={localInterval / 1000}
                  onChange={(e) => setLocalInterval(Number(e.target.value) * 1000)}
                  className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                />
                <span className="text-sm text-gray-400">seconds</span>
              </div>
              <p className="text-xs text-gray-500">
                Current: {localInterval / 1000} seconds ({(localInterval / 60000).toFixed(1)} minutes)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </Card>
    </div>
  );
};

