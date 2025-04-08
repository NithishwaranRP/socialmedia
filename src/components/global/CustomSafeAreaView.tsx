import React, {FC, ReactNode} from 'react';
import {SafeAreaView, StyleSheet, View, ViewStyle} from 'react-native';
import {useThemeColors} from '../../constants/Colors';
import { StatusBar } from 'react-native';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

interface CustomSafeAreaViewProps {
  children: ReactNode;
  style?: ViewStyle;
}

const CustomSafeAreaView: FC<CustomSafeAreaViewProps> = ({children, style}) => {
  const colors = useThemeColors();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, style]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={colors.background} 
        translucent={true} 
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
});

export default CustomSafeAreaView;
