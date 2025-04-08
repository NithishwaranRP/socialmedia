import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { Colors } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';

interface AnimatedCaptionProps {
  caption: string;
  active: boolean;
}

const AnimatedCaption: React.FC<AnimatedCaptionProps> = ({ caption, active }) => {
  const [formattedCaptions, setFormattedCaptions] = useState<string[]>(['Recaps']);
  const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
//   console.log(formattedCaptions);
  // Extract and format captions when the component mounts or caption changes
  useEffect(() => {
    if (!caption) {
      setFormattedCaptions(['Recaps']);
      return;
    }
    
    // Extract hashtags from caption and format them
    const hashtags = caption.split(' ')
      .filter(word => word.startsWith('#') && word.length > 1)
      .map(hashtag => {
        // Remove # and capitalize first letter
        const text = hashtag.substring(1);
        return text.charAt(0).toUpperCase() + text.slice(1);
      });
    
    // Add "Recaps" at the end of each formatted caption
    const formatted = hashtags.map(tag => `${tag} news recap`);
    
    // If no hashtags found, use "Recaps" as default
    const result = formatted.length > 0 ? formatted : ['Recaps'];
    setFormattedCaptions(result);
    
    // Reset to the first caption when caption changes
    setCurrentCaptionIndex(0);
  }, [caption]);
  
  // Handle animations when active status changes
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (active) {
      // Start animation sequence - fade in
      setIsVisible(true);
      animateCaption();
      
      // Set up caption rotation if there are multiple captions
      if (formattedCaptions.length > 1) {
        intervalId = setInterval(() => {
          // First animate out
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
            Animated.timing(slideAnim, {
              toValue: -50,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]).start(() => {
            // Then update index and animate in
            setCurrentCaptionIndex(prevIndex => 
              prevIndex === formattedCaptions.length - 1 ? 0 : prevIndex + 1
            );
            // Reset position for next animation
            slideAnim.setValue(50);
            // Animate in from right
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
              }),
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
              }),
            ]).start();
          });
        }, 4000); // Change caption every 4 seconds
      }
    } else {
      // When not active, fade out immediately
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
    
    // Cleanup interval when component unmounts or active changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [active, formattedCaptions.length]);
  
  const animateCaption = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    
    // Fade in and slide in from right
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  };
  
  // If not active and not visible, or no captions, return null
  if (!active && !isVisible || formattedCaptions.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.captionContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <Text style={styles.captionText}>
          {formattedCaptions[currentCaptionIndex]}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  captionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: '100%', // Ensure it doesn't stretch too far
  },
  captionText: {
    color: Colors.white,
    fontFamily: FONTS.Bold,
    fontSize: RFValue(20),
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default AnimatedCaption; 