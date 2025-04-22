import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AvatarPopupContextProps {
  showAIAvatar: boolean;
  setShowAIAvatar: (show: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  directInitSession: boolean;
  setDirectInitSession: (init: boolean) => void;
  isInteractiveMode: boolean;
  setInteractiveMode: (interactive: boolean) => void;
}

const AvatarPopupContext = createContext<AvatarPopupContextProps | undefined>(undefined);

export const AvatarPopupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showAIAvatar, setShowAIAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [directInitSession, setDirectInitSession] = useState(false);
  const [isInteractiveMode, setInteractiveMode] = useState(false);

  return (
    <AvatarPopupContext.Provider 
      value={{ 
        showAIAvatar, 
        setShowAIAvatar, 
        isLoading, 
        setIsLoading,
        directInitSession,
        setDirectInitSession,
        isInteractiveMode,
        setInteractiveMode
      }}
    >
      {children}
    </AvatarPopupContext.Provider>
  );
};

export const useAvatarPopup = () => {
  const context = useContext(AvatarPopupContext);
  if (context === undefined) {
    throw new Error('useAvatarPopup must be used within an AvatarPopupProvider');
  }
  return context;
};

export default AvatarPopupContext; 