import React, {useState} from 'react';
import {Image, ScrollView, View, TextInput, StyleSheet, Platform} from 'react-native';
import CustomHeader from '../../components/global/CustomHeader';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import GradientButton from '../../components/global/GradientButton';
import {useRoute} from '@react-navigation/native';
import {Colors, useThemeColors} from '../../constants/Colors';
import {FONTS} from '../../constants/Fonts';
import {useUpload} from '../../components/uploadservice/UploadContext';
import {goBack} from '../../utils/NavigationUtil';
import DropDownPicker from 'react-native-dropdown-picker';
import CustomText from '../../components/global/CustomText';

interface uriData {
  thumb_uri: string;
  file_uri: string;
}

const UploadReelScreen: React.FC = () => {
  const data = useRoute();
  const item = data?.params as uriData;
  const [caption, setCaption] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const {startUpload} = useUpload();
  const colors = useThemeColors();
  
  // Dropdown state
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('english');
  const [languages, setLanguages] = useState([
    {label: 'English', value: 'english'},
    {label: 'Tamil', value: 'tamil'},
    {label: 'Hindi', value: 'hindi'},
  ]);

  return (
    <CustomSafeAreaView style={{position: 'relative', zIndex: 1}}>
      <CustomHeader title="Upload" />
      <ScrollView 
        contentContainerStyle={styles.container} 
        nestedScrollEnabled={true}
        scrollEnabled={!open} // Prevent scrolling when dropdown is open
      >
        <View style={styles.flexDirectionRow}>
          <Image source={{uri: item?.thumb_uri}} style={styles.img} />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={caption}
            placeholderTextColor={Colors.border}
            onChangeText={setCaption}
            placeholder="Enter your caption here..."
            multiline={true}
            numberOfLines={8}
          />
        </View>
        
        <View style={styles.urlSection}>
          <CustomText 
            style={{color: colors.text, marginBottom: 5}}
            fontFamily={FONTS.Medium}
          >
            Optional URL Link:
          </CustomText>
          <TextInput
            style={[styles.urlInput, {backgroundColor: colors.card, color: colors.text}]}
            value={url}
            placeholderTextColor={Colors.border}
            onChangeText={setUrl}
            placeholder="Enter an optional URL (e.g., website, profile)..."
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        
        <View style={styles.languageSection}>
          <CustomText 
            style={{color: colors.text, marginBottom: 10}}
            fontFamily={FONTS.Medium}
          >
            Select Language:
          </CustomText>
          <DropDownPicker
            open={open}
            value={language}
            items={languages}
            setOpen={setOpen}
            setValue={setLanguage}
            setItems={setLanguages}
            style={[styles.dropdown, {backgroundColor: colors.card}]}
            dropDownContainerStyle={[styles.dropdownContainer, {backgroundColor: colors.card}]}
            textStyle={{color: colors.text, fontFamily: FONTS.Medium}}
            listItemLabelStyle={{color: colors.text}}
            arrowIconStyle={{tintColor: colors.text}}
            tickIconStyle={{tintColor: colors.theme}}
            zIndex={5000}
            zIndexInverse={6000}
            listMode="SCROLLVIEW"
            scrollViewProps={{
              nestedScrollEnabled: true,
            }}
          />
          {language && (
            <CustomText 
              style={{
                color: colors.theme, 
                marginTop: 5, 
                fontSize: 12,
                textAlign: 'right'
              }}
              fontFamily={FONTS.Regular}
            >
              Your reel will be posted in {language.charAt(0).toUpperCase() + language.slice(1)}
            </CustomText>
          )}
        </View>
        
        <View style={{marginTop: open ? 120 : 20, width: '100%', alignItems: 'center'}}>
          <GradientButton
            text="Upload"
            iconName="upload"
            style={{alignItems: 'center', justifyContent: 'center'}}
            textStyle={{textAlign: 'center', fontWeight: 'bold'}}
            onPress={() => {
              goBack();
              startUpload(item?.thumb_uri, item?.file_uri, caption, language, url);
            }}
          />
        </View>
      </ScrollView>
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 5,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  flexDirectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  input: {
    height: 150,
    borderColor: 'gray',
    borderWidth: 1,
    color: Colors.text,
    borderRadius: 5,
    fontFamily: FONTS.Medium,
    padding: 10,
    marginVertical: 10,
    width: '68%',
  },
  img: {
    width: '25%',
    height: 150,
    resizeMode: 'cover',
    borderRadius: 10,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  urlSection: {
    width: '95%',
    marginTop: 5,
    marginBottom: 10,
  },
  urlInput: {
    height: 45,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    fontFamily: FONTS.Medium,
    padding: 10,
  },
  languageSection: {
    width: '95%',
    marginVertical: 10,
    zIndex: 1000,
    position: 'relative',
  },
  dropdown: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: Platform.OS === 'android' ? 20 : 0,
  },
  dropdownContainer: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default UploadReelScreen;
