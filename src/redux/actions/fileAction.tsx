import axios from 'axios';
import { Alert } from 'react-native';
import { UPLOAD } from '../API'; // Ensure UPLOAD contains your correct endpoint URL

export const uploadFile = (local_uri: string, mediaType: string) => async (dispatch: any) => {
  try {
    const formData = new FormData();
    console.log(formData);
    formData.append('image', {
      uri: local_uri, // Use the full local URI (e.g., "file:///...")
      name: 'file',   // You can improve this by extracting a proper filename if needed
      type: 'video/mp4', // Adjust if uploading images; for videos, keep as 'video/mp4'
    });
    formData.append('mediaType', mediaType);

    console.log("📤 Sending FormData:", formData);

    const res = await axios.post(UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data, headers) => {
        console.log("Data before sending:", data);
        console.log("Headers:", headers);
        console.log("formData:", formData);
        return formData; // Override so Axios does not stringify the FormData
      },
      onUploadProgress: progressEvent => {
        // console.log(`📶 Upload progress: ${(progressEvent.loaded / progressEvent.total) * 100}%`);
      },
    });

    console.log("✅ Upload response:", res.data);
    return res.data.mediaUrl;
  } catch (error) {
    console.log("❌ Upload error:", JSON.stringify(error));
    Alert.alert('Upload error', 'There was an upload error');
    return null;
  }
};
