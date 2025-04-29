import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useNavigation, useRoute, StackActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../redux/reduxHook';
import { useThemeColors } from '../../constants/Colors';
import { selectGlobalFeedData } from '../../redux/reducers/reelSlice';
import FastImage from 'react-native-fast-image';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  isContextNotification?: boolean;
  content?: string;
  role?: string;
}

// Extended context for managing chat state with web data
interface ChatContext {
  currentWebUrl: string;
  currentVideoCaption: string;
  messages: Message[];
}

// Feed data interface to properly type the data
interface FeedItem {
  _id: string;
  caption?: string;
  videoUri?: string;
  url?: string; // Web URL field from the database
  thumbUri?: string;
  [key: string]: any; // for other properties
}

// Store suggested question with its context
interface SuggestedQuestion {
  question: string;
  webUrl?: string;
  caption?: string;
  showSwapIndicator?: boolean; // New property to indicate if this question will swap context
}

// Navigation source to track how the chatbot was opened
enum ChatbotSource {
  BOTTOM_TAB = 'bottom_tab',
  REEL_SCREEN = 'reel_screen'
}

// Define type for navigation
type RootStackParamList = {
  ReelScrollScreen: {
    returnFromChatbot?: boolean;
    reelId?: string;
    shouldPlayVideo?: boolean;
  };
  // other screens...
};

const ChatbotScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [navigationSource, setNavigationSource] = useState<ChatbotSource>(ChatbotSource.BOTTOM_TAB);
  const [reelId, setReelId] = useState<string | null>(null);
  const messagesScrollViewRef = useRef<ScrollView>(null);
  const globalFeedData = useAppSelector(selectGlobalFeedData);
  const colors = useThemeColors();
  
  // New state for tracking current context
  const [chatContext, setChatContext] = useState<ChatContext>({
    currentWebUrl: '',
    currentVideoCaption: '',
    messages: []
  });
  
  // Initialize Gemini API with the new API key
  const genAI = new GoogleGenerativeAI('AIzaSyAeMQ59e1wbdgMJpufFLx8OJld4Fh9OiSU');
  
  // Updated model name to use throughout the code
  const MODEL_NAME = 'gemini-2.5-pro-preview-03-25';

  // Function to set content context
  const setContentContext = (webUrl: string | undefined, caption: string) => {
    // Update the context
    setChatContext(prev => ({
      ...prev,
      currentWebUrl: webUrl || '', // Ensure webUrl is never undefined
      currentVideoCaption: caption
    }));
    
    // Add a system message about the context
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: `Content context: ${caption}`,
        isUser: false,
        timestamp: new Date().toISOString(),
        isContextNotification: true
      }
    ]);
  };

  // useEffect for initial setup and route parameters
  useEffect(() => {
    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsInputFocused(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsInputFocused(false)
    );
    
    console.log('ChatbotScreen route params:', route.params);
    
    // Define the route params type
    interface RouteParams {
      caption?: string;
      webUrl?: string;
      reelId?: string;
      fromReelScreen?: boolean;
    }
    
    const params = route.params as RouteParams | undefined;
    
    // Determine how the chatbot was opened
    if (params?.caption) {
      console.log('Opened from reel screen with caption:', params.caption);
      setNavigationSource(ChatbotSource.REEL_SCREEN);
      
      // Store the reelId if provided
      if (params.reelId) {
        console.log('Reel ID received:', params.reelId);
        setReelId(params.reelId);
      }
      
      // Set context with the video details
      if (params.webUrl) {
        setContentContext(params.webUrl, params.caption);
        
        // Generate questions based on the reel content
        generateQuestionsFromReelContext(params.webUrl, params.caption);
      }
    } else {
      console.log('Opened from bottom tab');
      setNavigationSource(ChatbotSource.BOTTOM_TAB);
      setReelId(null);
      
      // Generate random initial questions when opened from bottom tab
      generateInitialRandomQuestions();
    }
    
    // Clear messages when the screen is mounted
    setMessages([]);
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Get random captions for bottom tab navigation scenario
  const getRandomCaptions = () => {
    if (!globalFeedData || globalFeedData.length === 0) return [];
    
    // Ensure globalFeedData is properly typed
    const feedData = globalFeedData as FeedItem[];
    
    // Shuffle and pick unique captions
    const shuffled = [...feedData].sort(() => 0.5 - Math.random());
    const uniqueCaptionsMap = new Map<string, {caption: string, id: string, webUrl?: string}>();
    
    for (const item of shuffled) {
      if (item.caption && !uniqueCaptionsMap.has(item.caption)) {
        uniqueCaptionsMap.set(item.caption, { 
          caption: item.caption, 
          id: item._id,
          webUrl: item.url // Use the web URL field instead of videoUri
        });
        if (uniqueCaptionsMap.size === 3) break;
      }
    }
    
    const randomCaptions = Array.from(uniqueCaptionsMap.values());
    console.log('Random Captions with Web URLs:', randomCaptions);
    
    return randomCaptions;
  };

  // Handle going back to previous screen
  const handleGoBack = useCallback(() => {
    console.log('handleGoBack called, navigation source:', navigationSource, 'reelId:', reelId);
    
    if (navigationSource === ChatbotSource.REEL_SCREEN && reelId) {
      console.log('Navigating back to ReelScrollScreen with reelId:', reelId);
      navigation.navigate('ReelScrollScreen', {
        returnFromChatbot: true,
        reelId: reelId,
        shouldPlayVideo: true
      });
    } else {
      console.log('Regular goBack navigation');
      navigation.goBack();
    }
  }, [navigation, navigationSource, reelId]);

  // Generate initial questions from random captions (used when opened from bottom tab)
  const generateInitialRandomQuestions = async () => {
    try {
      setLoading(true);
      
      const randomCaptions = getRandomCaptions();
      if (randomCaptions.length === 0) {
        setSuggestedQuestions([
          { question: "What's your favorite type of content to create?" },
          { question: "How do you come up with ideas for your videos?" },
          { question: "What's the most challenging part of content creation?" }
        ]);
        return;
      }

      // Choose one random caption/URL pair to be the main context for the conversation
      const mainContext = randomCaptions[0];
      
      // Set this as the active context for the chatbot
      setChatContext(prev => ({
        ...prev,
        currentVideoCaption: mainContext.caption,
        currentWebUrl: mainContext.webUrl || ''
      }));
      
      console.log("Setting main context for bottom tab:", mainContext);
      
      // Create an array to hold all questions from different contexts
      const allQuestions: SuggestedQuestion[] = [];
      
      // For each random caption, generate a question
      for (let i = 0; i < randomCaptions.length && i < 3; i++) {
        const caption = randomCaptions[i];
        try {
          const model = genAI.getGenerativeModel({ model: MODEL_NAME });
          
          const promptForQuestion = `
            Content Caption: "${caption.caption}"
            ${caption.webUrl ? `Related Web URL: ${caption.webUrl}` : ""}
            
            Generate 1 engaging question that would help a user learn more about this specific content.
            Keep the question under 15 words, make it conversational, and directly related to the caption.
            Return just the question with no additional text.
          `;
          
          const result = await model.generateContent({
            contents: [
              { 
                role: "user",
                parts: [{ text: promptForQuestion }]
              }
            ]
          });
          
          const response = await result.response;
          const questionText = response.text().trim();
          
          // Add the question with appropriate context
          allQuestions.push({
            question: questionText,
            webUrl: caption.webUrl,
            caption: caption.caption,
            // Show swap indicator only if this is not the main context
            showSwapIndicator: caption !== mainContext
          });
          
        } catch (error) {
          console.error(`Error generating question for caption ${caption.caption}:`, error);
          // Fallback question
          allQuestions.push({
            question: `What can you tell me about "${caption.caption.substring(0, 20)}..."?`,
            webUrl: caption.webUrl,
            caption: caption.caption,
            showSwapIndicator: caption !== mainContext
          });
        }
      }
      
      console.log('Generated Questions from Different Contexts:', allQuestions);
      setSuggestedQuestions(allQuestions);
    } catch (error) {
      console.error('Error with random caption generation:', error);
      // Final fallback with generic questions
      setSuggestedQuestions([
        { question: "What's your favorite type of content to create?" },
        { question: "How do you come up with ideas for your videos?" },
        { question: "What's the most challenging part of content creation?" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Generate questions specifically for the current reel context (used when opened from reel screen)
  const generateQuestionsFromReelContext = async (caption?: string, webUrl?: string) => {
    if (!caption && !webUrl) return;
    
    try {
      setLoading(true);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      
      // Create a prompt that specifically focuses on the current reel content
      let prompt = `Generate 3 engaging and specific questions about the following content. Make sure the questions are SPECIFICALLY about this exact content and not general:\n\n`;
      
      if (caption) {
        prompt += `Content Caption: "${caption}"\n`;
        prompt += `The caption "${caption}" is the exact hashtag or topic that the user is interested in.\n`;
      }
      
      if (webUrl) {
        prompt += `Related Web URL: ${webUrl}\n`;
        // Add instruction to consider the URL deeply
        prompt += `\nAnalyze the URL deeply and formulate questions that would require information from the website. The questions should prompt the AI to explore the content of the URL to provide meaningful answers.\n`;
      } else if (caption) {
        // If no URL but we have a caption, emphasize the caption
        prompt += `\nWith no specific URL, focus entirely on the caption "${caption}". Create questions about this exact topic that would require knowledge about ${caption}.\n`;
      }
      
      prompt += `\nReturn just 3 simple, conversational questions, each on a new line. Each question should be under 15 words, not include numbering, and MUST relate directly to ${caption || 'the content'}. The questions should be diverse but all specifically about this exact topic.`;
      
      console.log("Generating questions with prompt:", prompt);
      
      const result = await model.generateContent({
        contents: [
          { 
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      });
      
          const response = await result.response;
      const questionTexts = response.text().split('\n').filter(q => q.trim());
      
      console.log("Raw question texts from AI:", questionTexts);
      
      // Create suggested questions with the reel's context
      const questionsWithContext: SuggestedQuestion[] = questionTexts.map(question => ({
        question,
        webUrl,
        caption
      }));
      
      setSuggestedQuestions(questionsWithContext);
      console.log('Generated Reel-Specific Questions:', questionsWithContext);
    } catch (error) {
      console.error('Error generating reel questions:', error);
      setSuggestedQuestions([
        { question: `What's ${caption || 'this content'} about?`, webUrl, caption },
        { question: `Can you explain more about ${caption || 'this topic'}?`, webUrl, caption },
        { question: `What's interesting about ${caption || 'this'}?`, webUrl, caption }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Generate follow-up questions
  const generateFollowUpQuestions = async (answer: string) => {
    try {
      // Use the updated model
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      
      // For the follow-up, always use the current chat context
      // This ensures continuity in the conversation regardless of navigation source
      let prompt = `Based on this answer: "${answer}"`;
      
      if (chatContext.currentVideoCaption) {
        prompt += `, and considering the content caption: "${chatContext.currentVideoCaption}"`;
      }
      
      if (chatContext.currentWebUrl) {
        prompt += `, with related web URL: ${chatContext.currentWebUrl}`;
        // Similar deep web search instruction for follow-up questions
        prompt += `\n\nCreate questions that would require detailed exploration of the URL content to provide meaningful answers. The questions should prompt for specific information that might be found on this webpage.`;
      }
      
      prompt += `\n\nSuggest 3 simple, short follow-up questions that a user might ask next to learn more or go deeper. Each question should be under 10 words and phrased as a user would ask. Do not include any numbering or bullet points. Return only the questions, one per line.`;
      
      const result = await model.generateContent({
        contents: [
          { 
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      });
      
      const response = await result.response;
      const questionTexts = response.text().split('\n').filter(q => q.trim());
      
      // Log generated follow-up questions
      console.log("Generated follow-up questions:", questionTexts);
      
      // Create suggested questions with context
      const questionsWithContext: SuggestedQuestion[] = questionTexts.map(question => ({
        question,
        webUrl: chatContext.currentWebUrl,
        caption: chatContext.currentVideoCaption
      }));
      
      setSuggestedQuestions(questionsWithContext);
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
    }
  };

  // Only use relevant context when sending messages
  const handleSendMessage = async (message: string, questionContext?: {webUrl?: string, caption?: string}) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: Message = { 
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    messagesScrollViewRef.current?.scrollToEnd({ animated: true });

    try {
      // Use the updated model
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      
      // Always use the current context - this ensures we maintain the conversation context
      // for the specific source (either bottom tab's random selection or reel screen's specific content)
      const contextToUse = {
        webUrl: chatContext.currentWebUrl,
        caption: chatContext.currentVideoCaption
      };
      
      // Create a prompt that includes the web URL context if available
      let fullPrompt = "";
      
      if (contextToUse.caption || contextToUse.webUrl) {
        fullPrompt += "Context:\n";
        
        if (contextToUse.caption) {
          fullPrompt += `Content Caption: "${contextToUse.caption}"\n`;
        }
        
        if (contextToUse.webUrl) {
          fullPrompt += `Related Web URL: ${contextToUse.webUrl}\n\n`;
          
          // Enhanced web search instructions that avoid mentioning the URL directly
          fullPrompt += `IMPORTANT: Act as if you have the ability to search the web in real-time. For this query, you need to:
          
1. Analyze the provided URL deeply as if you're extracting information from it right now
2. Treat this URL as a live webpage that you've just accessed and searched
3. Synthesize information from both the URL content and your knowledge base
4. Provide detailed information that would likely be found on this webpage
5. Use a tone and format as if you've actually retrieved this information

IMPORTANT INSTRUCTION: DO NOT mention or reference the URL itself in your response. Do not say phrases like "Based on the URL" or "According to the website" or "From this link". Instead, simply provide the information directly as if you know it. DO NOT disclose that you're analyzing a URL.

If the URL is a general one like Google.com, simulate a web search on the caption/query topic and provide results as if you've searched for "${contextToUse.caption || message}" online.

Your response should:
- Include specific details from your analysis
- Provide relevant facts, figures, or quotes from your search
- NOT attribute information to the source website or mention the URL
- Present information directly as if you already know it
\n\n`;
        }
        
        fullPrompt += "User Question: ";
      }
      
      fullPrompt += message;
      
      console.log("Sending full prompt to AI:", fullPrompt);
      
      // Simplify the content structure to match the working curl example
      try {
        const result = await model.generateContent({
          contents: [
            { 
              role: "user",
              parts: [
                { text: fullPrompt }
              ]
            }
          ]
        });
        
      const response = await result.response;
      const answer = response.text();
      
        // Log the AI's response to the console
        console.log("AI Response:", answer);
        
        // Check if the answer is empty or invalid
        const finalAnswer = answer && answer.trim() 
          ? answer 
          : "I couldn't generate a response. This might be due to API limitations. Please try a different question.";
      
      // Add assistant message
        const assistantMessage: Message = { 
          id: Date.now().toString(),
          text: finalAnswer,
          isUser: false,
          timestamp: new Date().toISOString()
        };
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        
        // Update context with new messages
        setChatContext(prev => ({
          ...prev,
          messages: updatedMessages
        }));
        
        // Generate follow-up questions only if we got a valid answer
        if (answer && answer.trim()) {
      await generateFollowUpQuestions(answer);
        } else {
          // Set default follow-up questions if the AI failed to generate a response
          setSuggestedQuestions([
            { question: "Can you tell me more about this topic?", webUrl: contextToUse.webUrl, caption: contextToUse.caption },
            { question: "What's interesting about this content?", webUrl: contextToUse.webUrl, caption: contextToUse.caption },
            { question: "How does this relate to current trends?", webUrl: contextToUse.webUrl, caption: contextToUse.caption }
          ]);
        }
      } catch (contentError) {
        console.error('Error in content generation:', contentError);
        
        // Try a simplified approach as fallback - just the message alone without context
        console.log("Trying fallback with simplified prompt...");
        try {
          const fallbackResult = await model.generateContent({
            contents: [
              { 
                role: "user",
                parts: [
                  { text: message }
                ]
              }
            ]
          });
          
          const fallbackResponse = await fallbackResult.response;
          const fallbackAnswer = fallbackResponse.text();
          
          console.log("Fallback AI Response:", fallbackAnswer);
          
          // Use the fallback answer
          const assistantMessage: Message = { 
            id: Date.now().toString(),
            text: fallbackAnswer || "I couldn't generate a proper response. Please try again with a different question.",
            isUser: false,
            timestamp: new Date().toISOString()
          };
          const updatedMessages = [...newMessages, assistantMessage];
          setMessages(updatedMessages);
          setChatContext(prev => ({ ...prev, messages: updatedMessages }));
          
          if (fallbackAnswer) {
            await generateFollowUpQuestions(fallbackAnswer);
          }
        } catch (fallbackError) {
          // Both attempts failed, throw to the outer catch block
          throw fallbackError;
        }
      }

      // Scroll to bottom after new content
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add more detailed error message
      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      console.log('[ERROR] Error getting response:', JSON.stringify(error));
      
      // Add error message with more details
      const errorMessage: Message = { 
        id: Date.now().toString(),
        text: `I'm sorry, I encountered an error while processing your request: ${errorDetails}. Please try again or ask a different question.`,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages([...newMessages, errorMessage]);
      
      // Set default follow-up questions
      setSuggestedQuestions([
        { question: "Can you try a simpler question?", webUrl: chatContext.currentWebUrl, caption: chatContext.currentVideoCaption },
        { question: "What else would you like to know?", webUrl: chatContext.currentWebUrl, caption: chatContext.currentVideoCaption },
        { question: "Let's try a different topic", webUrl: chatContext.currentWebUrl, caption: chatContext.currentVideoCaption }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Enhanced content context display showing source and debug info
  const renderContentContext = () => {
    if (!chatContext.currentVideoCaption && !chatContext.currentWebUrl) {
      return null;
    }
    
    return (
      <View style={styles.contextContainer}>
        {navigationSource === ChatbotSource.REEL_SCREEN && (
          <View style={styles.sourceTag}>
            <Text style={styles.sourceTagText}>
              Reel Context {reelId ? `(ID: ${reelId})` : ''}
            </Text>
          </View>
        )}
        
        {chatContext.currentVideoCaption && (
          <Text style={styles.contextCaption}>"{chatContext.currentVideoCaption}"</Text>
        )}
        
        {chatContext.currentWebUrl && (
          <Text style={styles.contextUrl} numberOfLines={1} ellipsizeMode="middle">
            URL: {chatContext.currentWebUrl}
          </Text>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View style={[styles.typingIndicator, { backgroundColor: colors.card }] }>
        <View style={[styles.typingDot, { backgroundColor: colors.theme }]} />
        <View style={[styles.typingDot, { marginHorizontal: 4, backgroundColor: colors.theme }]} />
        <View style={[styles.typingDot, { backgroundColor: colors.theme }]} />
      </View>
    );
  };

  // Function to handle message from suggested question
  const handleSuggestedQuestion = (question: SuggestedQuestion) => {
    // Check if context is changing (swap)
    const isContextChanging = question.webUrl !== chatContext.currentWebUrl;
    
    // Update the context if it's changing
    if (isContextChanging) {
      setChatContext({
        ...chatContext,
        currentVideoCaption: question.caption || '',
        currentWebUrl: question.webUrl || '' // Ensure webUrl is never undefined
      });
      
      // Add a system message about context change
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `Switching context to: ${question.caption || ''}`,
          isUser: false,
          timestamp: new Date().toISOString(),
          isContextNotification: true
        }
      ]);
    }
    
    // Send the question as a user message
    handleSendMessage(question.question);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.background} barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Content Context Header */}

      {/* Main Content */}
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        {/* If no messages, show engagement content */}
        {messages.length === 0 ? (
          <View style={[styles.engagementContainer, { backgroundColor: colors.background }]}>
            <FastImage
              source={require('../../assets/animations/ai.gif')}
              style={[styles.engagementAIGif, { backgroundColor: colors.background }]}
              resizeMode={FastImage.resizeMode.stretch}
            />
            <Text style={[styles.engagementText, { color: colors.text }]}>
              {navigationSource === ChatbotSource.REEL_SCREEN
                ? "Ask me about this content!"
                : "I'm your AI assistant. Ask your questions!"}
            </Text>
            {(chatContext.currentVideoCaption || chatContext.currentWebUrl) && (
              <Text style={[styles.contextHint, { color: colors.lightText }]}>
                I'll use context from current content to answer
              </Text>
            )}
          </View>
        ) : (
          // Messages
          <ScrollView 
            ref={messagesScrollViewRef}
            style={[styles.messagesContainer, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.messagesContent, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.assistantBubble,
                  { backgroundColor: message.isUser ? colors.card : colors.card }
                ]}
              >
                <Text style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : styles.assistantMessageText,
                  { color: message.isUser ? colors.white : colors.text }
                ]}>
                  {message.text}
                </Text>
              </View>
            ))}
            {renderTypingIndicator()}
          </ScrollView>
        )}

        {/* Bottom Area with Suggestions and Input */}
        <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
          {/* Suggestions - Only show when input is not focused */}
          {!isInputFocused && suggestedQuestions.length > 0 && (
            <View style={{ paddingVertical: 8, paddingLeft: 8, paddingRight: 0 }}>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
              >
                {suggestedQuestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.suggestionChip,
                      { marginRight: 10, backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: colors.theme + '40' }
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSuggestedQuestion(item)}
                  >
                    {item.showSwapIndicator && (
                      <View style={styles.swapIconContainer}>
                        <Icon name="swap-horiz" size={14} color={colors.theme} />
                      </View>
                    )}
                    <Text style={[styles.suggestionChipText, { color: colors.theme }]}>
                      {item.question}
                    </Text>
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
            <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor={colors.lightText}
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
                <Icon name="send" size={24} color={!inputText.trim() || loading ? colors.lightText : colors.theme} />
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
  backButton: {
    padding: 8,
  },
  contextContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333333',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourceTagText: {
    fontSize: 12,
    fontFamily: FONTS.Medium,
    color: '#4EA1F7',
  },
  contextCaption: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: '#FFFFFF',
  },
  contextUrl: {
    fontSize: 12,
    fontFamily: FONTS.Regular,
    color: '#AAAAAA',
    marginTop: 2,
  },
  contextHint: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
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
  suggestionChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#181A20',
    marginBottom: 4,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionChipText: {
    color: '#4EA1F7',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
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
  engagementContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  engagementAIGif: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 18,
  },
  engagementText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    opacity: 0.85,
  },
  swapIconContainer: {
    marginRight: 6,
    opacity: 0.9,
  },
});

export default ChatbotScreen; 