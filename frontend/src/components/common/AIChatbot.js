import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { ai as aiApi } from '../../utils/api';
import { SendIcon, CloseIcon } from '../UI/Icons';

const AIChatbot = ({ isChatOpen, setIsChatOpen, onNavigate }) => {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "👋 Hi! I'm MarketMate, your personal college marketplace assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { theme } = useTheme();
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const requestReply = async (userMessage, nextConversation) => {
    const history = nextConversation
      .slice(-8)
      .map((msg) => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        text: msg.text,
      }));

    const response = await aiApi.chat({
      assistantType: 'MARKETMATE',
      message: userMessage,
      history,
    });

    const reply = response?.data?.reply;
    if (!reply || !reply.trim()) {
      throw new Error('AI returned an empty response.');
    }

    return reply.trim();
  };

  const sendMessage = async (rawMessage) => {
    const message = (rawMessage || '').trim();
    if (!message || isTyping) {
      return;
    }

    const nextConversation = [...messages, { role: 'user', text: message }];
    setMessages(nextConversation);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await requestReply(message, nextConversation);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (error) {
      const fallbackMessage = error?.message || 'I could not reach the AI service right now. Please try again shortly.';
      setMessages((prev) => [...prev, { role: 'bot', text: fallbackMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    await sendMessage(input);
  };
  
  
  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`fixed bottom-5 right-5 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center transition-all transform ${
          isChatOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        } ${
          theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
        aria-label="Open chat"
        title="Open AI Assistant"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-5 right-5 w-80 md:w-96 h-96 rounded-xl shadow-xl z-40 overflow-hidden flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            {/* Chat header */}
            <div className="p-3 bg-indigo-600 dark:bg-indigo-700 text-white flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-2">
                  <span className="text-lg">✨</span>
                </div>
                <div>
                  <h3 className="font-bold">MarketMate</h3>
                  <p className="text-xs opacity-80">Your college shopping assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-full hover:bg-white/20"
                aria-label="Close chat"
                title="Close Chat"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-grow p-3 overflow-y-auto space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick buttons */}
            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => sendMessage('Show me calculators')}
                className="whitespace-nowrap px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs hover:bg-indigo-200 dark:hover:bg-indigo-800/30"
                title="Quick action: Ask about calculators"
                disabled={isTyping}
              >
                Show calculators
              </button>
              <button 
                onClick={() => sendMessage('Tell me about Prime membership')}
                className="whitespace-nowrap px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs hover:bg-indigo-200 dark:hover:bg-indigo-800/30"
                title="Quick action: Ask about Prime"
                disabled={isTyping}
              >
                About Prime
              </button>
              <button 
                onClick={() => sendMessage('How do I sell items?')}
                className="whitespace-nowrap px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs hover:bg-green-200 dark:hover:bg-green-800/30"
                title="Quick action: Ask how to sell"
                disabled={isTyping}
              >
                How to sell
              </button>
            </div>

            {/* Chat input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-700 flex">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-l-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isTyping}
              />
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                disabled={input.trim() === ''}
                title="Send Message"
              >
                <SendIcon />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
