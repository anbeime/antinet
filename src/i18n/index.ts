import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import koKR from './locales/ko-KR.json';

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
  'ja-JP': { translation: jaJP },
  'ko-KR': { translation: koKR }
};

// Get saved language or default to Chinese
const getSavedLanguage = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'].includes(saved)) {
      return saved;
    }
    // Check browser language
    const browserLang = navigator.language;
    if (browserLang.startsWith('en')) return 'en-US';
    if (browserLang.startsWith('ja')) return 'ja-JP';
    if (browserLang.startsWith('ko')) return 'ko-KR';
  }
  return 'zh-CN';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;