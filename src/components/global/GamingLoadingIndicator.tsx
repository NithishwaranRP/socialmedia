import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Easing, Text} from 'react-native';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import LinearGradient from 'react-native-linear-gradient';

interface GamingLoadingIndicatorProps {
  size?: number;
  message?: string;
  theme?: 'blue' | 'green' | 'purple' | 'red';
}

const GamingLoadingIndicator: React.FC<GamingLoadingIndicatorProps> = ({
  size = 80,
  message = 'Loading...',
  theme = 'blue',
}) => {
  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const particlesAnim = useRef(new Animated.Value(0)).current;
  
  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'blue':
        return {
          primary: '#4361ee',
          secondary: '#4895ef',
          tertiary: '#3a0ca3',
        };
      case 'green':
        return {
          primary: '#06d6a0',
          secondary: '#02c39a',
          tertiary: '#01a299',
        };
      case 'purple':
        return {
          primary: '#8b5cf6',
          secondary: '#a78bfa',
          tertiary: '#7c3aed',
        };
      case 'red':
        return {
          primary: '#e63946',
          secondary: '#f94144',
          tertiary: '#d00000',
        };
      default:
        return {
          primary: '#4361ee',
          secondary: '#4895ef',
          tertiary: '#3a0ca3',
        };
    }
  };
  
  const colors = getThemeColors();
  
  useEffect(() => {
    // Fade in animation
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
    
    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
      ])
    ).start();
    
    // Progress animation (repeating)
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
    
    // Particles animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(particlesAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(particlesAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => {
      // Clean up animations
      rotateAnim.stopAnimation();
      pulseAnim.stopAnimation();
      opacityAnim.stopAnimation();
      progressAnim.stopAnimation();
      particlesAnim.stopAnimation();
    };
  }, [rotateAnim, pulseAnim, opacityAnim, progressAnim, particlesAnim]);
  
  // Calculate rotation angle
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const counterRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  
  // Calculate progress width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  // Calculate particle positions
  const particlePositionX = particlesAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0%', '100%', '0%', '-100%', '0%'],
  });
  
  const particlePositionY = particlesAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0%', '-100%', '0%', '100%', '0%'],
  });
  
  // Calculate ring sizes based on provided size
  const outerRingSize = size;
  const middleRingSize = size * 0.8;
  const innerRingSize = size * 0.6;
  const coreSize = size * 0.3;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: opacityAnim,
        }
      ]}>
      <View style={styles.loadingContainer}>
        {/* Outer ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              width: outerRingSize,
              height: outerRingSize,
              borderRadius: outerRingSize / 2,
              borderColor: colors.primary,
              transform: [
                {rotate: rotation},
                {scale: pulseAnim},
              ],
            },
          ]}>
          {/* Tech elements - decorative dots */}
          <View 
            style={[
              styles.techDot, 
              {
                backgroundColor: colors.secondary,
                top: 0,
                left: '50%',
              }
            ]} 
          />
          <View 
            style={[
              styles.techDot, 
              {
                backgroundColor: colors.secondary,
                bottom: 0,
                left: '50%',
              }
            ]} 
          />
          <View 
            style={[
              styles.techDot, 
              {
                backgroundColor: colors.secondary,
                left: 0,
                top: '50%',
              }
            ]} 
          />
          <View 
            style={[
              styles.techDot, 
              {
                backgroundColor: colors.secondary,
                right: 0,
                top: '50%',
              }
            ]} 
          />
        </Animated.View>
        
        {/* Middle ring */}
        <Animated.View
          style={[
            styles.middleRing,
            {
              width: middleRingSize,
              height: middleRingSize,
              borderRadius: middleRingSize / 2,
              borderColor: colors.tertiary,
              transform: [
                {rotate: counterRotation},
                {scale: Animated.multiply(pulseAnim, 0.9)},
              ],
            },
          ]}>
          {/* Tech elements - decorative lines */}
          <View 
            style={[
              styles.techLine, 
              {
                backgroundColor: colors.tertiary,
                width: middleRingSize * 0.4,
                top: '50%',
                left: -middleRingSize * 0.2,
                transform: [{rotate: '45deg'}],
              }
            ]} 
          />
          <View 
            style={[
              styles.techLine, 
              {
                backgroundColor: colors.tertiary,
                width: middleRingSize * 0.4,
                bottom: '50%',
                right: -middleRingSize * 0.2,
                transform: [{rotate: '45deg'}],
              }
            ]} 
          />
        </Animated.View>
        
        {/* Inner ring */}
        <LinearGradient
          colors={[colors.primary, colors.secondary, colors.tertiary]}
          style={[
            styles.innerRing,
            {
              width: innerRingSize,
              height: innerRingSize,
              borderRadius: innerRingSize / 2,
            },
          ]}>
          {/* Core */}
          <View
            style={[
              styles.core,
              {
                width: coreSize,
                height: coreSize,
                borderRadius: coreSize / 2,
                backgroundColor: colors.primary,
              },
            ]}>
            {/* Particles */}
            <Animated.View
              style={[
                styles.particle,
                {
                  backgroundColor: colors.secondary,
                  transform: [
                    {translateX: particlePositionX},
                    {translateY: particlePositionY},
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.particle,
                {
                  backgroundColor: colors.tertiary,
                  transform: [
                    {translateX: particlePositionY},
                    {translateY: particlePositionX},
                    {scale: 0.8},
                  ],
                },
              ]}
            />
          </View>
        </LinearGradient>
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary,
              width: progressWidth,
            },
          ]} 
        />
      </View>
      
      {/* Loading text */}
      <Text style={[styles.loadingText, {color: colors.primary}]}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleRing: {
    position: 'absolute',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 2,
  },
  core: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  techDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
    marginLeft: -3,
  },
  techLine: {
    position: 'absolute',
    height: 2,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  loadingText: {
    fontFamily: FONTS.Medium,
    fontSize: RFValue(12),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
    letterSpacing: 1,
  },
});

export default GamingLoadingIndicator; 