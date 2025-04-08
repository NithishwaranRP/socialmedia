import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React, {FC} from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon2 from 'react-native-vector-icons/MaterialIcons';
import {useThemeColors} from '../../constants/Colors';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from '../global/CustomText';
import {launchCamera} from 'react-native-image-picker';
import {createThumbnail} from 'react-native-create-thumbnail';
import {navigate} from '../../utils/NavigationUtil';
import { StatusBar } from 'react-native';
import { Platform } from 'react-native';

const PickerReelButton: FC = () => {
  const colors = useThemeColors();
  
  const handleCamera = async () => {
    await launchCamera({
      saveToPhotos: false,
      formatAsMp4: true,
      mediaType: 'video',
      includeExtra: true,
    })
      .then(res => {
        console.log(res);

        createThumbnail({
          url: res.assets![0].uri || '',
          timeStamp: 100,
        })
          .then(response => {
            if (res.assets![0].uri) {
              navigate('UploadReelScreen', {
                thumb_uri: response.path,
                file_uri: res.assets![0].uri,
              });
            }
          })
          .catch(err => {
            console.log('Error', err);
          });
      })
      .catch(err => {
        console.log('Video Record', err);
      });
  };

  return (
    <View style={styles.flexRowBetween}>
      {/* <StatusBar barStyle="light-content" backgroundColor= {colors.background} translucent={true} /> */}
      
      <TouchableOpacity style={[styles.btn, {backgroundColor: colors.lightText}]} onPress={() => handleCamera()}>
        <Icon name="camera-outline" color={colors.white} size={RFValue(20)} />
        <CustomText variant="h8" style={[styles.btnText, {color: colors.text}]}>
          Camera
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, {backgroundColor: colors.lightText}]}>
        <Icon2 name="my-library-add" color={colors.white} size={RFValue(20)} />
        <CustomText variant="h8" style={[styles.btnText, {color: colors.text}]}>
          Drafts
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, {backgroundColor: colors.lightText}]}>
        <Icon2 name="auto-fix-high" color={colors.white} size={RFValue(20)} />
        <CustomText variant="h8" style={[styles.btnText, {color: colors.text}]}>
          Templates
        </CustomText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  flexRowBetween: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
        marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    
  },
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    width: '30%',
    height: 100,
    borderRadius: 10,
  },
  btnText: {
    marginTop: 5,
  },
});

export default PickerReelButton;
