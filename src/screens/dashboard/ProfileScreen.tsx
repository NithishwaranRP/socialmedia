import React, {useRef, useState, useEffect} from 'react';
import CustomGradient from '../../components/global/CustomGradient';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import {
  StyleSheet, 
  TouchableOpacity, 
  View,
  Dimensions,
  ActivityIndicator,
  Animated,
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
import LinearGradient from 'react-native-linear-gradient';

const {width} = Dimensions.get('window');

const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser) as User;

  // Check if user has valid data
  const hasValidUserData = user && user.id;

  // Animation for tab indicator
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeTab,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

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

  // Profile header component containing profile details and tabs
  const ProfileHeaderComponent = () => (
    <>
      <View style={styles.profileSection}>
        <ProfileDetails user={user} />
      </View>
      
      {/* Tab Bar with Animation */}
      <View style={styles.tabBarContainer}>
        {MyTabs.map((tab, index) => (
          <TouchableOpacity
            key={`tab-${index}`}
            style={styles.tabBar}
            activeOpacity={0.7}
            onPress={() => setActiveTab(index)}>
            <Icon
              name={tab.icon}
              size={RFValue(20)}
              color={
                activeTab === index ? Colors.white : Colors.disabled
              }
            />
            <CustomText 
              variant="h9" 
              fontFamily={FONTS.Medium} 
              style={{
                color: activeTab === index ? Colors.white : Colors.disabled,
                marginTop: 4,
              }}>
              {tab.name}
            </CustomText>
          </TouchableOpacity>
        ))}
        
        {/* Animated Indicator */}
        <Animated.View 
          style={[
            styles.indicatorStyle, 
            { 
              left: slideAnim.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [0, width / 3, (width / 3) * 2]
              })
            }
          ]} 
        >
          <LinearGradient 
            colors={['#a9c2eb', '#7f8cff']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.gradientIndicator}
          />
        </Animated.View>
      </View>
    </>
  );

  const MyTabs = [
    {
      name: 'Reels',
      component: hasValidUserData ? (
        <ReelListTab 
          user={user} 
          type="post" 
          key="post" 
          headerComponent={<ProfileHeaderComponent />}
        />
      ) : null,
      icon: 'apps-sharp',
    },
    {
      name: 'Liked',
      component: hasValidUserData ? (
        <ReelListTab 
          user={user} 
          type="liked" 
          key="liked" 
          headerComponent={<ProfileHeaderComponent />}
        />
      ) : null,
      icon: 'heart',
    },
    {
      name: 'History',
      component: hasValidUserData ? (
        <ReelListTab 
          user={user} 
          type="watched" 
          key="watched" 
          headerComponent={<ProfileHeaderComponent />}
        />
      ) : null,
      icon: 'logo-tableau',
    },
  ];

  if (!hasValidUserData) {
    return (
      <CustomSafeAreaView style={styles.container}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(2,11,23,0.95)']}
          style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={RFValue(50)} color={Colors.white} />
          <CustomText fontFamily={FONTS.Medium} variant="h6" style={styles.errorText}>
            Could not load user profile
          </CustomText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefresh}
            activeOpacity={0.7}>
            <LinearGradient
              colors={['#162640', '#223a5e']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.retryGradient}>
              <CustomText fontFamily={FONTS.Medium} variant="h8" style={styles.retryButtonText}>
                Retry
              </CustomText>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </CustomSafeAreaView>
    );
  }

  return (
    <CustomSafeAreaView style={styles.container}>
      {/* Directly render the active tab component which includes the header */}
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
    paddingBottom: 5,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.black,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#333',
    position: 'relative',
    zIndex: 10,
    height: 70,
    marginBottom: 5,
  },
  tabBar: {
    width: `${100 / 3}%`, // For 3 tabs
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  indicatorStyle: {
    position: 'absolute',
    bottom: 0,
    width: width / 3,
    height: 3,
  },
  gradientIndicator: {
    height: '100%',
    width: '50%',
    marginLeft: '25%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
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
    color: Colors.white,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  retryButton: {
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  retryGradient: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    color: Colors.white,
  },
});

export default ProfileScreen;