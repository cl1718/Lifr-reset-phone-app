// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState } from 'react';

type Lang = 'zh-TW' | 'en';
const LanguageContext = createContext({
  lang: 'zh-TW' as Lang,
  setLang: (l: Lang) => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Lang>('zh-TW');
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);