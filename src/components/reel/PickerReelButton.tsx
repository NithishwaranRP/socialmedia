import {View, StyleSheet, TouchableOpacity, Animated, Platform, StatusBar} from 'react-native';
import React, {FC, useRef} from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon2 from 'react-native-vector-icons/MaterialIcons';
import {Colors} from '../../constants/Colors';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from '../global/CustomText';
import {launchCamera} from 'react-native-image-picker';
import {createThumbnail} from 'react-native-create-thumbnail';
import {navigate} from '../../utils/NavigationUtil';
import LinearGradient from 'react-native-linear-gradient';
import {FONTS} from '../../constants/Fonts';

const GamingButton = ({icon, text, onPress, color1, color2, color3, IconComponent}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  // Animation for pulsing glow effect
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [glowAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
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

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.buttonWrapper}>
      <Animated.View
        style={[
          styles.buttonAnimContainer,
          {
            transform: [{scale: scaleAnim}],
          },
        ]}>
        {/* Outer glow */}
        <Animated.View
          style={[
            styles.glowContainer,
            {
              opacity: glowAnim,
              backgroundColor: color1,
            },
          ]}>
          {/* Actual button with gradient */}
          <LinearGradient
            colors={[color1, color2, color3]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.gradientBtn}>
            <IconComponent name={icon} color={Colors.white} size={RFValue(24)} />
            <CustomText
              variant="h8"
              fontFamily={FONTS.SemiBold}
              style={styles.btnText}>
              {text}
            </CustomText>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const PickerReelButton: FC = () => {
  const handleCamera = async () => {
    await launchCamera({
      saveToPhotos: false,
      formatAsMp4: true,
      mediaType: 'video',
      includeExtra: true,
    })
      .then(res => {
        console.log(res);

        createThumbnail({
          url: res.assets![0].uri || '',
          timeStamp: 100,
        })
          .then(response => {
            if (res.assets![0].uri) {
              navigate('UploadReelScreen', {
                thumb_uri: response.path,
                file_uri: res.assets![0].uri,
              });
            }
          })
          .catch(err => {
            console.log('Error', err);
          });
      })
      .catch(err => {
        console.log('Video Record', err);
      });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="black"
        translucent={true}
      />

      <GamingButton
        icon="camera-outline"
        text="Camera"
        onPress={handleCamera}
        color1="#4f46e5"
        color2="#7c3aed"
        color3="#6366f1"
        IconComponent={Icon}
      />

      <GamingButton
        icon="my-library-add"
        text="Drafts"
        onPress={() => {}}
        color1="#10b981"
        color2="#059669"
        color3="#047857"
        IconComponent={Icon2}
      />

      <GamingButton
        icon="auto-fix-high"
        text="Templates"
        onPress={() => {}}
        color1="#f59e0b"
        color2="#d97706"
        color3="#b45309"
        IconComponent={Icon2}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    paddingHorizontal: 5,
  },
  buttonWrapper: {
    width: '32%',
    alignItems: 'center',
  },
  buttonAnimContainer: {
    width: '100%',
    aspectRatio: 0.85,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4.65,
    elevation: 6,
  },
  glowContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    padding: 2,
    opacity: 0.7,
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1c1b1b',
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  btnText: {
    marginTop: 8,
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5,
  },
});

export default PickerReelButton;
