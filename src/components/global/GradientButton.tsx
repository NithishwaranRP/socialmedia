import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomText from './CustomText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import {useThemeColors} from '../../constants/Colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';

const GradientButton: React.FC<{
  text: string;
  iconName?: string;
  onPress?: () => void;
}> = ({text, iconName, onPress}) => {
  const colors = useThemeColors();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  
  // Different gradient colors for light and dark mode
  const gradientColors = isDarkMode 
    ? ['#333', '#444', '#555', '#444', '#333']
    : ['#CCC', '#BBB', '#AAA', '#BBB', '#CCC'];
    
  return (
    <TouchableOpacity
      style={styles.GradientButtonContainer}
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
            style={[styles.text, {color: colors.text}]}
            fontFamily={FONTS.Medium}>
            {text}
          </CustomText>
          <Icon
            name={iconName ? iconName : 'wallet-giftcard'}
            size={RFValue(16)}
            style={[styles.icon, {color: colors.text}]}
          />
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
  },
  text: {
    marginRight: 5,
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
