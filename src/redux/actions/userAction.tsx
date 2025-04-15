import {token_storage} from '../storage';
import {appAxios} from '../apiConfig';
import {setUser, updatePreferredLanguage} from '../reducers/userSlice';
import {persistor} from '../store';
import {resetAndNavigate} from '../../utils/NavigationUtil';
import {CHECK_USERNAME, REGISTER} from '../API';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import {addFollowing} from '../reducers/followingSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface registerData {
  id_token: string;
  provider: string;
  name: string;
  email: string;
  username: string;
  userImage: string;
  bio: string;
  fcmToken?: string | null;
  preferredLanguage?: string;
}

export const checkUsernameAvailability =
  (username: string) => async (dispatch: any) => {
    try {
      const res = await axios.post(CHECK_USERNAME, {
        username,
      });
      return res.data.available;
    } catch (error: any) {
      console.log('CHECK USERNAME ERROR ->', error);
      return null;
    }
  };

export const register = (registerData: registerData) => async (dispatch: any) => {
  try {
    console.log('Sending registration data to:', `${REGISTER}`);
    
    const res = await axios.post(`${REGISTER}`, registerData);
    console.log('Registration response:', res.status, typeof res.data);
    
    if (!res.data || !res.data.user || !res.data.tokens) {
      console.error('Invalid response format:', res.data);
      alert('Registration failed: Invalid server response format');
      return;
    }
    
    const { user, tokens } = res.data;
    console.log('Registration succeeded! User:', user.username);
    
    // Store the user's preferred language in AsyncStorage
    if (user.preferredLanguage) {
      await AsyncStorage.setItem('selectedLanguage', user.preferredLanguage);
      console.log(`Saved preferred language to storage: ${user.preferredLanguage}`);
    } else {
      // Default to English if no language is specified
      await AsyncStorage.setItem('selectedLanguage', 'en');
      console.log('No preferred language specified, defaulting to English');
    }
    
    try {
      // Store tokens using the helper method
      const tokenStored = await token_storage.storeToken(tokens);
      if (!tokenStored) {
        throw new Error('Failed to store tokens');
      }
      console.log('Tokens stored successfully');
      
      // Update Redux state
      dispatch(setUser(user));
      
      // Navigate to home screen
      resetAndNavigate('BottomTab');
    } catch (storageError) {
      console.error('Error storing tokens:', storageError);
      alert('Registration completed but error storing session. Please log in again.');
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (axios.isAxiosError(error)) {
      // Extract detailed error information from Axios error
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data));
      
      const errorMessage = error.response?.data?.msg || 
                         error.response?.data?.error || 
                         'Registration failed. Please try again later.';
      
      alert(errorMessage);
    } else {
      // Handle non-Axios errors
      console.error('Non-axios error:', error.message);
      alert('Registration failed. Please check your connection and try again.');
    }
  }
};

export const refetchUser = () => async (dispatch: any) => {
  try {
    const res = await appAxios.get('/user/profile');
    await dispatch(setUser(res.data.user));
  } catch (error: any) {
    console.log('PROFILE ->', error);
  }
};

export const fetchUserByUsername =
  (username: string) => async (dispatch: any) => {
    try {
      const res = await appAxios.get(`/user/profile/${username}`);
      return res.data.user;
    } catch (error: any) {
      console.log('FETCH BY USERNAME ->', error);
      return null;
    }
  };

// export const fetchUserByUsername =
//   (username: string) => async (dispatch: any, getState: any) => {
//     try {
//       const token = getState().auth.token; // Ensure you're getting the token from Redux state
//       const res = await appAxios.get(`/user/profile`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       return res.data.user;
//     } catch (error: any) {
//       console.log('FETCH BY USERNAME ->', error.response?.data || error.message);
//       return null;
//     }
//   };

  

export const toggleFollow = (userId: string) => async (dispatch: any) => {
  try {
    const res = await appAxios.put(`/user/follow/${userId}`);
    const data = {
      id: userId,
      isFollowing: res.data.msg == 'Unfollowed' ? false : true,
    };
    dispatch(addFollowing(data));
    dispatch(refetchUser());
  } catch (error: any) {
    console.log('TOGGLE FOLLOW ERRO ->', error);
  }
};

export const refetchUserLogin = () => async (dispatch: any) => {
  try {
    const res = await appAxios.get('/user/profile');
    await dispatch(setUser(res.data.user));
    resetAndNavigate('BottomTab');
  } catch (error: any) {
    console.log('PROFILE ->', error);
  }
};

export const Logout = () => async (dispatch: any) => {
  await token_storage.clearAll();
  await persistor.purge();
  // resetAndNavigate('LoginScreen');
};

export const getSearchUsers = (text: string) => async (dispatch: any) => {
  try {
    const res = await appAxios.get(`/user/search?text=${text}`);
    return res.data.users;
  } catch (error: any) {
    console.log('SEARCH USER ->', error);
    return [];
  }
};

export const getFollowOrFollowingUsers =
  (data: any, search: string, offset: number) => async (dispatch: any) => {
    try {
      const res = await appAxios.get(
        `/user/${data?.type.toLowerCase()}/${
          data?.userId
        }?searchText=${search}&limit=5&offset=${offset}`,
      );

      return res.data;
    } catch (error: any) {
      console.log('Followers / Following USER ->', error);
      return [];
    }
  };

/**
 * Updates a user's preferred language
 * @param languageCode - The language code to set as preferred
 * @returns A boolean indicating success or failure
 */
export const updateUserLanguage = (languageCode: string) => async (dispatch: any) => {
  try {
    console.log('Updating language preference to:', languageCode);
    
    // First, immediately update AsyncStorage
    await AsyncStorage.setItem('selectedLanguage', languageCode);
    console.log('Updated AsyncStorage with language:', languageCode);
    
    // Update Redux state immediately (optimistic update)
    dispatch(updatePreferredLanguage(languageCode));
    console.log('Updated Redux state with language:', languageCode);
    
    // Then try to update the server
    const res = await appAxios.patch('/user/profile', {
      preferredLanguages: [languageCode]  // Send as array with single value to match backend schema
    });
    
    if (res.status === 200) {
      console.log('Successfully updated language preference in user profile');
      
      // Keep Redux state updated
      dispatch(updatePreferredLanguage(languageCode));
      
      // Refresh the user data to ensure all parts of the app are updated
      dispatch(refetchUser());
      
      return true;
    } else {
      console.error('Failed to update language preference:', res.data);
      // Even if server update failed, we've already updated locally
      return true;
    }
  } catch (error) {
    console.error('Error updating language preference:', error);
    // Local update succeeded even if server failed
    return true;
  }
};