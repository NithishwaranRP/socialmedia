import {useSelector} from 'react-redux';
import {RootState} from '../redux/store';

// Dark mode colors (current app colors)
export enum DarkColors {
  theme = '#a9c2eb',
  background = '#000',
  card = '#121212',
  text = '#fff',
  border = '#484C56',
  fbColor = '#1877F2',
  white = '#FFFFFF',
  inactive_tint = '#4b535e',
  disabled = '#D9D9D9',
  light_gray = '#D3D3D3',
  like = '#f7404f',
  lightText = '#888',
  black = '#000',
  gradient = '#fffff', // Negative of #000

}

// Light mode colors (negative of dark mode)
export enum LightColors {
  theme = '#563D14', // Negative of #a9c2eb
  background = '#fff', // Negative of #020B17
  card = '#f2f2f2', // Negative of #162640
  text = '#000', // Negative of #fff
  border = '#B7B3A9', // Negative of #484C56
  fbColor = '#E7880D', // Negative of #1877F2
  white = '#000000', // Pure white (changed from #000000)
  inactive_tint = '#B4ACA1', // Negative of #4b535e
  disabled = '#262626', // Negative of #D9D9D9
  light_gray = '#2C2C2C', // Negative of #D3D3D3
  like = '#08BFB0', // Negative of #f7404f
  lightText = '#777', // Negative of #888
  black = '#fff', // Negative of #000
  gradient = '#434343', // Negative of #000
}

// For backward compatibility
export enum Colors {
  theme = '#a9c2eb',
  background = '#020B17',
  card = '#162640',
  text = '#fff',
  border = '#484C56',
  fbColor = '#1877F2',
  white = '#FFFFFF',
  inactive_tint = '#4b535e',
  disabled = '#D9D9D9',
  light_gray = '#D3D3D3',
  like = '#f7404f',
  lightText = '#888',
  black = '#000',
}

// Custom hook to get current theme colors
export const useThemeColors = () => {
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  return isDarkMode ? DarkColors : LightColors;
};
