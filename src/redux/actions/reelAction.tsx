import {navigate, resetAndNavigate} from '../../utils/NavigationUtil';
import {appAxios} from '../apiConfig';
import {refetchUser} from './userAction';

export const createReel = (data: any) => async (dispatch: any) => {
  try {
    const res = await appAxios.post('/reel', data);
    console.log(res);
    dispatch(refetchUser());
  } catch (error) {
    console.log('REEL CREATE ERROR', error);
  }
};

export const fetchFeedReel =
  (offset: number, limit: number) => async (dispatch: any) => {
    try {
      const res = await appAxios.get(
        `/feed/home?limit=${limit || 25}&offset=${offset}`,
      );
      // console.log(res);
      
      return res.data.reels || [];
    } catch (error) {
      console.log('FETCH REEL ERROR', error);
      return [];
    }
  };
export const fetchFeedScrollReel =
  (offset: number, limit: number) => async (dispatch: any) => {
    try {
      const res = await appAxios.get(
        `/feed/home?limit=${limit || 25}&offset=${offset}`,
      );
      // console.log(res);
// const reels = res.data.reels.reverse() || [];
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

      // Create a cache key
      const cacheKey = `${type}_${data.userId}_${data.offset}`;
      
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

      console.log(`Fetching reels: type=${type}, userId=${data.userId}, offset=${data.offset}`);
      
      // Ensure we're using the correct endpoint
      const endpoint = `/feed/${type}/${data.userId}`;
      
      // Create a promise for this fetch
      const fetchPromise = (async () => {
        try {
          // Create an AbortController for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const res = await appAxios.get(
            `${endpoint}?limit=5&offset=${data.offset}`,
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
