import React, {FC, useEffect, useState, useRef} from 'react';
import CustomGradient from '../../components/global/CustomGradient';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import {
  StyleSheet, 
  TouchableOpacity, 
  View,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import ReelListTab from '../../components/profile/ReelListTab';
import {Colors} from '../../constants/Colors';
import Icon from 'react-native-vector-icons/Ionicons';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomHeader from '../../components/global/CustomHeader';
import UserProfileDetails from '../../components/profile/UserProfileDetails';
import {useAppDispatch} from '../../redux/reduxHook';
import {fetchUserByUsername} from '../../redux/actions/userAction';
import {useRoute} from '@react-navigation/native';
import CustomText from '../../components/global/CustomText';
import {FONTS} from '../../constants/Fonts';
import LinearGradient from 'react-native-linear-gradient';

const {width} = Dimensions.get('window');

const UserProfileScreen: FC = () => {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const userParam = route.params as any;
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animation for tab indicator
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeTab,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dispatch(fetchUserByUsername(userParam?.username));
      setUser(() => ({ ...data }));
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Could not load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refetchLoginUser = async () => {
    try {
      const data = await dispatch(fetchUserByUsername(userParam?.username));
      setUser(
        prevState =>
          ({
            ...prevState,
            followersCount: data?.followersCount,
          } as User),
      );
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userParam?.username]);
  
  // Profile and tab header component
  const ProfileAndTabHeader = () => (
    <>
      {/* User Profile Details */}
      <View style={styles.headerContainer}>
        <UserProfileDetails
          refetchLoginUser={refetchLoginUser}
          user={user}
        />
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
      component: loading ? <></> : (
        <ReelListTab 
          user={user} 
          type="post" 
          key="post" 
          headerComponent={<ProfileAndTabHeader />} 
        />
      ),
      icon: 'apps-sharp',
    },
    {
      name: 'Liked',
      component: loading ? <></> : (
        <ReelListTab 
          user={user} 
          type="liked" 
          key="liked" 
          headerComponent={<ProfileAndTabHeader />}
        />
      ),
      icon: 'heart',
    },
    {
      name: 'History',
      component: loading ? <></> : (
        <ReelListTab 
          user={user} 
          type="watched" 
          key="watched" 
          headerComponent={<ProfileAndTabHeader />}
        />
      ),
      icon: 'logo-tableau',
    },
  ];

  if (error) {
    return (
      <CustomSafeAreaView style={styles.container}>
        <CustomHeader title={userParam?.username || ''} />
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(2,11,23,0.95)']}
          style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={RFValue(50)} color={Colors.white} />
          <CustomText fontFamily={FONTS.Medium} variant="h6" style={styles.errorText}>
            {error}
          </CustomText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchUser}
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
      <CustomHeader title={user?.username || userParam?.username || ''} />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.white} />
        </View>
      ) : (
        <View style={styles.mainContainer}>
          {/* Directly render the active tab component which includes the header */}
          <View style={styles.tabContentContainer}>
            {MyTabs[activeTab].component}
          </View>
        </View>
      )}
      
      <CustomGradient position="bottom" />
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
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
  tabContentContainer: {
    flex: 1,
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

export default UserProfileScreen;
