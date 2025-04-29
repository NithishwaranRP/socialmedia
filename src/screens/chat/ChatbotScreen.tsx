import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RFValue } from 'react-native-responsive-fontsize';
import { useThemeColors } from '../../constants/Colors';
import CustomView from '../../components/global/CustomView';
import { screenHeight, screenWidth } from '../../utils/Scaling';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ReelContext {
  id: string;
  caption: string;
  videoUri: string;
  shareUrl: string;
}

// Define route param types
type ChatbotRouteParams = {
  ChatbotScreen: {
    reelContext: ReelContext;
  };
};

const ChatbotScreen = () => {
  const route = useRoute<RouteProp<ChatbotRouteParams, 'ChatbotScreen'>>();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const reelContext = route.params?.reelContext;

  // Initialize chat with reel context
  useEffect(() => {
    if (reelContext) {
      const initialMessage = {
        id: '1',
        text: `I'm here to chat about this reel: "${reelContext.caption}"\n\nYou can ask me questions about it or share your thoughts!`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  }, [reelContext]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I understand you're talking about the reel "${reelContext?.caption}". Let me help you with that!`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleShareReel = () => {
    if (reelContext?.shareUrl) {
      const message = `Hey, checkout this reel: ${reelContext.shareUrl}`;
      Share.share({
        message: message,
      })
      .catch(error => {
        console.log('Share Error', error);
      });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        {
          backgroundColor: item.isUser ? colors.theme : colors.card,
          alignSelf: item.isUser ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      <Text
        style={[
          styles.messageText,
          {
            color: item.isUser ? colors.white : colors.text,
          },
        ]}
      >
        {item.text}
      </Text>
      <Text
        style={[
          styles.timestamp,
          {
            color: item.isUser ? colors.white : colors.lightText,
            opacity: 0.7,
          },
        ]}
      >
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <CustomView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="arrow-back"
            size={RFValue(24)}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Chat about Reel
        </Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareReel}
        >
          <Icon
            name="share"
            size={RFValue(24)}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={[styles.content, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.messagesList, { backgroundColor: colors.background }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={[styles.inputContainer, { 
          borderTopColor: colors.border,
          backgroundColor: colors.background 
        }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={colors.lightText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.theme,
              },
            ]}
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Icon
                name="send"
                size={RFValue(20)}
                color={colors.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </CustomView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  messageText: {
    fontSize: RFValue(14),
    lineHeight: RFValue(20),
  },
  timestamp: {
    fontSize: RFValue(10),
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: RFValue(14),
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatbotScreen; 