import {
  View,
  Text,
  TextStyle,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import React, {FC} from 'react';
import CustomText from './CustomText';
import {FONTS} from '../../constants/Fonts';
import {useThemeColors} from '../../constants/Colors';

interface SocialButtonHorizontalProps {
  icon: React.ReactNode;
  text: string;
  textColor?: string;
  backgroundColor?: string;
  onPress: () => void;
  borderColor?: string;  
  borderWidth?: number;  
  useThemeColors?: boolean;
}

const SocialButtonHorizontal: FC<SocialButtonHorizontalProps> = ({
  icon,
  text,
  textColor,
  backgroundColor,
  onPress,
  borderColor,
  borderWidth = 0,
  useThemeColors: useThemeColorsFlag = false,
}) => {
  const themeColors = useThemeColors();
  
  const finalTextColor = useThemeColorsFlag ? themeColors.text : textColor;
  const finalBackgroundColor = useThemeColorsFlag ? themeColors.card : backgroundColor;
  const finalBorderColor = useThemeColorsFlag ? themeColors.border : (borderColor || 'transparent');
  
  const textStyle: TextStyle = {
    color: finalTextColor,
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: finalBackgroundColor,
          borderColor: finalBorderColor,
          borderWidth,
        },
      ]}
      onPress={onPress}>
      {icon}
      <CustomText
        variant="h8"
        fontFamily={FONTS.Medium}
        style={[styles.text, textStyle]}>
        {text}
      </CustomText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: Platform.OS === 'ios' ? 0.3 : 0.5,
    padding: 10,
    paddingHorizontal: 20,
    width: '100%',
    marginVertical: 10,
  },
  text: {
    width: '90%',
    alignSelf: 'center',
    textAlign: 'center',
  },
});

export default SocialButtonHorizontal;
