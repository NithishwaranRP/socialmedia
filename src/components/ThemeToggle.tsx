import React from 'react';
import {TouchableOpacity, StyleSheet, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../redux/store';
import {toggleTheme} from '../redux/reducers/themeSlice';
import {useThemeColors} from '../constants/Colors';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const colors = useThemeColors();

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  // Animation for the toggle
  const animatedValue = useDerivedValue(() => {
    return isDarkMode ? 1 : 0;
  });

  const toggleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withTiming(animatedValue.value * 20, {
            duration: 300,
          }),
        },
      ],
    };
  });

  return (
    <TouchableOpacity 
      style={[
        styles.toggleContainer, 
        {backgroundColor: isDarkMode ? '#484C56' : '#E9D9BF'}
      ]} 
      onPress={handleToggle} 
      activeOpacity={0.8}
    >
      <Animated.View 
        style={[
          styles.toggleButton, 
          toggleStyle,
          {backgroundColor: isDarkMode ? '#FFFFFF' : '#000000'}
        ]} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

export default ThemeToggle; 