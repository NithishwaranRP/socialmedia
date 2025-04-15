import React from 'react';
import {View, TouchableOpacity, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomText from './CustomText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import {useThemeColors} from '../../constants/Colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';

interface GradientButtonProps {
  text: string;
  iconName?: string;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

const GradientButton: React.FC<GradientButtonProps> = ({
  text, 
  iconName, 
  onPress, 
  style, 
  textStyle
}) => {
  const colors = useThemeColors();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  
  // Different gradient colors for light and dark mode
  const gradientColors = isDarkMode 
    ? ['#333', '#444', '#555', '#444', '#333']
    : ['#CCC', '#BBB', '#AAA', '#BBB', '#CCC'];
    
  return (
    <TouchableOpacity
      style={[styles.GradientButtonContainer, style]}
      activeOpacity={0.4}
      onPress={onPress}>
      <LinearGradient
        colors={gradientColors}
        start={{x: 0, y: 0.5}}
        end={{x: 1, y: 0.5}}
        style={styles.GradientButton}>
        <View style={styles.innerButton}>
          <CustomText
            variant="h8"
            style={[
              styles.text, 
              {color: colors.text, marginRight: iconName ? 5 : 0},
              textStyle
            ]}
            fontFamily={FONTS.Medium}>
            {text}
          </CustomText>
          {iconName && (
            <Icon
              name={iconName}
              size={RFValue(16)}
              style={[styles.icon, {color: colors.text}]}
            />
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  GradientButtonContainer: {
    width: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    overflow: 'hidden',
  },
  GradientButton: {
    borderRadius: 20,
    padding: 8,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  text: {
    textAlign: 'center',
  },
  icon: {
    marginLeft: 4,
  },
  gradient: {
    width: '70%',
    height: '100%',
  },
});

export default GradientButton;
