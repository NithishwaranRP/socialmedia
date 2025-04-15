import axios from 'axios';
import {BASE_URL, REFRESH_TOKEN} from './API';
import {token_storage} from './storage';
import {Alert} from 'react-native';
import {resetAndNavigate} from '../utils/NavigationUtil';

export const appAxios = axios.create({
  baseURL: BASE_URL,
});

appAxios.interceptors.request.use(async config => {
  const access_token = token_storage.getString('access_token');
  if (access_token) {
    config.headers.Authorization = `Bearer ${access_token}`;
  }
  return config;
});

appAxios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      try {
        const newToken = await refresh_tokens();
        if (newToken) {
          // Try the request again with the new token
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return appAxios(originalRequest);
        } else {
          // If token refresh failed, navigate to login
          token_storage.clearAll();
          resetAndNavigate('LoginScreen');
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.log('Error refreshing token:', refreshError);
        return Promise.reject(error);
      }
    }

    if (error.response && error.response.status !== 401) {
      const errorMessage = error.response.data?.msg || 'Something went wrong';
      Alert.alert(errorMessage);
    }
    return Promise.reject(error);
  }
);

export const refresh_tokens = async () => {
  try {
    const refresh_token = token_storage.getString('refresh_token');
    if (!refresh_token) {
      console.log('REFRESH TOKEN ERROR: No refresh token found');
      return null;
    }

    console.log('Attempting to refresh token with:', refresh_token.substring(0, 10) + '...');
    const response = await axios.post(REFRESH_TOKEN, {
      refresh_token,
    });
    const new_access_token = response.data.access_token;
    const new_refresh_token = response.data.refresh_token;
    token_storage.set('access_token', new_access_token);
    token_storage.set('refresh_token', new_refresh_token);
    console.log('Token refresh successful');
    return new_access_token;
  } catch (error) {
    console.log('REFRESH TOKEN ERROR');
    if (axios.isAxiosError(error)) {
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data));
    } else {
      console.log('Error details:', error);
    }
    return null;
  }
};
