import { useColorScheme } from 'react-native';
import colors from '../constants/colors';

export function useColors() {
  const scheme = useColorScheme();
  return colors[scheme === 'dark' ? 'dark' : 'light'];
}
