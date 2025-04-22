import React, {useState} from 'react';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import {
  StyleSheet, 
  TouchableOpacity, 
  View,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {useAppSelector, useAppDispatch} from '../../redux/reduxHook';
import {selectUser} from '../../redux/reducers/userSlice';
import MinimalProfileDetails from '../../components/profile/MinimalProfileDetails';
import ReelListTab from '../../components/profile/ReelListTab';
import {refetchUser} from '../../redux/actions/userAction';
import {FONTS} from '../../constants/Fonts';
import CustomText from '../../components/global/CustomText';
import {useThemeColors} from '../../constants/Colors';
import MinimalButton from '../../components/global/MinimalButton';
import { useAvatarPopup } from '../../context/AvatarPopupContext';

const {width} = Dimensions.get('window');

const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser) as User;
  const colors = useThemeColors();
  const { setShowAIAvatar, setIsLoading, setDirectInitSession } = useAvatarPopup();

  // Check if user has valid data
  const hasValidUserData = user && user.id;

  // Handle refresh
  const handleRefresh = async () => {
    if (!user?.id) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      await dispatch(refetchUser());
    } catch (err) {
      console.error('Error refreshing user data:', err);
      setError('Could not refresh user data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle starting AI avatar with direct initialization
  const handleStartAIAvatar = () => {
    setIsLoading(true);
    setDirectInitSession(true);
    setShowAIAvatar(true);
  };

  const MyTabs = [
    
    {
      name: 'History',
      component: hasValidUserData ? (
        <ReelListTab user={user} type="watched" key="watched" />
      ) : null,
      icon: 'time-outline',
    },
  
    {
      name: 'Liked',
      component: hasValidUserData ? (
        <ReelListTab user={user} type="liked" key="liked" />
      ) : null,
      icon: 'heart-outline',
    },

    {
      name: 'Reels',
      component: hasValidUserData ? (
        <ReelListTab user={user} type="post" key="post" />
      ) : null,
      icon: 'grid-outline',
    },
  ];

  if (!hasValidUserData) {
    return (
      <CustomSafeAreaView style={{
        ...styles.errorContainer,
        backgroundColor: colors.background
      }}>
        <Icon 
          name="alert-circle-outline" 
          size={RFValue(50)} 
          color={colors.text}
        />
        <CustomText 
          fontFamily={FONTS.Medium} 
          variant="h6" 
          style={[styles.errorText, { color: colors.text }]}
        >
          Could not load user profile
        </CustomText>
        
        <View style={styles.retryButtonContainer}>
          <MinimalButton
            text="Retry"
            variant="outline"
            size="md"
            onPress={handleRefresh}
          />
        </View>
      </CustomSafeAreaView>
    );
  }

  return (
    <CustomSafeAreaView style={{
      ...styles.container,
      backgroundColor: colors.background
    }}>
      <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
        <MinimalProfileDetails user={user} />
      </View>
      <View style={[styles.tabBarContainer, { 
        backgroundColor: colors.background,
        borderColor: colors.border
      }]}>
        {MyTabs.map((tab, index) => (
          <TouchableOpacity
            key={`tab-${index}`}
            style={[
              styles.tabItem,
              activeTab === index && [
                styles.activeTabItem,
                {borderBottomColor: colors.text}
              ]
            ]}
            onPress={() => setActiveTab(index)}>
            <Icon
              name={tab.icon}
              size={RFValue(20)}
              color={
                activeTab === index 
                ? colors.text
                : colors.inactive_tint
              }
              style={styles.tabIcon}
            />
            <CustomText
              variant="h8"
              fontFamily={FONTS.Medium}
              style={{
                color: activeTab === index 
                  ? colors.text
                  : colors.inactive_tint
              }}>
              {tab.name}
            </CustomText>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        {refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        ) : (
          MyTabs[activeTab].component
        )}
      </View>
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
  },
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    height: 56,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabIcon: {
    marginRight: 6,
  },
  contentContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButtonContainer: {
    marginTop: 20,
  },
  loadingContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginVertical: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.Medium,
  },
  description: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONTS.Regular,
    marginTop: 20,
    paddingHorizontal: 30,
  },
});

export default ProfileScreen;