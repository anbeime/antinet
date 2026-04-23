import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' }
];

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
        <Globe className="w-4 h-4" />
        <span className="text-sm">{currentLang.flag} {currentLang.name}</span>
      </button>
      <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
              i18n.language === lang.code ? 'text-blue-400' : 'text-gray-300'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;