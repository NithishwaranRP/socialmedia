import React from 'react';
import {NavigationContainer, DefaultTheme, DarkTheme} from '@react-navigation/native';
import MainNavigator from './MainNavigator';
import {navigationRef} from '../utils/NavigationUtil';
import {useSelector} from 'react-redux';
import {RootState} from '../redux/store';
import {useThemeColors} from '../constants/Colors';

const config = {
  screens: {
    UserProfileScreen: '/user/:username',
    ReelScrollScreen: '/reel/:id',
  },
};

const linking = {
  prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://recaps-backend-277610981315.asia-south1.run.app'],
  // prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://reelzzzserverworking.vercel.app'],
  // prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://192.168.68.133:8080'],
  // prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://192.168.108.133:8080'],
  // prefixes: ['reelzzz://', 'https://reelzzz.com', 'http://192.168.128.133:8080'],
  config,
};

const Navigation: React.FC = () => {
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const colors = useThemeColors();
  
  // Custom theme based on current mode
  const customTheme = {
    dark: isDarkMode,
    colors: {
      primary: colors.theme,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.like,
    },
  };

  return (
    <NavigationContainer theme={customTheme} linking={linking} ref={navigationRef}>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default Navigation;
