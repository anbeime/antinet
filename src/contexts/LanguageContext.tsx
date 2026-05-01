import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '@/components/LanguageSelector';
import LanguageSelector from '@/components/LanguageSelector';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageContextType {
  currentLanguage: Language;
  changeLanguage: (code: string) => void;
  availableLanguages: Language[];
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize language from i18n
    const lang = languages.find(l => l.code === i18n.language) || languages[0];
    setCurrentLanguage(lang);
    setIsLoading(false);

    // Listen for language changes from i18n
    const handleLanguageChange = () => {
      const lang = languages.find(l => l.code === i18n.language) || languages[0];
      setCurrentLanguage(lang);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = useCallback((code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    const lang = languages.find(l => l.code === code) || languages[0];
    setCurrentLanguage(lang);
    // Dispatch custom event for non-React components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: code } }));
  }, [i18n]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        availableLanguages: languages,
        isLoading
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Re-export LanguageSelector for convenience
export { LanguageSelector };