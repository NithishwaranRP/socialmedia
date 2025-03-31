import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Platform,
    Text,Modal,ScrollView,TextInput,ProgressBarAndroid,
    Animated,NativeModules,Image
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import Video from 'react-native-video';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useRoute } from '@react-navigation/native';
import GradientButton from '../../components/global/GradientButton';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppSelector} from '../../redux/reduxHook';
import {selectUser} from '../../redux/reducers/userSlice';
import { goBack, navigate } from '../../utils/NavigationUtil';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { FONTS } from '../../constants/Fonts';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient'; // Add this line
import RNFS from 'react-native-fs';
import { FFmpegKit, FFmpegKitConfig  } from 'ffmpeg-kit-react-native';
import convertToProxyURL from 'react-native-video-cache';

const { VideoOverlay } = NativeModules;

const RemixScreen = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [device, setDevice] = useState(null);
    const [recordedVideo, setRecordedVideo] = useState(null);
    const [response, setResponse] = useState(null);
    const [isPreview, setIsPreview] = useState(false);
    const [mergedVideoPath, setMergedVideoPath] = useState(null);
    const [isPlayingMerged, setIsPlayingMerged] = useState(false);
    const [playBgVideo, setPlayBgVideo] = useState(false);
    const [playRecordedVideo, setPlayRecordedVideo] = useState(false); // For controlling the recorded video playback
    const [isMuted, setIsMuted] = useState(false);
    const cameraRef = useRef(null);
    const devices = useCameraDevices();
    const route = useRoute();
    const [animatedValue] = useState(new Animated.Value(0));
    const { reelUri } = route.params || {};
    const [recordingTimer, setRecordingTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isUploadPopupVisible, setIsUploadPopupVisible] = useState(false);
    const [showPreviewPopup, setShowPreviewPopup] = useState(false);
    const [isUploadInProgress, setIsUploadInProgress] = useState(false);
    const user = useAppSelector(selectUser);
    const videoRef = useRef(null);
    const [countdown, setCountdown] = useState(null);
    const scaleValue = useRef(new Animated.Value(1)).current;
    const [caption, setCaption] = useState(reelUri.caption || '');
    const [isMerging, setIsMerging] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [thumbnailPath, setThumbnailPath] = useState(null);

    const checkPermissions = async () => {
        const cameraPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
        const microphonePermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;

        try {
            const cameraStatus = await check(cameraPermission);
            const microphoneStatus = await check(microphonePermission);

            if (cameraStatus !== RESULTS.GRANTED) {
                await request(cameraPermission);
            }
            if (microphoneStatus !== RESULTS.GRANTED) {
                await request(microphonePermission);
            }

            return true;
        } catch (error) {
            console.error('Permission error:', error);
            return false;
        }
    };

    const animateCountdown = () => {
        Animated.sequence([
            Animated.timing(scaleValue, {
                toValue: 1.5, // Scale up
                duration: 300, // duration of scaling up
                useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
                toValue: 1, // Scale back down
                duration: 300, // duration of scaling down
                useNativeDriver: true,
            }),
        ]).start();
    };

    useEffect(() => {
        const initializePermissions = async () => {
            const isGranted = await checkPermissions();
            setHasPermission(isGranted);
        };
        initializePermissions();
    }, []);

    const frontCamera = devices.find(device => device.position === 'front');

    useEffect(() => {
        if (frontCamera) {
            setDevice(frontCamera);
        }
    }, [devices]);

    const mergeVideos = async () => {
        if (!recordedVideo) {
            Alert.alert('Invalid Video', 'Please ensure a video is recorded before merging.');
            return;
        }
        setIsMerging(true);
        startAnimation();
        try {
            const outputFilePath = `${recordedVideo.replace('.mov', '_composite.mp4')}`;
            console.log('Merging video with path:', { recordedVideo, outputFilePath });
    
            const exists = await RNFS.exists(outputFilePath);
            if (exists) {
                await RNFS.unlink(outputFilePath);
                console.log('Existing file deleted:', outputFilePath);
            }
           
            const muteFlag = isMuted ? '-an' : ''; // Add this line
            // const command = `-i ${reelUri.videoUri} ${muteFlag} -i ${recordedVideo} -filter_complex "[1:v]scale=iw*0.2:ih*0.2[overlayed];[0:v][overlayed]overlay=W-w-5:H-h-5" -c:a aac -b:a 192k ${outputFilePath}`;
            // const command = `-i ${reelUri.videoUri} ${muteFlag} -i ${recordedVideo} -filter_complex "[1:v]scale=iw*0.2:ih*0.2[overlayed];[0:v][overlayed]overlay=W-w-5:H-h-5" -c:v libx264 -c:a aac -b:a 192k ${outputFilePath}`;
            // const command = `-i ${reelUri.videoUri} -i ${recordedVideo} -filter_complex "[1:v]scale=iw*0.2:ih*0.2[overlayed];[0:v][overlayed]overlay=W-w-5:H-h-5" -an ${outputFilePath}`;
           // Determine audio mapping based on mute state
         // Prepare the audio mapping based on the mute state
         const audioMapping = isMuted 
        //  ? '-i an -map 1:a' // Only record audio from the recorded video
         ? '-map 1:a -map 1:a' // Only record audio from the recorded video
         : '-map 0:a -map 0:a'; // Include audio from both background and recorded videos
     console.log('audioMapping', audioMapping);
    //  const command = `-i ${reelUri.videoUri} -i ${recordedVideo} -filter_complex "[1:v]scale=iw*0.2:ih*0.2[overlayed];[0:v][overlayed]overlay=W-w-5:H-h-5" ${audioMapping} -c:v mpeg4 -c:a aac -b:a 192k ${outputFilePath}`;
    const command = `-i ${reelUri.videoUri} -i ${recordedVideo} -filter_complex "[1:v]scale=iw*0.25:ih*0.25[overlayed];[0:v][overlayed]overlay=W-w-45:H-h-45" ${audioMapping} -c:v mpeg4 -c:a aac -b:a 192k ${outputFilePath}`;
      const session = await FFmpegKit.execute(command);
            const returnCode = await session.getReturnCode();
            const returnCodeValue = returnCode.getValue();
        
            if (returnCodeValue === 0) {
                console.log('Video merged successfully:', outputFilePath);
                setMergedVideoPath(outputFilePath);
                setIsPreview(true);
    
                // Create thumbnail from the merged video
                await createThumbnail(outputFilePath);
            } else {
                console.error('Failed to merge videos with return code:', returnCodeValue);
                Alert.alert('Merge Failed', `Failed to complete the video merge: ${returnCodeValue}`);
            }
        } catch (error) {
            console.error('Error merging videos:', error);
            Alert.alert('Error', 'An unexpected error occurred while merging videos.');
        }finally {
            setIsMerging(false); // Stop loading
            stopAnimation(); // Stop the animation
        }
    };

      const createThumbnail = async (videoPath) => {
        const thumbnailPath = videoPath.replace('.mp4', '_thumbnail.jpg'); // Define your thumbnail path
        const thumbnailCommand = `-i ${videoPath} -ss 00:00:01.000 -vframes 1 ${thumbnailPath}`; // Captures a frame at 1 second 

        console.log('FFmpeg command for creating thumbnail:', thumbnailCommand);

        try {
            const session = await FFmpegKit.execute(thumbnailCommand);
            const returnCode = await session.getReturnCode();
            const returnCodeValue = returnCode.getValue();

            if (returnCodeValue === 0) {
                console.log('Thumbnail created successfully:', thumbnailPath);
                setThumbnailPath(thumbnailPath); // Save the thumbnail path to state
            } else {
                console.error('Failed to create thumbnail with return code:', returnCodeValue);
                Alert.alert('Thumbnail Creation Failed', `Failed to create thumbnail: ${returnCodeValue}`);
            }
        } catch (error) {
            console.error('Error creating thumbnail:', error);
            Alert.alert('Error', 'An error occurred while creating thumbnail.');
        }
    };

    const startRecording = async () => {
        if (isRecording) {
            console.warn('Recording is already in progress.');
            return; // Prevent starting a new recording if one is already active.
        }
    
        if (cameraRef.current) {
            try {
                setIsRecording(true);
                setPlayBgVideo(true); // Start the background video during recording
    
                await cameraRef.current.startRecording({
                    onRecordingFinished: async (video) => {
                        console.log('Recording finished with video:', video);
                        setRecordedVideo(video.path);
                        setIsRecording(false);
                        setPlayBgVideo(false); // Stop playing background video when done
                    },
                    onRecordingError: (error) => {
                        console.error('Recording error:', error);
                        setIsRecording(false);
                    },
                });
            } catch (error) {
                console.error('Error starting video recording:', error);
            }
        }
    };

    const stopRecording = async () => {
    if (!isRecording) {
        console.warn('No recording is in progress to stop.');
        return; // Prevent calling stop when there's no active recording
    }

    if (cameraRef.current) {
        try {
            await cameraRef.current.stopRecording();
            setIsRecording(false);
            setPlayBgVideo(false); // Stop background video after recording
            setShowPreviewPopup(true);
        } catch (error) {
            console.error('Error stopping video recording:', error);
        }
    }
};

