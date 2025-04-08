import React, {FC, useEffect, useState} from 'react';
import CustomGradient from '../../components/global/CustomGradient';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import {
  StyleSheet, 
  TouchableOpacity, 
  View,
  Dimensions,
  ActivityIndicator,
  Modal,
  Share,
  Platform,
} from 'react-native';
import ReelListTab from '../../components/profile/ReelListTab';
import {Colors, useThemeColors} from '../../constants/Colors';
import Icon from 'react-native-vector-icons/Ionicons';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomHeader from '../../components/global/CustomHeader';
import MinimalUserProfileDetails from '../../components/profile/MinimalUserProfileDetails';
import {useAppDispatch} from '../../redux/reduxHook';
import {fetchUserByUsername} from '../../redux/actions/userAction';
import {useRoute} from '@react-navigation/native';
import {FONTS} from '../../constants/Fonts';
import CustomText from '../../components/global/CustomText';

const {width} = Dimensions.get('window');

interface MenuOptionProps {
  icon: string;
  text: string;
  onPress: () => void;
}

const MenuOption: React.FC<MenuOptionProps> = ({ icon, text, onPress }) => {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Icon name={icon} size={RFValue(18)} color={colors.text} style={styles.menuIcon} />
      <CustomText 
        variant="h8" 
        fontFamily={FONTS.Medium} 
        style={[styles.menuText, { color: colors.text }]}
      >
        {text}
      </CustomText>
    </TouchableOpacity>
  );
};

const UserProfileScreen: FC = () => {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const userParam = route.params as any;
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const colors = useThemeColors();

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

  const handleShareProfile = () => {
    setMenuVisible(false);
    
    if (!user) return;
    
    const profileUrl = `${
      Platform.OS == 'android' ? 'https://recaps-backend-277610981315.asia-south1.run.app' : 'reelzzz:/'
    }/share/user/${user.username}`;
    
    const message = `Hey, Checkout this profile: ${profileUrl}`;

    Share.share({
      message: message,
    })
      .then(res => {
        console.log('Share Result', res);
      })
      .catch(error => {
        console.log('Share Error', error);
      });
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const MyTabs = [
    {
      name: 'Reels',
      component: loading ? <></> : <ReelListTab user={user} type="post" key="post" />,
      icon: 'grid-outline',
    },
    {
      name: 'Liked',
      component: loading ? <></> : <ReelListTab user={user} type="liked" key="liked" />,
      icon: 'heart-outline',
    },
    {
      name: 'History',
      component: loading ? <></> : <ReelListTab user={user} type="watched" key="watched" />,
      icon: 'time-outline',
    },
  ];

  return (
    <CustomSafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader 
        title={user?.username || ''} 
        onMenuPress={toggleMenu}
      />
      {loading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* User Profile Details - hide the menu in component */}
          <View style={styles.headerContainer}>
            <MinimalUserProfileDetails
              refetchLoginUser={refetchLoginUser}
              user={user}
              hideMenu={true}
            />
          </View>
          
          {/* Custom Tab Bar */}
          <View style={[styles.tabBarContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {MyTabs.map((tab, index) => (
              <TouchableOpacity
                key={`tab-${index}`}
                style={[
                  styles.tabItem,
                  activeTab === index && [styles.activeTabItem, { borderBottomColor: colors.text }]
                ]}
                onPress={() => setActiveTab(index)}>
                <Icon
                  name={tab.icon}
                  size={RFValue(20)}
                  color={
                    activeTab === index ? colors.text : colors.inactive_tint
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
          
          {/* Content Area */}
          <View style={[styles.tabContentContainer, { backgroundColor: colors.background }]}>
            {MyTabs[activeTab].component}
          </View>
        </View>
      )}

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
            <MenuOption 
              icon="share-social-outline" 
              text="Share Profile" 
              onPress={handleShareProfile} 
            />
          </View>
        </TouchableOpacity>
      </Modal>
      
      <CustomGradient position="bottom" />
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  headerContainer: {
    paddingVertical: 0,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
  tabContentContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    borderRadius: 8,
    marginTop: 60,
    marginRight: 16,
    width: 180,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
  },
});

export default UserProfileScreen;
