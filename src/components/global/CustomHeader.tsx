import {View, Text, TouchableOpacity} from 'react-native';
import React, {FC} from 'react';
import {goBack} from '../../utils/NavigationUtil';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import IconIonicons from 'react-native-vector-icons/Ionicons';
import {useThemeColors} from '../../constants/Colors';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from './CustomText';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
}

const CustomHeader: FC<HeaderProps> = ({title, onMenuPress}) => {
  const colors = useThemeColors();
  
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: 5,
        backgroundColor: colors.background,
      }}>
      <TouchableOpacity onPress={() => goBack()}>
        <Icon
          name="keyboard-backspace"
          color={colors.text}
          size={RFValue(20)}
        />
      </TouchableOpacity>
      <CustomText variant="h4">{title}</CustomText>
      <TouchableOpacity onPress={onMenuPress}>
        <IconIonicons
          name="ellipsis-vertical"
          color={colors.text}
          size={RFValue(20)}
        />
      </TouchableOpacity>
    </View>
  );
};

export default CustomHeader;
