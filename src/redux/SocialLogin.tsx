import {Alert, ToastAndroid} from 'react-native';
import {navigate, resetAndNavigate} from '../utils/NavigationUtil';
import {setUser} from './reducers/userSlice';
import {token_storage} from './storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import axios from 'axios';
import {LOGIN} from './API';
import {
  LoginManager,
  AccessToken,
  GraphRequest,
  GraphRequestManager,
} from 'react-native-fbsdk';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LANGUAGES} from '../constants/Languages';

interface RegisterData {
  id_token: string;
  provider: string;
  name: string;
  email: string;
  userImage: string;
  fcmToken?: string | null;
}

const handleSignInSuccess = async (res: any, dispatch: any) => {
  try {
    const {user, tokens} = res.data;
    console.log('Login successful, processing user data...', user);
    console.log('Language data in response:', user.preferredLanguage);
    
    // Store user's preferred language in AsyncStorage
    if (user.preferredLanguage) {
      console.log('Setting language in storage:', user.preferredLanguage);
      await AsyncStorage.setItem('selectedLanguage', user.preferredLanguage);
      console.log(`Loaded user's preferred language from server: ${user.preferredLanguage}`);
      ToastAndroid.show(`Welcome back! Using your preferred language: ${
        LANGUAGES.find(lang => lang.value === user.preferredLanguage)?.label || user.preferredLanguage
      }`, ToastAndroid.SHORT);
    } else {
      // If user has no language preference set, default to English
      console.log('No language in user profile, defaulting to English');
      await AsyncStorage.setItem('selectedLanguage', 'en');
      console.log('No preferred language on server, defaulting to English');
    }
    
    // Store tokens
    token_storage.set('access_token', tokens.access_token);
    token_storage.set('refresh_token', tokens.refresh_token);
    console.log('Auth tokens stored successfully');
    
    // Make sure preferredLanguage is included in the user object before setting in Redux
    if (!user.preferredLanguage && await AsyncStorage.getItem('selectedLanguage')) {
      user.preferredLanguage = await AsyncStorage.getItem('selectedLanguage');
      console.log('Added preferredLanguage to user object from AsyncStorage:', user.preferredLanguage);
    }
    
    // Update Redux state with user data
    await dispatch(setUser(user));
    console.log('User data loaded into Redux:', user);
    
    // Navigate to main app
    resetAndNavigate('BottomTab');
  } catch (error) {
    console.error('Error during sign-in process:', error);
    Alert.alert('Login Error', 'There was a problem completing your login. Please try again.');
  }
};

const handleSignInError = (error: any, data: RegisterData) => {
  console.log(error);
  if (error.response.status == 401) {
    navigate('RegisterScreen', {
      ...data,
    });
    return;
  }
  Alert.alert('We are facing issues, try again later');
};

export const signInWithGoogle = () => async (dispatch: any) => {
  try {
    console.log('Step 1: Checking Google Play Services...');
    await GoogleSignin.hasPlayServices();
    
    console.log('Step 2: Signing Out (if logged in before)...');
    await GoogleSignin.signOut();
// await GoogleSignin.revokeAccess();

    console.log('Step 3: Attempting Google Sign-In...');
    const {idToken, user} = await GoogleSignin.signIn();
    console.log('Step 4: Google Sign-In Success:', {idToken, user});
    
    // Get FCM token
    let fcmToken = null;
    try {
      fcmToken = await messaging().getToken();
      console.log('FCM Token obtained:', fcmToken);
    } catch (fcmError) {
      console.log('Error getting FCM token:', fcmError);
    }

    console.log('Step 5: Sending Token to Backend...');
    await axios.post(LOGIN, {
        provider: 'google',
        id_token: idToken,
        fcmToken: fcmToken, // Include FCM token in request
      })
      .then(async res => {
        console.log('Step 6: Login API Response:', res.data);
        await handleSignInSuccess(res, dispatch);
      })
      .catch((err: any) => {
        console.log('Step 7: Error in API Call:', err);
        const errorData = {
          email: user.email,
          name: user.name,
          userImage: user.photo,
          provider: 'google',
          id_token: idToken,
          fcmToken: fcmToken, // Include FCM token in error data for registration
        };
        handleSignInError(err, errorData as RegisterData);
      });

  } catch (error) {
    console.log('GOOGLE ERROR', error);
  }
};


export const signInWithFacebook = () => async (dispatch: any) => {
  LoginManager.logOut();
  LoginManager.logInWithPermissions(['email public_profile']).then(
    result => {
      if (result.isCancelled) {
      } else {
        AccessToken.getCurrentAccessToken().then(async (data: any) => {
          const infoRequest = new GraphRequest(
            '/me?fields=name,picture,email',
            null,
            async (err: any, result: any) => {
              if (err) {
                Alert.alert('Facebook Error');
                return;
              }
              console.log(result, err);

              await axios
                .post(LOGIN, {
                  provider: 'facebook',
                  id_token: data?.accessToken,
                })
                .then(async res => {
                  await handleSignInSuccess(res, dispatch);
                })
                .catch((err: any) => {
                  const errorData = {
                    email: result.email,
                    name: result.name,
                    userImage: result?.picture?.data?.url,
                    provider: 'facebook',
                    id_token: data?.accessToken,
                  };
                  handleSignInError(err, errorData);
                });
            },
          );

          new GraphRequestManager().addRequest(infoRequest).start();
        });
      }
    },
    error => {
      console.log(`FB Error`, error);
    },
  );
};
