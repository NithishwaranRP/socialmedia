import {View, Text, ViewStyle} from 'react-native';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';

interface CustomGradientProps {
  position: 'top' | 'bottom';
  style?: ViewStyle;
}

const CustomGradient: React.FC<CustomGradientProps> = ({
  position = 'top',
  style,
}) => {
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);

  // Dark mode gradient colors
  const darkGradientColors = [
    'rgba(0,0,0,0.9)',
    'rgba(0,0,0,0.8)',
    'rgba(0,0,0,0.8)',
    'rgba(0,0,0,0.7)',
    'rgba(0,0,0,0.4)',
    'rgba(0,0,0,0.1)',
    'rgba(0,0,0,0)',
  ];

  // Light mode gradient colors
  const lightGradientColors = [
    'rgba(0,0,0,0.4)',
    'rgba(0,0,0,0.3)',
    'rgba(0,0,0,0.2)',
    'rgba(0,0,0,0.1)',
    'rgba(0,0,0,0.05)',
    'rgba(0,0,0,0.02)',
    'rgba(0,0,0,0)',
  ];

  const gradientColors = isDarkMode ? darkGradientColors : lightGradientColors;
  const bottomColors = [...gradientColors].reverse();

  const gradientStyle: ViewStyle = {
    position: 'absolute',
    width: '100%',
    height: 120,
    top: position === 'top' ? 0 : undefined,
    bottom: position === 'bottom' ? 0 : undefined,
    zIndex: 999,
  };

  return (
    <LinearGradient
      colors={position === 'top' ? gradientColors : bottomColors}
      style={[gradientStyle, style]}
    />
  );
};

export default CustomGradient;
