import { useTheme } from '../context/ThemeContext';
import { getT, TranslationKey } from './translations';

export function useT(): (key: TranslationKey) => string {
  const { language } = useTheme();
  return getT(language);
}
