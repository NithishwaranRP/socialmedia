import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import React, { FC, useEffect, useRef } from 'react';
import { RFValue } from 'react-native-responsive-fontsize';
import { useAppDispatch } from '../../redux/reduxHook';
import { signInWithGoogle } from '../../redux/SocialLogin';
import LinearGradient from 'react-native-linear-gradient';
import CustomText from '../../components/global/CustomText';
import { FONTS } from '../../constants/Fonts';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../constants/Colors';

const RecapsLogo = require('../../assets/images/recaps_logo.png');

const LoginScreen: FC = () => {
  const dispatch = useAppDispatch();
  
  // Create animation values for the flowing gradient
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Start the animation when component mounts
  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 10000, // 10 seconds for a full cycle
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
    
    // Clean up animation when component unmounts
    return () => {
      animatedValue.stopAnimation();
    };
  }, []);
  
  // Interpolate animation values for gradient movement
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -300],
  });
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -300],
  });

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.background}>
        {/* Black background layer */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.black }]} />
        
        {/* Animated gradient with reduced opacity */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            { 
              transform: [{ translateX }, { translateY }],
              opacity: 0.5 // Reduce opacity to let black show through
            }
          ]}
        >
          <LinearGradient
            colors={[
              '#62a0ff', 
              '#b47aff', 
              '#7092ff', 
              '#8b4dff', 
              '#62c1ff', 
              '#b47aff', 
              '#7092ff'
            ]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            locations={[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]}
            style={[StyleSheet.absoluteFill, { width: '200%', height: '200%' }]}
          />
        </Animated.View>
        
        <View style={styles.logoContainer}>
          <Image source={RecapsLogo} style={styles.logo} resizeMode="contain" />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.playfairTextTop}>
              Your Journey to
            </Text>
            <Text style={styles.italicText}>
              Personalized News
            </Text>
            <Text style={styles.playfairTextBottom}>
              Starts Here
            </Text>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
            to cut through the noise and keep you updated on the things that actually matter to you.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.buttonContainer}
            onPress={async () => await dispatch(signInWithGoogle())}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <View style={styles.arrowContainer}>
              <Icon name="arrow-forward" size={18} color="#000" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  logoContainer: {
    position: 'absolute',
    top: RFValue(60),
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: RFValue(120),
    height: RFValue(60),
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: RFValue(24),
    paddingBottom: RFValue(50),
  },
  titleContainer: {
    marginBottom: RFValue(20),
  },
  playfairTextTop: {
    color: '#FFFFFF',
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: RFValue(28),
    lineHeight: RFValue(36),
    letterSpacing: RFValue(0.8),
  },
  playfairTextBottom: {
    color: '#FFFFFF',
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: RFValue(28),
    lineHeight: RFValue(36),
    letterSpacing: RFValue(0.8),
  },
  italicText: {
    color: '#FFFFFF',
    fontFamily: 'PlayfairDisplay-Italic',
    // fontStyle: 'italic',
    fontSize: RFValue(32),
    lineHeight: RFValue(42),
    marginVertical: RFValue(6),
    letterSpacing: RFValue(1.2),
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  descriptionContainer: {
    marginBottom: RFValue(30),
  },
  descriptionText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Light',
    fontSize: RFValue(12),
    textAlign: 'left',
    opacity: 0.8,
    lineHeight: RFValue(20),
  },
  buttonContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    height: RFValue(50),
    marginTop: RFValue(20),
    width: RFValue(185),
    position: 'relative',
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: RFValue(14),
    // marginLeft: RFValue(10),
    marginRight: RFValue(30),
  },
  arrowContainer: {
    position: 'absolute',
    right: 0,
    width: RFValue(48),
    height: RFValue(48),
    borderRadius: RFValue(24),
    backgroundColor: 'rgb(255, 255, 255)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