const handleReRecord = async () => {
    setRecordedVideo(null); // Reset recorded video
    setCountdown(null); // Reset countdown
    setIsTimerRunning(false); // Ensure timer is not running
    setIsRecording(false); // Make sure we're not recording
    setShowPreviewPopup(false); // Close any open preview popups
    setIsPreview(false); // Reset preview state
    // Optionally reset more variables if needed
    console.log('clicked');
    await mergeVideos();
    setIsPreview(true);
};

    const startAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000, // Duration for one loop
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        ).start();
    };
    
    const stopAnimation = () => {
        animatedValue.stop();
        animatedValue.setValue(0); // Reset to the original value
    };

    const uploadVideo = async () => {
        if (!mergedVideoPath || !thumbnailPath) {
            Alert.alert('No video or thumbnail available', 'Please ensure the video and thumbnail have been created before uploading.');
            return;
        }

        const formData = new FormData();
        formData.append('video', {
            uri: Platform.OS === 'android' ? `file://${mergedVideoPath}` : mergedVideoPath,
            type: 'video/mp4',
            name: 'mergedVideo.mp4'
        });

        formData.append('thumbnail', {
            uri: Platform.OS === 'android' ? `file://${thumbnailPath}` : thumbnailPath,
            type: 'image/jpeg',
            name: 'thumbnail.jpg'
        });

        formData.append('caption', reelUri.caption);
        formData.append('userId', user?.id);

        try {
            setIsUploadInProgress(true);
            // const response = await fetch('http://192.168.170.133:8080/uploadVideo', {
            const response = await fetch('https://recaps-backend-277610981315.asia-south1.run.app/uploadVideo', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorResult = await response.json();
                Alert.alert('Upload Failed', errorResult.msg || 'Failed to upload video');
                return;
            }

            const result = await response.json();
            console.log('Upload Success:', result);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: result.msg,
                position: 'bottom',
                visibilityTime: 3000,
            });
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setIsUploadInProgress(false);
            setIsUploadPopupVisible(false);
            navigate('BottomTab', { screen: 'Home' });
        }
    };

    const loaderTranslateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20], // Change -10 to the desired height for your loader effect
    });


    const onTimerPress = () => {
        // If the recording timer is not active, start the countdown; otherwise, reset to 5 seconds
        if (!isTimerRunning) {
            setCountdown(5);
            setIsTimerRunning(true);
        } else {
            setCountdown(5); // Reset the countdown
        }
    };

    useEffect(() => {
        let countdownInterval;
    
        if (isTimerRunning && countdown > 0) {
            animateCountdown();
            countdownInterval = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            clearInterval(countdownInterval);
            startRecording(); // Start recording when countdown finishes
            setIsTimerRunning(false); // Reset timer state
        }
    
        return () => clearInterval(countdownInterval); // Cleanup interval on unmount
    }, [isTimerRunning, countdown]);


