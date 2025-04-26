import React, {useMemo, useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Platform,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import {Colors, useThemeColors} from '../../constants/Colors';
import CustomText from '../global/CustomText';
import MinimalButton from '../global/MinimalButton';
import {navigate, push} from '../../utils/NavigationUtil';
import {useAppDispatch, useAppSelector} from '../../redux/reduxHook';
import {selectUser} from '../../redux/reducers/userSlice';
import {selectFollowings} from '../../redux/reducers/followingSlice';
import {toggleFollow} from '../../redux/actions/userAction';
import Icon from 'react-native-vector-icons/Ionicons';

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
        style={[styles.statCount, {color: colors.text}]}
      >
        {count}
      </CustomText>
      <CustomText 
        variant="h8" 
        fontFamily={FONTS.Medium} 
        style={[styles.statLabel, {color: colors.lightText}]}
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

interface MinimalUserProfileDetailsProps {
  user: any;
  refetchLoginUser: () => void;
  hideMenu?: boolean;
}

const MinimalUserProfileDetails: React.FC<MinimalUserProfileDetailsProps> = ({
  user,
  refetchLoginUser,
  hideMenu = false
}) => {
  const colors = useThemeColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const loggedInUser = useAppSelector(selectUser);
  const followingUsers = useAppSelector(selectFollowings);
  const dispatch = useAppDispatch();

  const isFollowing = useMemo(() => {
    return (
      followingUsers?.find((item: any) => item.id === user.id)?.isFollowing ??
      user.isFollowing
    );
  }, [followingUsers, user.id, user.isFollowing]);

  const handleFollow = async () => {
    const data = await dispatch(toggleFollow(user.id));
    refetchLoginUser();
  };

  const handleShareProfile = () => {
    setMenuVisible(false);
    
    const profileUrl = `${
      // Platform.OS == 'android' ? 'http://192.168.88.133:8080' : 'reelzzz:/'
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with 3-dot menu - only show if hideMenu is false */}
      {!hideMenu && (
        <View style={styles.header}>
          <View style={{flex: 1}} />
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <Icon name="ellipsis-vertical" size={RFValue(20)} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Section */}
      <View style={styles.profileSection}>
        {/* Avatar on left */}
        <View style={styles.avatarContainer}>
          <FastImage
            source={{uri: user?.userImage, priority: FastImage.priority.high}}
            style={styles.avatar}
          />
        </View>
        
        {/* Right Side - Stats and Follow Button */}
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
          
          {/* Follow/Unfollow button below stats */}
          <View style={styles.followButtonContainer}>
            <MinimalButton
              text={
                loggedInUser?.id == user?.id
                  ? 'Edit Profile'
                  : isFollowing
                  ? 'Unfollow'
                  : 'Follow'
              }
              variant={
                loggedInUser?.id == user?.id || isFollowing
                  ? 'outline'
                  : 'default'
              }
              size="sm"
              onPress={
                loggedInUser?.id == user?.id
                  ? () => {
                      // handle edit profile
                    }
                  : () => handleFollow()
              }
              fullWidth={true}
            />
          </View>
        </View>
      </View>
      
      {/* User Info Section */}
      <View style={styles.userInfoContainer}>
        <CustomText 
          variant="h6" 
          fontFamily={FONTS.SemiBold} 
          style={[styles.userName, {color: colors.text}]}
        >
          {user?.name}
        </CustomText>
        
        {user?.bio && (
          <CustomText
            variant="h8"
            style={[styles.bio, {color: colors.lightText}]}
            fontFamily={FONTS.Regular}
            numberOfLines={3}>
            {user?.bio}
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
              icon="share-social-outline" 
              text="Share Profile" 
              onPress={handleShareProfile} 
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
  followButtonContainer: {
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
});

export default MinimalUserProfileDetails; 