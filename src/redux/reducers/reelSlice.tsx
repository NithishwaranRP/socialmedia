import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REEL_ACTIONS } from '../actions/reelAction';

interface ReelState {
  deletedReelIds: string[];
  reelListCache: Record<string, any[]>;
  globalFeedData: any[];
}

const initialState: ReelState = {
  deletedReelIds: [],
  reelListCache: {},
  globalFeedData: []
};

export const reelSlice = createSlice({
  name: 'reel',
  initialState,
  reducers: {
    resetDeletedReels: (state) => {
      state.deletedReelIds = [];
    },
    setReelListCache: (state, action: PayloadAction<{ key: string, data: any[] }>) => {
      state.reelListCache[action.payload.key] = action.payload.data;
    },
    clearReelListCache: (state) => {
      state.reelListCache = {};
    },
    setGlobalFeedData: (state, action: PayloadAction<any[]>) => {
      state.globalFeedData = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(REEL_ACTIONS.DELETE_REEL_SUCCESS, (state, action) => {
      // Add the reel ID to the list of deleted IDs
      state.deletedReelIds.push(action.payload);
      
      // Also update any cached reel lists to filter out the deleted reel
      Object.keys(state.reelListCache).forEach(key => {
        if (state.reelListCache[key]) {
          state.reelListCache[key] = state.reelListCache[key].filter(
            reel => reel._id !== action.payload
          );
        }
      });
    });
  }
});

export const { resetDeletedReels, setReelListCache, clearReelListCache, setGlobalFeedData } = reelSlice.actions;

export const selectDeletedReelIds = (state: any) => state.reel.deletedReelIds;
export const selectReelListCache = (state: any) => state.reel.reelListCache;
export const selectGlobalFeedData = (state: any) => state.reel.globalFeedData;

export default reelSlice.reducer; 