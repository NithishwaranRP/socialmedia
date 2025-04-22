import React, {useState} from 'react';
import {Image, ScrollView, View, TextInput, StyleSheet} from 'react-native';
import CustomHeader from '../../components/global/CustomHeader';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import GradientButton from '../../components/global/GradientButton';
import {useRoute} from '@react-navigation/native';
import {Colors, useThemeColors} from '../../constants/Colors';
import {FONTS} from '../../constants/Fonts';
import {goBack} from '../../utils/NavigationUtil';
import {useRemixUpload} from '../../components/uploadservice/RemixUploadContext';
import CustomText from '../../components/global/CustomText';

interface uriData {
  file_uri: string;
}

const UploadRemixScreen: React.FC = () => {
  const data = useRoute();
  const item = data?.params as uriData;
  const [caption, setCaption] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const {startUpload} = useRemixUpload();
  const colors = useThemeColors();

  return (
    <CustomSafeAreaView>
      <CustomHeader title="Upload" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.flexDirectionRow}>
          <TextInput
            style={[styles.input, styles.textArea, {color: colors.text}]}
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
        
        <GradientButton
          text="Upload"
          iconName="upload"
          onPress={() => {
            goBack();
            startUpload(item?.file_uri, caption, url);
          }}
        />
      </ScrollView>
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  flexDirectionRow: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    fontFamily: FONTS.Medium,
    padding: 10,
    width: '100%',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  urlSection: {
    width: '100%',
    marginBottom: 20,
  },
  urlInput: {
    height: 45,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    fontFamily: FONTS.Medium,
    padding: 10,
  },
});

export default UploadRemixScreen;