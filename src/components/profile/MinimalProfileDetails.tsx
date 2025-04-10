import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Modal} from 'react-native';
import FastImage from 'react-native-fast-image';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import {Colors, useThemeColors} from '../../constants/Colors';
import CustomText from '../global/CustomText';
import MinimalButton from '../global/MinimalButton';
import {navigate, push} from '../../utils/NavigationUtil';
import {useAppDispatch} from '../../redux/reduxHook';
import {Logout} from '../../redux/actions/userAction';
import Icon from 'react-native-vector-icons/Ionicons';
import ThemeToggle from '../ThemeToggle';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';

interface StatItemProps {
  label: string;
  count: string | number;
  onPress?: () => void;
}

const StatItem: React.FC<StatItemProps> = ({label, count, onPress}) => {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity style={styles.statItem} onPress={onPress} disabled={!onPress}>
      <CustomText 
        variant="h6" 
        fontFamily={FONTS.SemiBold} 
        style={[styles.statCount, { color: colors.text }]}
      >
        {count}
      </CustomText>
      <CustomText 
        variant="h8" 
        fontFamily={FONTS.Medium} 
        style={[styles.statLabel, { color: colors.lightText }]}
      >
        {label}
      </CustomText>
    </TouchableOpacity>
  );
};

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
        style={[styles.menuText, {color: colors.text}]}
      >
        {text}
      </CustomText>
    </TouchableOpacity>
  );
};

interface MinimalProfileDetailsProps {
  user: User;
}

const MinimalProfileDetails: React.FC<MinimalProfileDetailsProps> = ({user}) => {
  const colors = useThemeColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const dispatch = useAppDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);

  const handleEditProfile = () => {
    setMenuVisible(false);
    // handle edit profile
  };

  const handleLogout = () => {
    setMenuVisible(false);
    dispatch(Logout());
    navigate('LoginScreen');
  };

  const navigateToRedeemScreen = () => {
    navigate('ReedemScreen', {
      user: user,
    });
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      {/* Header with 3-dot menu */}
      <View style={styles.header}>
        <View style={{flex: 1}} />
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Icon name="ellipsis-vertical" size={RFValue(20)} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        {/* Avatar on left */}
        <View style={styles.avatarContainer}>
          <FastImage
            source={{uri: user?.userImage, priority: FastImage.priority.high}}
            style={styles.avatar}
          />
        </View>
        
        {/* Right Side - Stats and Redeem Button */}
        <View style={styles.rightContainer}>
          {/* Stats in a row */}
          <View style={styles.statsContainer}>
            <StatItem 
              count={user?.followersCount} 
              label="Followers"
              onPress={() => {
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Followers',
                });
              }}
            />
            
            <StatItem 
              count={user?.reelsCount} 
              label="Reels"
            />
            
            <StatItem 
              count={user?.followingCount} 
              label="Following"
              onPress={() => {
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Following',
                });
              }}
            />
          </View>
          
          {/* Redeem button below stats */}
          <View style={styles.redeemButtonContainer}>
            <MinimalButton
              text="Redeem"
              iconName="wallet-giftcard"
              variant="default"
              size="sm"
              onPress={navigateToRedeemScreen}
              fullWidth={true}
            />
          </View>
        </View>
      </View>
      
      {/* User Info Section */}
      <View style={styles.userInfoContainer}>
        <CustomText variant="h6" fontFamily={FONTS.SemiBold} style={[styles.userName, {color: colors.text}]}>
          {user.name}
        </CustomText>
        
        {user?.bio && (
          <CustomText
            variant="h8"
            style={[styles.bio, {color: colors.lightText}]}
            fontFamily={FONTS.Regular}
            numberOfLines={3}>
            {user.bio}
          </CustomText>
        )}
      </View>

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
          <View style={[styles.menuContainer, {backgroundColor: colors.card}]}>
            <MenuOption 
              icon="create-outline" 
              text="Edit Profile" 
              onPress={handleEditProfile} 
            />
            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />
            
            <View style={styles.themeToggleMenuItem}>
              <Icon 
                name={isDarkMode ? "moon-outline" : "sunny-outline"} 
                size={RFValue(18)} 
                color={colors.text} 
                style={styles.menuIcon} 
              />
              <CustomText 
                variant="h8" 
                fontFamily={FONTS.Medium} 
                style={[styles.menuText, {flex: 1, color: colors.text}]}
              >
                Theme
              </CustomText>
              <ThemeToggle />
            </View>
            
            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />
            <MenuOption 
              icon="log-out-outline" 
              text="Logout" 
              onPress={handleLogout} 
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuButton: {
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: RFValue(80),
    height: RFValue(80),
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#333',
  },
  rightContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statCount: {
    marginBottom: 2,
  },
  statLabel: {
  },
  redeemButtonContainer: {
    width: '100%',
  },
  userInfoContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
  },
  userName: {
    marginBottom: 4,
  },
  bio: {
    lineHeight: 18,
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
  menuDivider: {
    height: 1,
    marginHorizontal: 8,
  },
  themeToggleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});

export default MinimalProfileDetails; 