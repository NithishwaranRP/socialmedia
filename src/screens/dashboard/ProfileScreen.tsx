import React, {useRef, useState, useEffect} from 'react';
import CustomGradient from '../../components/global/CustomGradient';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import {
  StyleSheet, 
  TouchableOpacity, 
  View,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Text,
} from 'react-native';
import {Colors} from '../../constants/Colors';
import Icon from 'react-native-vector-icons/Ionicons';
import {RFValue} from 'react-native-responsive-fontsize';
import {useAppSelector, useAppDispatch} from '../../redux/reduxHook';
import {selectUser} from '../../redux/reducers/userSlice';
import ProfileDetails from '../../components/profile/ProfileDetails';
import ReelListTab from '../../components/profile/ReelListTab';
import {refetchUser} from '../../redux/actions/userAction';
import {FONTS} from '../../constants/Fonts';
import CustomText from '../../components/global/CustomText';

const {width} = Dimensions.get('window');

const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser) as User;

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

  const MyTabs = [
    {
      name: 'Reels',
      component: hasValidUserData ? (
        <ReelListTab user={user} type="post" key="post" />
      ) : null,
      icon: 'apps-sharp',
    },
    {
      name: 'Liked',
      component: hasValidUserData ? (
        <ReelListTab user={user} type="liked" key="liked" />
      ) : null,
      icon: 'heart',
    },
    {
      name: 'History',
      component: hasValidUserData ? (
        <ReelListTab user={user} type="watched" key="watched" />
      ) : null,
      icon: 'logo-tableau',
    },
  ];

  if (!hasValidUserData) {
    return (
      <CustomSafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={RFValue(50)} color={Colors.white} />
          <CustomText fontFamily={FONTS.Medium} variant="h6" style={styles.errorText}>
            Could not load user profile
          </CustomText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <CustomText fontFamily={FONTS.Medium} variant="h8" style={styles.retryButtonText}>
              Retry
            </CustomText>
          </TouchableOpacity>
        </View>
      </CustomSafeAreaView>
    );
  }

  return (
    <CustomSafeAreaView style={styles.container}>
      <View style={styles.profileSection}>
        <ProfileDetails user={user} />
      </View>
      
      {/* Tab Bar - Directly below profile with no spacing */}
      <View style={styles.tabBarContainer}>
        {MyTabs.map((tab, index) => (
          <TouchableOpacity
            key={`tab-${index}`}
            style={styles.tabBar}
            onPress={() => setActiveTab(index)}>
            <Icon
              name={tab.icon}
              size={RFValue(20)}
              color={
                activeTab === index ? Colors.white : Colors.disabled
              }
            />
          </TouchableOpacity>
        ))}
        
        {/* Indicator line */}
        <View style={styles.indicatorContainer}>
          <View 
            style={[
              styles.indicatorStyle, 
              { 
                left: (width / MyTabs.length) * activeTab,
                width: width / MyTabs.length 
              }
            ]} 
          />
        </View>
      </View>
      
      {/* Content Area */}
      <View style={styles.contentContainer}>
        {MyTabs[activeTab].component}
      </View>
      
      <CustomGradient position="bottom" />
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  profileSection: {
    paddingVertical: 10, // Minimal padding
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.black,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#333',
    position: 'relative',
    zIndex: 10,
  },
  tabBar: {
    width: `${100 / 3}%`, // For 3 tabs
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12, // Slightly taller tabs
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2, // Slightly thicker indicator
    width: '100%',
  },
  indicatorStyle: {
    position: 'absolute',
    bottom: 0,
    height: 2, // Match height with container
    backgroundColor: 'white',
  },
  contentContainer: {
    flex: 1, // Take all remaining space
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.white,
    textAlign: 'center',
    marginTop: 15,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: '#333333',
    borderRadius: 5,
  },
  retryButtonText: {
    color: Colors.white,
  },
});

export default ProfileScreen;