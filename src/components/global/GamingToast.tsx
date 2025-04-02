import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Image,
} from 'react-native';
import {RFValue} from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {FONTS} from '../../constants/Fonts';

type ToastType = 'achievement' | 'tip' | 'alert' | 'error' | 'success';

interface GamingToastProps {
  visible: boolean;
  type?: ToastType;
  title: string;
  message: string;
  icon?: string;
  customIcon?: any; // For custom image icons
  duration?: number;
  onClose?: () => void;
  onPress?: () => void;
}

const GamingToast: React.FC<GamingToastProps> = ({
  visible,
  type = 'tip',
  title,
  message,
  icon,
  customIcon,
  duration = 5000,
  onClose,
  onPress,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Helper to get colors based on toast type
  const getThemeColors = () => {
    switch (type) {
      case 'achievement':
        return {
          primary: '#f59e0b',
          secondary: '#f3722c', 
          gradient: ['#f59e0b', '#f3722c', '#ef4444'],
          icon: icon || 'trophy',
        };
      case 'tip':
        return {
          primary: '#4361ee',
          secondary: '#4895ef',
          gradient: ['#4361ee', '#3a0ca3', '#4895ef'],
          icon: icon || 'lightbulb-on',
        };
      case 'alert':
        return {
          primary: '#f59e0b',
          secondary: '#d97706',
          gradient: ['#f59e0b', '#d97706', '#92400e'],
          icon: icon || 'alert-circle',
        };
      case 'error':
        return {
          primary: '#ef4444',
          secondary: '#dc2626',
          gradient: ['#ef4444', '#dc2626', '#991b1b'],
          icon: icon || 'alert-octagon',
        };
      case 'success':
        return {
          primary: '#06d6a0',
          secondary: '#02c39a',
          gradient: ['#06d6a0', '#02c39a', '#01a299'],
          icon: icon || 'check-circle',
        };
      default:
        return {
          primary: '#4361ee',
          secondary: '#4895ef',
          gradient: ['#4361ee', '#3a0ca3', '#4895ef'],
          icon: icon || 'information',
        };
    }
  };
  
  const themes = getThemeColors();

  useEffect(() => {
    if (visible && !isVisible) {
      setIsVisible(true);
      showToast();
    } else if (!visible && isVisible) {
      hideToast();
    }
  }, [visible, isVisible]);

  // Show animation sequence
  const showToast = () => {
    progressAnim.setValue(1);
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ),
    ]).start();

    // Progress animation for auto-dismiss
    if (duration > 0) {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
        easing: Easing.linear,
      }).start(() => {
        if (isVisible) {
          hideToast();
        }
      });
    }
  };

  // Hide animation sequence
  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.in(Easing.back(1.5)),
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      if (onClose) onClose();
    });
  };

  // Press animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Transform icon rotation for special effects
  const iconRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {translateX: slideAnim},
            {scale: scaleAnim},
          ],
          opacity: fadeAnim,
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.touchable}>
        <LinearGradient
          colors={themes.gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[
            styles.gradientBorder,
            {
              shadowColor: themes.primary,
              shadowOpacity: glowAnim,
            },
          ]}>
          <View style={styles.content}>
            {/* Icon container */}
            <View style={styles.iconContainer}>
              {customIcon ? (
                <Image source={customIcon} style={styles.customIcon} />
              ) : (
                <Animated.View
                  style={{
                    transform: [
                      {rotate: type === 'achievement' ? iconRotation : '0deg'},
                    ],
                  }}>
                  <Icon
                    name={themes.icon}
                    size={RFValue(24)}
                    color={themes.primary}
                    style={styles.icon}
                  />
                </Animated.View>
              )}
              {/* Decorative tech elements */}
              <View
                style={[
                  styles.techElement,
                  {
                    width: 6,
                    height: 2,
                    backgroundColor: themes.secondary,
                    top: 0,
                    right: 0,
                  },
                ]}
              />
              <View
                style={[
                  styles.techElement,
                  {
                    width: 6,
                    height: 2,
                    backgroundColor: themes.secondary,
                    bottom: 0,
                    left: 0,
                  },
                ]}
              />
            </View>

            {/* Message content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={hideToast}
              hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}>
              <Icon name="close" size={RFValue(18)} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: themes.primary,
              },
            ]}
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 5,
  },
  touchable: {
    width: '100%',
  },
  gradientBorder: {
    borderRadius: 12,
    padding: 1,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 10,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    position: 'relative',
    width: RFValue(36),
    height: RFValue(36),
    borderRadius: RFValue(18),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  customIcon: {
    width: RFValue(22),
    height: RFValue(22),
    resizeMode: 'contain',
  },
  techElement: {
    position: 'absolute',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: RFValue(14),
    fontFamily: FONTS.SemiBold,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: RFValue(12),
    fontFamily: FONTS.Regular,
  },
  closeButton: {
    marginLeft: 8,
  },
  progressBar: {
    height: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
  },
});

export default GamingToast; 