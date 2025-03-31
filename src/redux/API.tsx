import {Platform} from 'react-native';

// FOR PRODUCTION: Update the deployment URI
// export const BASE_URL = "https://reelzzzserverworking.vercel.app";
export const BASE_URL = "https://recaps-backend-277610981315.asia-south1.run.app";

// FOR LOCAL DEVELOPMENT (Uncomment when needed)
// export const BASE_URL = "http://192.168.170.133:8080"; // Change based on your local IP
// export const BASE_URL = "http://192.168.222.133:8080"; // Change based on your local IP
// 192.168.48.90

// RUNNING ON REAL DEVICE USE YOUR NETWORK IP TO ACCESS ON REAL DEVICE
//eg http://192.168.29.88:3000

// FOR PRODUCTION UPDATE THESE DEPLOYMENT URI and CREATE BUILD
// or you can setup more automation using like NODE__DEV or config env
// if you want more flexibility

// export const BASE_URL = "https://reelzzz-server.com";

export const CHECK_USERNAME = `${BASE_URL}/oauth/check-username`;
export const REGISTER = `${BASE_URL}/oauth/register`;
export const LOGIN = `${BASE_URL}/oauth/login`;
export const REFRESH_TOKEN = `${BASE_URL}/oauth/refresh-token`;
// export const UPLOAD = `http://192.168.127.90:8080:3000/file/upload`;
export const UPLOAD = `${BASE_URL}/file/upload`;
export const BREAKINGNEWS = `${BASE_URL}/feed/breakingNews`;
export const CATEGORY = `${BASE_URL}/reel/hashtags`;
export const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY';
