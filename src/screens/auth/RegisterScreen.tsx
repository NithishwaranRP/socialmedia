import {
  View,
  Text,
  Touchable,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  TextInput,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import React, {FC, useEffect, useState, useRef} from 'react';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import {Colors} from '../../constants/Colors';
import {FONTS} from '../../constants/Fonts';
import {Platform} from 'react-native';
import {StyleSheet} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import LinearGradient from 'react-native-linear-gradient';
import CustomText from '../../components/global/CustomText';
import Icon from 'react-native-vector-icons/MaterialIcons';
import messaging from '@react-native-firebase/messaging';

import {
  checkUsernameAvailability,
  register,
} from '../../redux/actions/userAction';
import {useRoute} from '@react-navigation/native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {RFValue} from 'react-native-responsive-fontsize';
import {uploadFile} from '../../redux/actions/fileAction';
import {useAppDispatch} from '../../redux/reduxHook';
interface initialData {
  id_token: string;
  provider: string;
  name: string;
  email: string;
  userImage: string;
  fcmToken?: string | null;
}

// Add styles at the beginning of component to ensure we have a complete styles object
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.black,
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  scrollViewContainer: {
    paddingBottom: 120,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    paddingHorizontal: RFValue(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    // width: '100%',
    marginBottom: RFValue(30),
    marginTop: RFValue(80),
  },
  titleText: {
    color: '#FAFAFA',
    fontSize: RFValue(24),
    textAlign: 'center',
    fontFamily: 'PlayfairDisplay-Regular',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: RFValue(15),
    position: 'relative',
  },
  imageWrapper: {
    width: RFValue(120),
    height: RFValue(120),
    borderRadius: RFValue(60),
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: RFValue(36),
    height: RFValue(36),
    borderRadius: RFValue(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#09090B',
  },
  nameDisplayContainer: {
    alignItems: 'center',
    marginBottom: RFValue(20),
  },
  nameText: {
    color: '#FAFAFA',
    fontSize: RFValue(18),
    fontFamily: 'PlayfairDisplay-Regular',

  },
  formContainer: {
    width: '100%',
  },
  formGroup: {
    marginBottom: RFValue(20),
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: RFValue(8),
  },
  label: {
    color: '#FAFAFA',
    fontFamily: 'PlayfairDisplay-Regular',

    fontSize: RFValue(14),
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  optionalText: {
    color: '#A1A1AA',
    fontFamily: 'PlayfairDisplay-Regular',

    fontSize: RFValue(12),
  },
  availabilityText: {
    fontFamily: 'PlayfairDisplay-Regular',

    fontSize: RFValue(12),
  },
  input: {
    backgroundColor: 'rgba(24, 24, 27, 0.6)',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 8,
    color: '#FAFAFA',
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: RFValue(14),
    padding: RFValue(12),
    width: '100%',
  },
  textArea: {
    height: RFValue(100),
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: RFValue(20),
  },
  loadingText: {
    color: '#FAFAFA',
  },
  buttonContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    width: '100%',
    padding: RFValue(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: RFValue(20),
  },
  buttonText: {
    color: '#09090B',
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: RFValue(16),
  },
});

const RegisterScreen: FC = () => {
  const data = useRoute();
  const dispatch = useAppDispatch();
  const item = data?.params as initialData;
  const [username, setUsername] = useState<string>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isLocalImagePickedUp, setIsLocalImagePickedUp] =
    useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [imageUri, setImageUri] = useState<string>('');

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

  useEffect(() => {
    if (item) {
      setFullName(item.name);
      setImageUri(item.userImage);
    }
  }, [item]);

  const checkUsername = async () => {
    const data = await dispatch(checkUsernameAvailability(username));
    setUsernameAvailable(data);
  };

  const handleImagePicker = () => {
    Alert.alert('Select Image', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: handleLaunchCamera,
      },
      {
        text: 'Choose from Gallery',
        onPress: handleLaunchImageGallery,
      },
    ]);
  };

  const handleLaunchImageGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (result.assets && result.assets.length > 0) {
      setIsLocalImagePickedUp(true);
      setImageUri(result.assets[0].uri || '');
    }
  };

  const handleLaunchCamera = async () => {
    if (Platform.OS === 'android') {
      const grantedcamera = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,

        {
          title: 'App Camera Permission',
          message: 'App needs access to your camera',
          buttonNeutral: 'Ask me later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (grantedcamera === PermissionsAndroid.RESULTS.GRANTED) {
        const result = await launchCamera({
          mediaType: 'photo',
          includeBase64: true,
        });
        if (result.assets && result.assets.length > 0) {
          setIsLocalImagePickedUp(true);
          setImageUri(result.assets[0].uri || '');
        }
      }
      return;
    }

    // IOS ONLY
    const result = await launchCamera({
      mediaType: 'photo',
      includeBase64: true,
    });
    if (result.assets && result.assets.length > 0) {
      setIsLocalImagePickedUp(true);
      setImageUri(result.assets[0].uri || '');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setLoadingMessage('Creating Account...🚀');
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedFullName = fullName.trim();
    const trimmedBio = bio.trim();

    if (
      !trimmedUsername ||
      !trimmedFullName 
    ) {
      Alert.alert('Please fill required fields', 'Username is required and must be available.');
      setLoading(false);
      setLoadingMessage('');
      return;
    }

    let userImage = imageUri;
    if (isLocalImagePickedUp) {
      setLoadingMessage('Uploading Image...📦🎞️');
      const uploadResult = await dispatch(uploadFile(imageUri, 'user_image'));
      if (uploadResult) {
        userImage = uploadResult;
        setLoadingMessage('Image Uploaded...✅');
      } else {
        setLoading(false);
        setLoadingMessage('');
        return;
      }
    }
    
    // Get FCM token for registration
    let fcmToken = item?.fcmToken || null;
    try {
      if (!fcmToken) {
        setLoadingMessage('Getting device token...📱');
        fcmToken = await messaging().getToken();
        console.log('FCM Token for registration:', fcmToken);
      }
    } catch (fcmError) {
      console.log('Error getting FCM token during registration:', fcmError);
    }
    
    setLoadingMessage('Preparing Dashboard...✨✨');
    const registerData = {
      name: trimmedFullName,
      bio: trimmedBio || 'Hi there! I am using Recaps.',  // Default bio if empty
      userImage,
      email: item?.email,
      provider: item?.provider,
      id_token: item?.id_token,
      username,
      fcmToken,
    };
    console.log('Register Data:', registerData);
    await dispatch(register(registerData));
    setLoading(false);
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.background}>
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            { transform: [{ translateX }, { translateY }] }
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
      
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollViewContainer}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.select({
            ios: 120,
            android: 120,
          })}>
          <View style={styles.titleContainer}>
            <CustomText variant="h4" fontFamily={FONTS.SemiBold} style={styles.titleText}>
              Complete Your Profile
            </CustomText>
          </View>

          <TouchableOpacity
            style={styles.imageContainer}
            onPress={handleImagePicker}>
            <View style={styles.imageWrapper}>
              <Image
                source={
                  imageUri
                    ? {uri: imageUri}
                    : require('../../assets/images/placeholder.png')
                }
                style={styles.image}
              />
            </View>
            <View style={styles.cameraIcon}>
              <Icon name="camera-alt" color="#FAFAFA" size={RFValue(20)} />
            </View>
          </TouchableOpacity>

          <View style={styles.nameDisplayContainer}>
            <CustomText variant="h6" fontFamily={FONTS.SemiBold} style={styles.nameText}>
              {fullName}
            </CustomText>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <View style={styles.labelContainer}>
                <CustomText style={styles.label}>Username <Text style={styles.requiredStar}>*</Text></CustomText>
                {usernameAvailable != null && (
                  <CustomText
                    variant="h8"
                    fontFamily={FONTS.Medium}
                    style={[
                      styles.availabilityText, 
                      {color: usernameAvailable ? '#10B981' : '#EF4444'}
                    ]}>
                    {usernameAvailable ? 'Available' : 'Not Available'}
                  </CustomText>
                )}
              </View>
              <TextInput
                style={styles.input}
                returnKeyType="next"
                value={username}
                placeholderTextColor="#A1A1AA"
                onChangeText={setUsername}
                onEndEditing={async () => {
                  await checkUsername();
                }}
                placeholder="Enter unique username"
              />
            </View>
            
            <View style={styles.formGroup}>
              <View style={styles.labelContainer}>
                <CustomText style={styles.label}>Short Bio</CustomText>
                <CustomText 
                  variant="h8" 
                  fontFamily={FONTS.Medium} 
                  style={styles.optionalText}>
                  Optional
                </CustomText>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                placeholderTextColor="#A1A1AA"
                onChangeText={setBio}
                placeholder="Tell us a bit about yourself"
                multiline={true}
                numberOfLines={4}
              />
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FAFAFA" />
              <CustomText 
                variant="h8" 
                fontFamily={FONTS.Medium} 
                style={styles.loadingText}>
                {loadingMessage || 'Loading...'}
              </CustomText>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.buttonContainer}
              onPress={handleSubmit}
            >
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
          )}
        </KeyboardAwareScrollView>
      </View>
    </>
  );
};

export default RegisterScreen;
