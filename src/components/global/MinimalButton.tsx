import React from 'react';
import {TouchableOpacity, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import {useThemeColors} from '../../constants/Colors';
import CustomText from './CustomText';

interface MinimalButtonProps {
  text: string;
  iconName?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  fullWidth?: boolean;
}

const MinimalButton: React.FC<MinimalButtonProps> = ({
  text,
  iconName,
  variant = 'default',
  size = 'md',
  onPress,
  fullWidth = false,
}) => {
  const colors = useThemeColors();
  
  // Get styles based on variant
  const getVariantStyle = () => {
    switch (variant) {
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
          textColor: colors.text,
        };
      case 'destructive':
        return {
          backgroundColor: '#EF4444',
          textColor: colors.white,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: colors.text,
        };
      case 'link':
        return {
          backgroundColor: 'transparent',
          textColor: colors.theme,
          underline: true,
        };
      default:
        return {
          backgroundColor: colors.card,
          textColor: colors.text,
        };
    }
  };

  // Get styles based on size
  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          fontSize: RFValue(10),
          iconSize: RFValue(14),
        };
      case 'lg':
        return {
          paddingVertical: 10,
          paddingHorizontal: 20,
          fontSize: RFValue(12),
          iconSize: RFValue(18),
        };
      default:
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          fontSize: RFValue(11),
          iconSize: RFValue(16),
        };
    }
  };

  const variantStyle = getVariantStyle();
  const sizeStyle = getSizeStyle();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderWidth: variantStyle.borderWidth,
          borderColor: variantStyle.borderColor,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          width: fullWidth ? '100%' : 'auto',
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}>
      <View style={styles.innerButton}>
        <CustomText
          variant="h8"
          fontSize={sizeStyle.fontSize / RFValue(1)}
          style={[
            styles.text,
            {
              color: variantStyle.textColor,
              textDecorationLine: variantStyle.underline ? 'underline' : 'none',
            },
          ]}
          fontFamily={FONTS.Medium}>
          {text}
        </CustomText>
        {iconName && (
          <Icon
            name={iconName}
            size={sizeStyle.iconSize}
            style={[styles.icon, {color: variantStyle.textColor}]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginRight: 5,
  },
  icon: {
    marginLeft: 4,
  },
});

export default MinimalButton; 