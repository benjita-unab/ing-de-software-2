import { useColorScheme } from 'react-native';
import { AuthColors, type AuthColorScheme } from '@/src/constants/authTheme';

/** Tema auth según apariencia del sistema (light / dark). */
export function useAuthTheme() {
  const scheme = (useColorScheme() ?? 'light') as AuthColorScheme;
  return { scheme, colors: AuthColors[scheme] };
}
