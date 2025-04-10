import React, {FC, useEffect, useState} from 'react';
import CustomGradient from '../../components/global/CustomGradient';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import {
  StyleSheet, 
  TouchableOpacity, 
  View,
  Dimensions,
  ActivityIndicator
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

const {width} = Dimensions.get('window');

const UserProfileScreen: FC = () => {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const userParam = route.params as any;
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    const data = await dispatch(fetchUserByUsername(userParam?.username));
    setUser(() => ({ ...data }));
    setLoading(false);
  };

  const refetchLoginUser = async () => {
    const data = await dispatch(fetchUserByUsername(userParam?.username));
    setUser(
      prevState =>
        ({
          ...prevState,
          followersCount: data?.followersCount,
        } as User),
    );
  };

  useEffect(() => {
    fetchUser();
  }, [userParam?.username]);

  const MyTabs = [
    {
      name: 'Reel',
      component: loading ? <></> : <ReelListTab user={user} type="post" key="post" />,
      icon: 'apps-sharp',
    },
    {
      name: 'Liked',
      component: loading ? <></> : <ReelListTab user={user} type="liked" key="liked" />,
      icon: 'heart',
    },
    {
      name: 'History',
      component: loading ? <></> : <ReelListTab user={user} type="watched" key="watched" />,
      icon: 'logo-tableau',
    },
  ];

  return (
    <CustomSafeAreaView style={styles.container}>
      <CustomHeader title={user?.username || ''} />
      {loading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="white" />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* User Profile Details */}
          <View style={styles.headerContainer}>
            <UserProfileDetails
              refetchLoginUser={() => refetchLoginUser()}
              user={user}
            />
          </View>
          
          {/* Custom Tab Bar */}
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
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  headerContainer: {
    paddingVertical: 20,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.black,
    borderTopWidth: 1,
    borderColor: Colors.black,
    position: 'relative',
    zIndex: 10,
  },
  tabBar: {
    width: `${100 / 3}%`, // For 3 tabs
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  tabContentContainer: {
    flex: 1,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 0.8,
    width: '100%',
  },
  indicatorStyle: {
    position: 'absolute',
    bottom: 0,
    height: 0.8,
    backgroundColor: 'white',
  },
});

export default UserProfileScreen;
