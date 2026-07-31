import fs from 'fs';
import path from 'path';

type LocaleData = Record<string, string>;

const locales: Record<string, LocaleData> = {};

export function loadLocales() {
  const uzPath = path.resolve(__dirname, 'uz.json');
  if (fs.existsSync(uzPath)) {
    locales['uz'] = JSON.parse(fs.readFileSync(uzPath, 'utf8'));
  }
}

loadLocales();

export function t(key: string, lang = 'uz', params?: Record<string, string | number>): string {
  const dict = locales[lang] || locales['uz'] || {};
  let text = dict[key] || key;

  if (params) {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
    });
  }

  return text;
}