const previewVideo = response?.reel?.videoUri;
console.log('bgvideo', reelUri.videoUri);

    return (
        <View style={styles.container}>
           
             {!isPreview && !isMerging && (
                <Video
                    ref={videoRef}
                    poster={reelUri.thumbUri}
                    posterResizeMode="cover"
                    source={{ uri: convertToProxyURL(reelUri.videoUri) }}
                    style={styles.video}
                    resizeMode="cover"
                    paused={!playBgVideo}
                    muted={isMuted}
                    bufferConfig={{
                        minBufferMs: 10000,
                        maxBufferMs: 20000,
                        bufferForPlaybackMs: 5000,
                        bufferForPlaybackAfterRebufferMs: 5000,
                    }}
                    playWhenInactive={false}
                playInBackground={false}
                useTextureView={false}
                controls={false}
                disableFocus={true}
                    hideShutterView
                minLoadRetryCount={5}
                shutterColor="transparent"
                onBuffer={this.onBuffer} // Handle buffering
                onError={this.videoError} // Handle errors
                onEnd={() => setPlayBgVideo(false)} // Restart playback
                
                />
            )}
            {hasPermission && device && !isPreview && !isMerging && (
                <Camera 
                    ref={cameraRef}
                    style={styles.overlayCamera}
                    device={device}
                    isActive={true}
                    video={true}
                    audio={true}
                />
            )}

            {isMerging && (

            <View style={styles.overlay} >

            <Animated.View style={[styles.loaderContainer, { transform: [{ translateY: loaderTranslateY }] }]}>
            <LinearGradient
                colors={['#000000', '#434343', '#000000']} // retains your gradient design
                style={styles.loader}
            />
            <Text style={styles.loaderText}>Preparing for preview...</Text>
            </Animated.View>
            </View>
            )}
            {!isRecording && !isPreview && !isMerging &&(
                <View style={styles.iconContainer}>
                    <View style={styles.iconBackground}>
                        <TouchableOpacity onPress={() => setIsMuted(prev => !prev)} style={styles.iconButton}>
                            <Icon name={isMuted ? "volume-mute-outline" : "volume-high-outline"} size={30} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onTimerPress}>
                         <Text style={styles.timerText}>{'5s'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
 {isTimerRunning && (
                <Animated.View style={{ transform: [{ scale: scaleValue }], position: 'absolute', top: '50%', left: '50%', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -50 }, { translateY: -50 }] }}>
                    <Text style={styles.countdownText}>{countdown}s</Text>
                </Animated.View>
            )}
{isRecording && (
            <View style={styles.recordingIndicator}>
                <View style={styles.redDot} />
                <Text style={styles.recText}>REC</Text>
            </View>
        )}             
        {!isPreview && !isMerging && (
                <TouchableOpacity
                    style={[styles.recordButton, isRecording && styles.recording]}
                    onPress={isRecording ? stopRecording : startRecording}
                />
            )}
           {isPreview && mergedVideoPath && (
            <>
            <Video
                    source={{ uri: mergedVideoPath }} 
                    style={styles.video} 
                    resizeMode="cover"
                    controls={true} 
                    paused={!isPlayingMerged} 
                    onBuffer={this.onBuffer} // Handle buffering
                    onError={this.videoError} // Handle errors
                    onEnd={() => setIsPlayingMerged(false)} // Restart playback
                />
                <View style={styles.previewContainer}>

                        <View style={styles.progressBar}>
                            <View style={[styles.progress, { width: `${(currentTime / duration) * 100}%` }]} />
                        </View>
                        <TouchableOpacity onPress={() => setIsPlaying(prev => !prev)} style={styles.playButton}>
                            <Icon name={isPlaying ? "pause" : "play"} size={30} color="white" />
                        </TouchableOpacity>
                        <View style={styles.previewButtons}>
                        <LinearGradient
        colors={['#000000', '#434343']} // Gradient for the Cross button
        style={styles.gradientButton}
    >
        <TouchableOpacity
            style={styles.crossButtonTouchable}
            onPress={async () => {
                setIsPreview(false);
                setIsUploadCanceled(true);
                await uploadVideo();
                setRecordedVideo(null);
                videoRef.current?.seek(0);
            }}
        >
            <Icon name="close" size={30} color="white" />
        </TouchableOpacity>
    </LinearGradient>
    <LinearGradient
        colors={['#000000', '#434343']} // Gradient for the Tick button
        style={styles.gradientButton}
    >
       <TouchableOpacity
    style={styles.tickButtonTouchable}
    onPress={() => {
        try {
            console.log('clicked', isPlayingMerged);

            setIsPlayingMerged(false);
            setIsUploadPopupVisible(true);
        } catch (error) {
            // Handle errors from the upload process
            console.error('Error during upload:', error);
            Alert.alert('Upload Failed', 'There was an error uploading your video. Please try again.');
        }
    }}
>
    <Icon name="checkmark" size={30} color="white" />
</TouchableOpacity> 
    </LinearGradient>

    
</View>
                    </View>
                    </>
)}
     <Modal visible={showPreviewPopup} transparent animationType="slide">
    <View style={styles.popupOverlay}>
        <LinearGradient
            colors={['#000000', '#434343']} // Gradient for the modal background
            style={styles.popupContainer}
        >
            <Text style={styles.popupText}>Would you like to preview or re-record?</Text>
            <View style={styles.popupButtons}>
                <LinearGradient
                    colors={['#000000', '#434343']} // Gradient for Preview button
                    style={[styles.popupButton, { flex: 1, marginHorizontal: 5, borderRadius: 5 }]}
                >
                    <TouchableOpacity 
                        style={styles.popupButtonTouchable} 
                        onPress={async () => {
                            handleReRecord();
                            // setShowPreviewPopup(false);
                            // console.log('clicked');
                            // await mergeVideos();
                            // setIsPreview(true);
                        }}
                    >
                        <Text style={styles.buttonText}>Preview</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <LinearGradient
                    colors={['#000000', '#434343']} // Gradient for Re-record button
                    style={[styles.popupButton, { flex: 1, marginHorizontal: 5, borderRadius: 5 }]}
                >
                    <TouchableOpacity 
                        style={styles.popupButtonTouchable} 
                        onPress={() => {
                            setShowPreviewPopup(false);
                            setRecordedVideo(null);
                            setIsPreview(false);
                            videoRef.current?.seek(0);
                        }}
                    >
                        <Text style={styles.buttonText}>Re-record</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </LinearGradient>
    </View>
</Modal>

    <Toast />
            <Modal
                transparent={true}
                visible={isUploadPopupVisible}
                animationType="fade"
            >
                    <ScrollView contentContainerStyle={styles.Uploadcontainer}>
                           <View style={styles.flexDirectionRow}>
                           <Image source={{uri: Platform.OS === 'android' ? `file://${thumbnailPath}` : thumbnailPath}} style={styles.img} />
                             <TextInput
                               style={[styles.input, styles.textArea]}
                               value={reelUri.caption}
                               placeholderTextColor={Colors.border}
                               onChangeText={setCaption}
                            //    placeholder="Enter your caption here..."
                               multiline={true}
                               numberOfLines={8}
                             />
                           </View>
                           <GradientButton
                             text={isUploadInProgress ? "Uploading..." : "Upload"}
                             iconName="upload"
                             onPress={async () => {
                               await uploadVideo();
                             }}
                           />
                           <GradientButton
                            text="Back"
                            iconName="keyboard-backspace" // You can use another icon if needed
                            onPress={() => {
                                setIsPreview(true); // Show the preview again
                                // Optionally, you can reset other states if needed:
                                setIsUploadPopupVisible(false); // Close the upload popup
                                setIsPlayingMerged(false); // Stop any playback on the merged video if it was playing
                                videoRef.current?.seek(0); // Reset the video to the start position (optional)
                            }}
                        />
                         </ScrollView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    countdownText: {
        fontSize: 60, // Adjust as needed for visibility
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    recordingIndicator: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(226, 27, 27, 0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2000, // Make sure this is on top of other elements
    },
    
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
        marginRight: 5, // Spacing between the dot and the text
    },
    
    recText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    loaderContainer: {
        position: 'absolute',
        top: '50%', // Center vertically
        // left: '50%', // Center horizontally
        transform: [{ translateX: -50 }, { translateY: -50 }], // Offset to center properly
        alignItems: 'center', // Center items within container
        width: '100%', // Set width to 95%
        height: 20, // Fixed height for the loader
    },

    loader: {
        width: '100%', // Full width for the gradient bar
        height: '100%', // Full height of the container
        borderRadius: 10 // Add some border-radius to make it look smooth
    },
    loaderText: {
        color: 'white',
        fontSize: 16,
        position: 'absolute', // Positioning the text in the center of the loader
        textAlign: 'center', // Center the text
        top: 2, // Offset for some visual separation (adjust as needed)
    },
    Uploadcontainer: {
        flex: 1,
        paddingHorizontal: 0,
        
        alignItems: 'center',
        backgroundColor: 'black',
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
    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    overlayCamera: {
        position: 'absolute',
        bottom: 45,
        right: 0,
        width: '30%',
        height: '30%',
        overflow: 'hidden',
    },
    recordButton: {
        position: 'absolute',
        bottom: 50,
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'red',
        borderWidth: 5,
        borderColor: 'white',
        alignSelf: 'center',
    },
    recording: {
        backgroundColor: 'darkred',
    },
    uploadButton: {
        position: 'absolute',
        bottom: 50,
        backgroundColor: 'blue',
        padding: 15,
        borderRadius: 10,
    },
    uploadButtonText: {
        color: 'white',
        fontSize: 16,
    },
    gradientButton: {
        flex: 1,
        marginHorizontal: 35,
        borderRadius: 50, // Make it round if you want
        justifyContent: 'center',
        alignItems: 'center',
        // Set a fixed height or use padding as needed
    },
    
    tickButtonTouchable: {
        padding: 15, // This padding ensures better tap area
        borderRadius: 50,
        width: '50%', // Ensure it fills the parent
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    crossButtonTouchable: {
        padding: 15, // This padding ensures better tap area
        borderRadius: 50,
        width: '50%', // Ensure it fills the parent
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        position: 'absolute',
        top: 100,
        right: 10,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconBackground: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent black
        borderRadius: 10,
        paddingVertical: 20,
        alignItems: 'center',
    },
    iconButton: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 50,  // Round buttons for a better look
    },
    previewControlButton: {
        position: 'absolute',
        bottom: 100,
        backgroundColor: 'green',
        padding: 10,
        borderRadius: 5,
    },
    popupContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    popupText: {
        fontSize: 16,
        marginBottom: 20,
        color: 'white',
        textAlign: 'center',
        
    },
    popupButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    popupOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    popupContainer: {
        width: '80%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    popupButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    popupButton: {
        flex: 1,
        padding: 15,
        marginHorizontal: 5,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    progressContainer: {
        marginVertical: 10,
        width: '70%',
        alignItems: 'center',
    },
    progressText: {
        color: Colors.text,
        marginTop: 5,
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    previewVideo: {
        width: '100%',
        height: '70%',
    },
    previewButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        position: 'absolute',
        bottom: 100,
    },
    progressBar: {
        height: 5,
        backgroundColor: 'lightgray',
        borderRadius: 2,
        marginTop: 10,
        width: '100%',
    },
    progress: {
        height: '100%',
        backgroundColor: 'green', // Color for progress
        borderRadius: 2,
    },
    playButton: {
        position: 'absolute',
        bottom: 20,
        left: '50%',
        marginLeft: -15,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 10,
        borderRadius: 50,
    },
    tickButton: {
        backgroundColor: 'green',
        padding: 15,
        borderRadius: 50,
    },
    crossButton: {
        backgroundColor: 'red',
        padding: 15,
        borderRadius: 50,
    },
    timerText: {
        fontSize: 20, // Large font size for visibility
        color: 'white', // White color for contrast against dark backgrounds
        fontWeight: 'bold', // Bold font weight for emphasis
        textAlign: 'center', // Center align the text
        textShadowColor: 'rgba(0, 0, 0, 0.7)', // Shadow for better contrast
        textShadowOffset: { width: 1, height: 1 }, // Shadow offset
        textShadowRadius: 5, // Radius for shadow blur
    }
});

export default RemixScreen;