import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

export const languages = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' }
];

// Custom hook for language management
export const useLanguage = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = useCallback((langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    // Dispatch custom event for components that need to react to language change
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: langCode } }));
  }, [i18n]);

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  return {
    currentLanguage,
    changeLanguage,
    availableLanguages: languages
  };
};

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(languages[0]);

  useEffect(() => {
    // Sync current language with i18n state
    const lang = languages.find(l => l.code === i18n.language) || languages[0];
    setCurrentLang(lang);
    
    // Listen for external language changes
    const handleLanguageChange = (e: CustomEvent) => {
      const lang = languages.find(l => l.code === e.detail.language) || languages[0];
      setCurrentLang(lang);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, [i18n.language]);

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: langCode } }));
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.language-selector')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative language-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" />
        <span>{currentLang.flag}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors ${
                i18n.language === lang.code ? 'text-blue-400 bg-blue-900/20' : 'text-gray-300'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;