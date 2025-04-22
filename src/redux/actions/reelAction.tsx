import {navigate, resetAndNavigate} from '../../utils/NavigationUtil';
import {appAxios} from '../apiConfig';
import {refetchUser} from './userAction';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const createReel = (data: any) => async (dispatch: any) => {
  try {
    console.log('Creating reel with data:', JSON.stringify(data));
    const res = await appAxios.post('/reel', data);
    console.log('Reel created response:', res.data);
    dispatch(refetchUser());
  } catch (error) {
    console.log('REEL CREATE ERROR', error);
  }
};

export const fetchFeedReel =
  (offset: number, limit: number) => async (dispatch: any) => {
    try {
      // Get selected language from AsyncStorage
      const selectedLanguage = await AsyncStorage.getItem('selectedLanguage');
      
      // Build the URL with language parameter if available
      let url = `/feed/home?limit=${limit || 25}&offset=${offset}`;
      if (selectedLanguage) {
        url += `&language=${selectedLanguage}`;
        console.log(`Filtering feed by language: ${selectedLanguage}`);
      } else {
        console.log('No language filter applied');
      }
      
      const res = await appAxios.get(url);
      console.log(`Fetched ${res.data.reels?.length || 0} reels`);
      
      return res.data.reels || [];
    } catch (error) {
      console.log('FETCH REEL ERROR', error);
      return [];
    }
  };
export const fetchGlobalFeedReel =
  () => async (dispatch: any) => {
    try {
      // Get selected language from AsyncStorage
      const selectedLanguage = await AsyncStorage.getItem('selectedLanguage');
      
      // Build the URL with language parameter if available
      let url = `/feed/home`;
      if (selectedLanguage) {
        url += `&language=${selectedLanguage}`;
        console.log(`Filtering feed by language: ${selectedLanguage}`);
      } else {
        console.log('No language filter applied');
      }
      
      const res = await appAxios.get(url);
      console.log(`Fetched ${res.data.reels?.length || 0} reels`);
      
      return res.data.reels || [];
    } catch (error) {
      console.log('FETCH REEL ERROR', error);
      return [];
    }
  };
export const fetchFeedScrollReel =
  (offset: number, limit: number) => async (dispatch: any) => {
    try {
      // Get selected language from AsyncStorage
      const selectedLanguage = await AsyncStorage.getItem('selectedLanguage');
      
      // Build the URL with language parameter if available
      let url = `/feed/home?limit=${limit || 10}&offset=${offset}`;
      if (selectedLanguage) {
        url += `&language=${selectedLanguage}`;
      }
      
      console.log(`Fetching reels with offset: ${offset}, limit: ${limit || 10}, language: ${selectedLanguage || 'all'}`);
      const res = await appAxios.get(url);
      console.log(`Fetched ${res.data.reels?.length || 0} reels successfully`);
      return res.data.reels || [];
    } catch (error) {
      console.log('FETCH REEL ERROR', error);
      return [];
    }
  };

  export const markReelAsWatched = (reelId: string, userId: string) => async (dispatch: any) => {
    try {
      await appAxios.post(
        "/feed/markwatched",
        { reelIds: [reelId], userId }, // Include userId in the payload
      );
      console.log(`Reel ${reelId} marked as watched by user ${userId}.`);
    } catch (error) {
      console.error("Error marking reel as watched:", error);
    }
  };

  export const fetchReelsGroupedByHashtags =
  (offset: number, limit: number) => async (dispatch: any) => {
    try {
      const res = await appAxios.get(
        `/feed/groupedReels?limit=${limit || 50}&offset=${offset || 0}`
      );
      console.log(res);

      return res.data.groupedReels || [];
    } catch (error) {
      console.log('FETCH GROUPED REELS ERROR', error);
      return [];
    }
  };

interface fetchUserReel {
  userId?: string;
  offset: number;
}

export const fetchHashtags = () => async (dispatch: any) => {
  try {
    const res = await appAxios.get(`/reel/hashtags`);
    console.log("REELS FETCHED BY HASHTAG:", res.data);
    return res.data || [];
  } catch (error) {
    console.log('FETCH REELS BY HASHTAG ERROR', error);
    return [];
  }
};

// Add a cache for recent API responses
const reelCache = new Map();
// Track in-progress fetch requests to prevent duplicate calls
const pendingFetches = new Map();
// Set cache expiration time (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;
// Set maximum cache size
const MAX_CACHE_SIZE = 30;

