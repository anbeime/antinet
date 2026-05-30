import React from 'react';

interface Theme {
  id: string;
  name: string;
  icon: string;
  desc: string;
  colors: string[];
}

interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeSelect: (themeId: string) => void;
}

const themes: Theme[] = [
  { 
    id: 'professional', 
    name: 'Professional', 
    icon: '💼', 
    desc: '专业商务', 
    colors: ['#1C2833', '#3498DB', '#F1C40F'] 
  },
  { 
    id: 'creative', 
    name: 'Creative', 
    icon: '🎨', 
    desc: '创意活泼', 
    colors: ['#9B59B6', '#3498DB', '#E67E22'] 
  },
  { 
    id: 'minimal', 
    name: 'Minimal', 
    icon: '✨', 
    desc: '简约现代', 
    colors: ['#2C3E50', '#95A5A6', '#3498DB'] 
  },
  { 
    id: 'tech', 
    name: 'Tech Innovation', 
    icon: '🚀', 
    desc: '科技创新', 
    colors: ['#1E3A8A', '#3B82F6', '#10B981'] 
  },
  { 
    id: 'business', 
    name: 'Business', 
    icon: '🏢', 
    desc: '高端商务', 
    colors: ['#DC2626', '#F59E0B', '#1F2937'] 
  },
];

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ selectedTheme, onThemeSelect }) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-3">选择主题</label>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onThemeSelect(theme.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTheme === theme.id
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
            }`}
          >
            <div className="text-2xl mb-2">{theme.icon}</div>
            <div className="font-medium text-sm">{theme.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{theme.desc}</div>
            <div className="flex justify-center space-x-1 mt-2">
              {theme.colors.map((color, index) => (
                <div
                  key={index}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;
