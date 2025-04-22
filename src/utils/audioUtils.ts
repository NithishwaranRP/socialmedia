/**
 * Audio utilities for processing audio data for Interactive Avatar API
 */

import { Platform } from 'react-native';
import base64 from 'base-64';

/**
 * Encodes PCM audio data to base64 for sending to the HeyGen API
 * @param audioData Binary PCM audio data
 * @returns Base64 encoded string
 */
export const encodeAudioToBase64 = (audioData: ArrayBuffer): string => {
  // Convert array buffer to a format that can be base64 encoded
  const bytes = new Uint8Array(audioData);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64.encode(binary);
};

/**
 * Converts text to synthetic speech audio
 * This is a placeholder that would typically call a TTS service
 * In a real implementation, you would integrate with a TTS service or use
 * a speech synthesis library
 * 
 * @param text Text to convert to speech
 * @returns Promise resolving to base64 encoded PCM audio data
 */
export const textToSpeechAudio = async (text: string): Promise<string> => {
  // In a real implementation, you would call a TTS service
  // and get back PCM audio data (16bit, 24kHz)
  
  console.log('Converting text to speech:', text);
  
  // For demo purposes, return a placeholder
  // In a real app, you would use something like:
  // - React Native TTS
  // - Cloud TTS API (Google, Amazon, Azure)
  // - Or a local TTS library
  
  // Return a mock base64 encoded audio string
  return 'base64_encoded_audio_placeholder';
};

/**
 * Formats audio data for use with the HeyGen Interactive Avatar API
 * @param audioData Raw PCM audio data
 * @returns Formatted audio data ready to send to the API
 */
export const formatAudioForHeyGen = (audioData: ArrayBuffer): string => {
  // Ensure audio is 16-bit PCM, 24kHz mono
  // This might involve resampling in a real implementation
  
  // For now, just encode to base64
  return encodeAudioToBase64(audioData);
};

/**
 * Converts speech recognition results to audio buffer
 * This is needed because the Interactive Avatar API expects audio input,
 * not text. In a real integration, you would use a TTS service to
 * convert the recognized text to audio.
 * 
 * @param recognizedText Text from speech recognition
 * @returns Promise resolving to base64 encoded PCM audio
 */
export const speechRecognitionToAudio = async (recognizedText: string): Promise<string> => {
  // Use the text-to-speech function to convert text to audio
  return await textToSpeechAudio(recognizedText);
};

export default {
  encodeAudioToBase64,
  textToSpeechAudio,
  formatAudioForHeyGen,
  speechRecognitionToAudio
}; 