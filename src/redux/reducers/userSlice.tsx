import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../store';

interface UserState {
  user: null | Record<string, any>;
  isAdmin: boolean;
}

const initialState: UserState = {
  user: {},
  isAdmin: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<object>) => {
      state.user = action.payload;
    },
    
    // Add new reducer to update preferred language
    updatePreferredLanguage: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.preferredLanguage = action.payload;
        console.log('Updated user preferred language in Redux:', action.payload);
      }
    },

    // Add new reducer to set admin status
    setAdminStatus: (state, action: PayloadAction<boolean>) => {
      state.isAdmin = action.payload;
    },
  },
});

export const {setUser, updatePreferredLanguage, setAdminStatus} = userSlice.actions;

export const selectUser = (state: RootState) => state.user.user;
export const selectIsAdmin = (state: RootState) => state.user.isAdmin;

export default userSlice.reducer;
