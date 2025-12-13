import { useState, useEffect } from 'react';
import { X, AlertCircle, LayoutGrid, Clock, Eye, RotateCcw, GripVertical } from 'lucide-react';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { useSettings, AVAILABLE_SECTIONS, SectionId } from '../context/SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    settings,
    updateRefreshInterval,
    toggleSection,
    setSectionOrder,
    togglePropTracker,
    toggleCompactMode,
    resetToDefaults,
    isSectionEnabled,
  } = useSettings();

  const [localInterval, setLocalInterval] = useState(settings.refreshInterval);
  const [activeTab, setActiveTab] = useState<'general' | 'homescreen'>('general');
  const [draggedItem, setDraggedItem] = useState<SectionId | null>(null);
  const [customSeconds, setCustomSeconds] = useState('');

  // Sync local interval when global settings change
  useEffect(() => {
    setLocalInterval(settings.refreshInterval);
  }, [settings.refreshInterval]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateRefreshInterval(localInterval);
    onClose();
  };

  const presetIntervals = [
    { label: '5 sec', value: 5000 },
    { label: '10 sec', value: 10000 },
    { label: '15 sec', value: 15000 },
    { label: '30 sec', value: 30000 },
    { label: '1 min', value: 60000 },
  ];

  const handleDragStart = (e: React.DragEvent, sectionId: SectionId) => {
    setDraggedItem(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: SectionId) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const currentOrder = [...settings.homeScreen.sectionOrder];
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedItem);
      setSectionOrder(currentOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Get ordered sections for display
  const orderedSections = settings.homeScreen.sectionOrder
    .map(id => AVAILABLE_SECTIONS.find(s => s.id === id))
    .filter(Boolean) as typeof AVAILABLE_SECTIONS[number][];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'general'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <Clock size={16} />
            General
          </button>
          <button
            onClick={() => setActiveTab('homescreen')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'homescreen'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <LayoutGrid size={16} />
            Home Screen
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Rate Limiting Disclaimer */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-500 mb-1">API Rate Limiting</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Setting refresh rates too low may result in temporary blocks.
                      <span className="text-accent ml-1 font-medium">Recommended: 30-60 seconds.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Refresh Rate Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Auto-Refresh Interval
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {presetIntervals.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setLocalInterval(preset.value);
                          setCustomSeconds('');
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                          localInterval === preset.value && !customSeconds
                            ? "bg-accent text-background border-accent"
                            : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Custom:</span>
                    <input
                      type="number"
                      min="1"
                      max="600"
                      value={customSeconds}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomSeconds(val);
                        if (val && !isNaN(parseInt(val)) && parseInt(val) >= 1) {
                          setLocalInterval(parseInt(val) * 1000);
                        }
                      }}
                      placeholder="seconds"
                      className="w-24 px-3 py-2 bg-card border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                    />
                    <span className="text-sm text-gray-500">seconds</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Current: {localInterval / 1000} seconds
                  </p>
                </div>
              </div>

              {/* Display Options */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Display Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-card border border-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <Eye size={18} className="text-gray-400" />
                      <div>
                        <span className="text-sm font-medium">Show Prop Tracker</span>
                        <p className="text-xs text-gray-500">Display live prop bet tracking on dashboard</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showPropTracker}
                      onChange={togglePropTracker}
                      className="w-5 h-5 rounded bg-background border-border text-accent focus:ring-accent focus:ring-offset-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-card border border-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <LayoutGrid size={18} className="text-gray-400" />
                      <div>
                        <span className="text-sm font-medium">Compact Mode</span>
                        <p className="text-xs text-gray-500">Show more content with smaller cards</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.compactMode}
                      onChange={toggleCompactMode}
                      className="w-5 h-5 rounded bg-background border-border text-accent focus:ring-accent focus:ring-offset-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'homescreen' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">
                Choose which sports sections to show on your home screen. Drag to reorder.
              </p>

              {/* Sports Sections */}
              <div className="space-y-2">
                {orderedSections.map((section) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center justify-between p-3 bg-card border rounded-lg transition-all cursor-move",
                      draggedItem === section.id
                        ? "border-accent opacity-50"
                        : "border-border hover:border-gray-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={18} className="text-gray-500" />
                      <span className="text-lg">{section.icon}</span>
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSectionEnabled(section.id)}
                        onChange={() => toggleSection(section.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    AVAILABLE_SECTIONS.forEach(s => {
                      if (!isSectionEnabled(s.id)) toggleSection(s.id);
                    });
                  }}
                  className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white border border-border rounded-lg hover:border-gray-600 transition-colors"
                >
                  Enable All
                </button>
                <button
                  onClick={() => {
                    AVAILABLE_SECTIONS.forEach(s => {
                      if (isSectionEnabled(s.id)) toggleSection(s.id);
                    });
                  }}
                  className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white border border-border rounded-lg hover:border-gray-600 transition-colors"
                >
                  Disable All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 mt-6 pt-6 border-t border-border flex-shrink-0">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <div className="flex gap-3">
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
        </div>
      </Card>
    </div>
  );
};