export const fetchReel =
  (data: fetchUserReel, type: string) => async (dispatch: any) => {
    try {
      // Validate input
      if (!data?.userId) {
        console.error('fetchReel: Missing or invalid userId', data);
        return [];
      }

      // Get the selected language from AsyncStorage
      let selectedLanguage = null;
      try {
        selectedLanguage = await AsyncStorage.getItem('selectedLanguage');
        console.log(`Language for profile feed: ${selectedLanguage || 'none'}`);
      } catch (error) {
        console.error('Error getting language preference:', error);
      }

      // Create a cache key that includes language
      const cacheKey = `${type}_${data.userId}_${data.offset}_${selectedLanguage || 'default'}`;
      
      // Check if we have a request in progress for this key
      if (pendingFetches.has(cacheKey)) {
        console.log(`Request already in progress for ${cacheKey}`);
        return pendingFetches.get(cacheKey);
      }
      
      // Check if we have cached data that's still valid
      const cachedItem = reelCache.get(cacheKey);
      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_EXPIRATION) {
        console.log(`Using cached data for ${cacheKey}`);
        return cachedItem.data;
      }

      console.log(`Fetching reels: type=${type}, userId=${data.userId}, offset=${data.offset}, language=${selectedLanguage || 'default'}`);
      
      // Ensure we're using the correct endpoint
      const endpoint = `/feed/${type}/${data.userId}`;
      
      // Create a promise for this fetch
      const fetchPromise = (async () => {
        try {
          // Create an AbortController for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          // Build the URL with language parameter if available
          let url = `${endpoint}?limit=5&offset=${data.offset}`;
          if (selectedLanguage) {
            url += `&language=${selectedLanguage}`;
          }
          
          const res = await appAxios.get(
            url,
            { signal: controller.signal }
          );
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          if (!res.data || !res.data.reelData) {
            console.warn('No reels data returned', res.data);
            return [];
          }
          
          const reelData = res.data.reelData || [];
          
          // Store in cache with timestamp
          reelCache.set(cacheKey, {
            data: reelData,
            timestamp: Date.now()
          });
          
          // Clean up pendingFetches
          pendingFetches.delete(cacheKey);
          
          // Clean up old cache entries if cache gets too large
          if (reelCache.size > MAX_CACHE_SIZE) {
            // Get all keys and timestamps
            const cacheEntries = Array.from(reelCache.entries())
              .map(([key, entry]) => ({ key, timestamp: entry.timestamp }))
              .sort((a, b) => a.timestamp - b.timestamp);
            
            // Delete the oldest entries
            const entriesToRemove = cacheEntries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
            entriesToRemove.forEach(entry => reelCache.delete(entry.key));
            
            console.log(`Cleaned up ${entriesToRemove.length} old cache entries`);
          }
          
          return reelData;
        } catch (error: any) {
          // Clear this from pending fetches on error
          pendingFetches.delete(cacheKey);
          
          if (error.name === 'AbortError') {
            console.error('Request timed out');
            throw new Error('Request timed out, please try again');
          }
          
          if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
          } else if (error.request) {
            console.error('Error request:', error.request);
          } else {
            console.error('Error message:', error.message);
          }
          
          throw error;
        }
      })();

      // Store the promise so other concurrent requests can use it
      pendingFetches.set(cacheKey, fetchPromise);
      
      return fetchPromise;
    } catch (error: any) {
      console.error('FETCH REEL ERROR', error);
      throw error; // Re-throw to let component handle error state
    }
  };

export const getReelById =
  (id: string, deepLinkType: string) => async (dispatch: any) => {
    try {
      const res = await appAxios.get(`/reel/${id}`);
      console.log(deepLinkType, id);
      if (deepLinkType !== 'RESUME') {
        resetAndNavigate('BottomTab');
      }
      navigate('ReelScrollScreen', {
        data: [res.data],
        index: 0,
      });
    } catch (error) {
      console.log('FETCH REEL ERROR', error);
      return [];
    }
  };

export const fetchReelsByLanguage = (language: string, offset: number, limit: number) => async (dispatch: any) => {
  try {
    console.log(`Fetching reels for language: ${language}, offset: ${offset}, limit: ${limit}`);
    const res = await appAxios.get(
      `/feed/language/${language}?limit=${limit || 10}&offset=${offset}`
    );
    console.log(`Fetched ${res.data.reels?.length || 0} reels for language ${language}`);
    return {
      reels: res.data.reels || [],
      hasMore: res.data.hasMore || false,
      totalCount: res.data.totalCount || 0
    };
  } catch (error) {
    console.log('FETCH REELS BY LANGUAGE ERROR', error);
    return {
      reels: [],
      hasMore: false,
      totalCount: 0
    };
  }
};

// Define action types
export const REEL_ACTIONS = {
  DELETE_REEL_SUCCESS: 'DELETE_REEL_SUCCESS',
};

// Add this new deleteReel function to handle reel deletion
export const deleteReel = (reelId: string) => async (dispatch: any) => {
  try {
    console.log('Deleting reel with ID:', reelId);
    
    // Add special headers to identify admin users
    const headers = {
      'X-Admin-Override': 'true',
      'X-Admin-User-Ids': '67f8cff4e06283e516e56b12' // Add your ID here
    };
    
    const res = await appAxios.delete(`/reel/${reelId}`, { headers });
    console.log('Reel deleted response:', res.data);
    
    // Dispatch an action to update the UI immediately
    dispatch({
      type: REEL_ACTIONS.DELETE_REEL_SUCCESS,
      payload: reelId
    });
    
    // Refetch user data to update reel counts
    dispatch(refetchUser());
    
    // Clear affected cache entries
    clearReelCacheForDeletedReel(reelId);
    
    return res.data;
  } catch (error) {
    console.log('REEL DELETE ERROR:', error);
    throw error;
  }
};

// Helper function to clear cache entries that might contain the deleted reel
const clearReelCacheForDeletedReel = (reelId: string) => {
  // Get all cache keys
  const cacheKeys = Array.from(reelCache.keys());
  
  // Clear all cache entries as we don't know which ones contain the deleted reel
  // This ensures fresh data will be fetched next time
  cacheKeys.forEach(key => {
    reelCache.delete(key);
  });
  
  console.log(`Cleared reel cache after deletion of reel ${reelId}`);
};
