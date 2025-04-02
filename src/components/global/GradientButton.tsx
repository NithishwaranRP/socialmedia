import React from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomText from './CustomText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import {Colors} from '../../constants/Colors';

interface GradientButtonProps {
  text: string;
  iconName?: string;
  onPress?: () => void;
  theme?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const GradientButton: React.FC<GradientButtonProps> = ({
  text,
  iconName,
  onPress,
  theme = 'primary',
  size = 'medium',
  disabled = false,
}) => {
  // Animation for press effect
  const animatedScale = React.useRef(new Animated.Value(1)).current;

  // Get gradient colors based on theme
  const getGradientColors = () => {
    switch (theme) {
      case 'primary':
        return ['#4f46e5', '#7c3aed', '#6366f1']; // Gaming blue/purple
      case 'secondary':
        return ['#1e293b', '#334155', '#475569']; // Dark metallic
      case 'danger':
        return ['#ef4444', '#dc2626', '#b91c1c']; // Gaming red
      case 'success':
        return ['#10b981', '#059669', '#047857']; // Gaming green
      default:
        return ['#4f46e5', '#7c3aed', '#6366f1'];
    }
  };

  // Size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 8,
          fontSize: RFValue(10),
          iconSize: RFValue(14),
        };
      case 'large':
        return {
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 12,
          fontSize: RFValue(16),
          iconSize: RFValue(20),
        };
      default: // medium
        return {
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 10,
          fontSize: RFValue(14),
          iconSize: RFValue(18),
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Animation handlers
  const handlePressIn = () => {
    Animated.spring(animatedScale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 40,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.buttonContainer}
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{scale: animatedScale}],
            opacity: disabled ? 0.6 : 1,
          },
        ]}>
        {/* Border gradient */}
        <LinearGradient
          colors={getGradientColors().map(color => color + '80')}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[
            styles.borderGradient,
            {
              borderRadius: sizeStyles.borderRadius + 4,
            },
          ]}>
          {/* Button gradient */}
          <LinearGradient
            colors={getGradientColors()}
            start={{x: 0.3, y: 0}}
            end={{x: 0.7, y: 1}}
            style={[
              styles.buttonGradient,
              {
                borderRadius: sizeStyles.borderRadius,
                paddingVertical: sizeStyles.paddingVertical,
                paddingHorizontal: sizeStyles.paddingHorizontal,
              },
            ]}>
            <View style={styles.innerButton}>
              <CustomText
                variant="h8"
                style={[styles.text, {fontSize: sizeStyles.fontSize}]}
                fontFamily={FONTS.SemiBold}>
                {text.toUpperCase()}
              </CustomText>
              {iconName && (
                <Icon
                  name={iconName}
                  size={sizeStyles.iconSize}
                  style={styles.icon}
                />
              )}
            </View>
          </LinearGradient>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  animatedContainer: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4.65,
    elevation: 8,
  },
  borderGradient: {
    padding: 1.5,
  },
  buttonGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: Colors.white,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5,
  },
  icon: {
    color: Colors.white,
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5,
  },
});

export default GradientButton;
