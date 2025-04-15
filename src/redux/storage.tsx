import {Storage} from 'redux-persist';
import {MMKV} from 'react-native-mmkv';

const storage = new MMKV();

export const token_storage = new MMKV({
  id: 'user_storage',
  encryptionKey: 'YOUR_RSA_KEY',
});

// Add helper methods for token storage
token_storage.storeToken = async (tokens) => {
  if (!tokens || !tokens.access_token || !tokens.refresh_token) {
    console.error('Invalid tokens provided:', tokens);
    return false;
  }
  
  try {
    token_storage.set('access_token', tokens.access_token);
    token_storage.set('refresh_token', tokens.refresh_token);
    return true;
  } catch (error) {
    console.error('Error storing tokens:', error);
    return false;
  }
};

token_storage.clearTokens = () => {
  token_storage.delete('access_token');
  token_storage.delete('refresh_token');
};

const reduxStorage: Storage = {
  setItem: (key, value) => {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  getItem: key => {
    const value = storage.getString(key);
    return Promise.resolve(value);
  },
  removeItem: key => {
    storage.delete(key);
    return Promise.resolve();
  },
};

export default reduxStorage;
