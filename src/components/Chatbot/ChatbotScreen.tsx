import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
} from 'react-native';
import { FONTS } from '../../constants/Fonts';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GoogleGenerativeAI } from '@google/generative-ai';

const { width, height } = Dimensions.get('window');

interface ChatbotScreenProps {
  onDismiss: () => void;
  captions: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatbotScreen: React.FC<ChatbotScreenProps> = ({ onDismiss, captions }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesScrollViewRef = useRef<ScrollView>(null);

  // Initialize Gemini API
  const genAI = new GoogleGenerativeAI('AIzaSyAx8cGk6m85QWDMN7l8uh3iH0CY64q1ods');

  useEffect(() => {
    // Generate initial questions based on captions
    generateInitialQuestions();

    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsInputFocused(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsInputFocused(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [captions]);

  const generateInitialQuestions = async () => {
    try {
      setLoading(true);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const result = await model.generateContent(
        `Based on these captions: ${captions.join(', ')}, generate 3 relevant questions that would be interesting to ask. Return only the questions, one per line.`
      );
      const response = await result.response;
      const questions = response.text().split('\n').filter(q => q.trim());
      
      setSuggestedQuestions(questions);
    } catch (error) {
      console.error('Error generating questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFollowUpQuestions = async (answer: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const result = await model.generateContent(
        `Based on this answer: "${answer}", generate 3 relevant follow-up questions. Return only the questions, one per line.`
      );
      const response = await result.response;
      const questions = response.text().split('\n').filter(q => q.trim());
      
      setSuggestedQuestions(questions);
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: message };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    messagesScrollViewRef.current?.scrollToEnd({ animated: true });

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const result = await model.generateContent(message);
      const response = await result.response;
      const answer = response.text();
      
      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: answer };
      setMessages([...newMessages, assistantMessage]);
      
      // Generate follow-up questions
      await generateFollowUpQuestions(answer);

      // Scroll to bottom after new content
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error getting response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View style={styles.typingIndicator}>
        <View style={styles.typingDot} />
        <View style={[styles.typingDot, { marginHorizontal: 4 }]} />
        <View style={styles.typingDot} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Chatbot</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <Icon name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContainer}>
        {/* Messages */}
        <ScrollView 
          ref={messagesScrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={[
                styles.messageText,
                message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
              ]}>
                {message.content}
              </Text>
            </View>
          ))}
          {renderTypingIndicator()}
        </ScrollView>

        {/* Bottom Area with Suggestions and Input */}
        <View style={styles.bottomContainer}>
          {/* Suggestions - Only show when input is not focused */}
          {!isInputFocused && suggestedQuestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView 
                style={styles.suggestionsScroll}
                contentContainerStyle={styles.suggestionsContent}
                showsVerticalScrollIndicator={false}
              >
                {suggestedQuestions.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionButton}
                    onPress={() => handleSendMessage(question)}
                  >
                    <Text style={styles.suggestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#666666"
                multiline
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || loading) && styles.sendButtonDisabled
                ]}
                onPress={() => handleSendMessage(inputText)}
                disabled={loading || !inputText.trim()}
              >
                <Icon name="send" size={24} color={!inputText.trim() || loading ? '#666666' : '#007AFF'} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.Bold,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  bottomContainer: {
    position: 'relative',
    marginTop: 'auto',
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 0.5,
    borderTopColor: '#333333',
  },
  suggestionsScroll: {
    maxHeight: 200,
  },
  suggestionsContent: {
    padding: 8,
  },
  suggestionButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2C2C2E',
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: FONTS.Regular,
    color: '#007AFF',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#333333',
  },
  messageText: {
    fontSize: 16,
    fontFamily: FONTS.Regular,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#FFFFFF',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#333333',
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#333333',
    backgroundColor: '#000000',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    fontFamily: FONTS.Regular,
    color: '#FFFFFF',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatbotScreen; 