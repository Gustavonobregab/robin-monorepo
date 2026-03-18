'use client'
import { createContext, useContext, useState } from 'react'

type ChatContextType = {
  chatOpen: boolean
  toggleChat: () => void
}

const ChatContext = createContext<ChatContextType>({
  chatOpen: false,
  toggleChat: () => {},
})

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  return (
    <ChatContext.Provider value={{ chatOpen, toggleChat: () => setChatOpen((p) => !p) }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
