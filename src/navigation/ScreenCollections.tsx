import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SplashScreen from '../screens/auth/SplashScreen';
import FollowingScreen from '../screens/dashboard/FollowingScreen';
import ReedemScreen from '../screens/dashboard/ReedemScreen';
import UserProfileScreen from '../screens/dashboard/UserProfileScreen';
import FeedReelScrollScreen from '../screens/reel/FeedReelScrollScreen';
import PickReelScreen from '../screens/reel/PickReelScreen';
import ReelScrollScreen from '../screens/reel/ReelScrollScreen';
import RemixScreen from '../screens/reel/RemixScreen';
import UploadReelScreen from '../screens/reel/UploadReelScreen';
import UploadRemixScreen from '../screens/reel/UploadRemixScreen';
import WebViewScreen from '../screens/WebViewScreen';
import BottomTab from './BottomTab';
import ChatbotScreen from '../components/Chatbot/ChatbotScreen';
// Import commented out since we're showing HeyGenAvatarScreen as a popup now
// import { HeyGenAvatarScreen } from '../components/HeyGenAvatar';

export const authStack = [
  {
    name: 'LoginScreen',
    component: LoginScreen,
  },
  {
    name: 'RegisterScreen',
    component: RegisterScreen,
  },
  {
    name: 'SplashScreen',
    component: SplashScreen,
  },
];

export const dashboardStack = [
  {
    name: 'BottomTab',
    component: BottomTab,
  },
  {
    name: 'ChatbotScreen',
    component: ChatbotScreen,
  },
  {
    name: 'PickReelScreen',
    component: PickReelScreen,
  },
  {
    name: 'UploadReelScreen',
    component: UploadReelScreen,
  },
  {
    name: 'UploadRemixScreen',
    component: UploadRemixScreen,
  },
  {
    name: 'FeedReelScrollScreen',
    component: FeedReelScrollScreen,
  },
  {
    name: 'ReelScrollScreen',
    component: ReelScrollScreen,
  },
  {
    name: 'RemixScreen',
    component: RemixScreen,
  },
  {
    name: 'FollowingScreen',
    component: FollowingScreen,
  },
  {
    name: 'UserProfileScreen',
    component: UserProfileScreen,
  },
  {
    name: 'ReedemScreen',
    component: ReedemScreen,
  },
  {
    name: 'WebViewScreen',
    component: WebViewScreen,
  },
  // HeyGenAvatarScreen route commented out since we're showing it as a popup now
  // {
  //   name: 'HeyGenAvatarScreen',
  //   component: HeyGenAvatarScreen,
  // },
];

export const mergedStacks = [...dashboardStack, ...authStack];
