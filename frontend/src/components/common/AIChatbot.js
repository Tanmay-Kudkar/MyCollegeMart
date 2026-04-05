import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ai as aiApi } from '../../utils/api';
import { SendIcon, CloseIcon, ChatIcon } from '../UI/Icons';

const BULLET_PATTERN = /^[-*\u2022]\s+/;
const NUMBERED_PATTERN = /^\d+[.)]\s+/;
const HEADING_PATTERN = /^#{1,3}\s+/;

const QUICK_ACTIONS = [
  { label: 'Show calculators', prompt: 'Show me calculators' },
  { label: 'About Prime', prompt: 'Tell me about Prime membership' },
  { label: 'How to sell', prompt: 'How do I sell items?' },
];

const getMessageTime = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const createMessage = (role, text) => ({
  role,
  text,
  time: getMessageTime(),
});

const parseMessageBlocks = (text = '') => {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks = [];
  let index = 0;

  const isStructuredLine = (line) =>
    HEADING_PATTERN.test(line) || BULLET_PATTERN.test(line) || NUMBERED_PATTERN.test(line);

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (HEADING_PATTERN.test(line)) {
      blocks.push({ type: 'heading', text: line.replace(HEADING_PATTERN, '') });
      index += 1;
      continue;
    }

    if (BULLET_PATTERN.test(line)) {
      const items = [];

      while (index < lines.length) {
        const currentLine = lines[index].trim();
        if (!BULLET_PATTERN.test(currentLine)) {
          break;
        }
        items.push(currentLine.replace(BULLET_PATTERN, ''));
        index += 1;
      }

      blocks.push({ type: 'ul', items });
      continue;
    }

    if (NUMBERED_PATTERN.test(line)) {
      const items = [];

      while (index < lines.length) {
        const currentLine = lines[index].trim();
        if (!NUMBERED_PATTERN.test(currentLine)) {
          break;
        }
        items.push(currentLine.replace(NUMBERED_PATTERN, ''));
        index += 1;
      }

      blocks.push({ type: 'ol', items });
      continue;
    }

    const paragraph = [line];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index].trim();

      if (!nextLine || isStructuredLine(nextLine)) {
        if (!nextLine) {
          index += 1;
        }
        break;
      }

      paragraph.push(nextLine);
      index += 1;
    }

    blocks.push({ type: 'p', text: paragraph.join(' ') });
  }

  if (!blocks.length && text.trim()) {
    blocks.push({ type: 'p', text: text.trim() });
  }

  return blocks;
};

const renderMessageContent = (message) => {
  if (message.role !== 'bot') {
    return <p className="break-words whitespace-pre-wrap text-sm leading-6 text-white">{message.text}</p>;
  }

  const blocks = parseMessageBlocks(message.text);

  return (
    <div className="mcm-chat-content space-y-2">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return (
            <h4 key={`heading-${blockIndex}`} className="text-[13px] font-semibold text-indigo-700 dark:text-indigo-300">
              {block.text}
            </h4>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul
              key={`ul-${blockIndex}`}
              className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700 marker:text-indigo-500 dark:text-slate-100 dark:marker:text-indigo-300"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${blockIndex}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol
              key={`ol-${blockIndex}`}
              className="list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700 marker:text-indigo-500 dark:text-slate-100 dark:marker:text-indigo-300"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${blockIndex}-${itemIndex}`}>{item}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`p-${blockIndex}`} className="text-sm leading-6 text-slate-700 dark:text-slate-100">
            {block.text}
          </p>
        );
      })}
    </div>
  );
};

const AIChatbot = ({ isChatOpen, setIsChatOpen, onNavigate }) => {
  const [messages, setMessages] = useState([
    createMessage('bot', "Hi! I'm MarketMate, your personal college marketplace assistant. How can I help you today?")
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const pendingRequestControllerRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => () => {
    pendingRequestControllerRef.current?.abort();
  }, []);
  
  const requestReply = async (userMessage, nextConversation, signal) => {
    const history = nextConversation
      .slice(-8)
      .map((msg) => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        text: msg.text,
      }));

    const response = await aiApi.chat(
      {
        assistantType: 'MARKETMATE',
        message: userMessage,
        history,
      },
      {
        signal,
      }
    );

    const reply = response?.data?.reply;
    if (!reply || !reply.trim()) {
      throw new Error('AI returned an empty response.');
    }

    return reply.trim().replace(/\n{3,}/g, '\n\n');
  };

  const sendMessage = async (rawMessage) => {
    const message = (rawMessage || '').trim();
    if (!message || isTyping) {
      return;
    }

    const nextConversation = [...messages, createMessage('user', message)];
    setMessages(nextConversation);
    setInput('');
    setIsTyping(true);
    const controller = new AbortController();
    pendingRequestControllerRef.current = controller;

    try {
      const reply = await requestReply(message, nextConversation, controller.signal);
      setMessages((prev) => [...prev, createMessage('bot', reply)]);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const fallbackMessage = error?.message || 'I could not reach the AI service right now. Please try again shortly.';
      setMessages((prev) => [...prev, createMessage('bot', fallbackMessage)]);
    } finally {
      if (pendingRequestControllerRef.current === controller) {
        pendingRequestControllerRef.current = null;
      }
      setIsTyping(false);
    }
  };

  const handleStopChat = () => {
    if (!isTyping) {
      return;
    }

    pendingRequestControllerRef.current?.abort();
    pendingRequestControllerRef.current = null;
    setIsTyping(false);
    setMessages((prev) => [...prev, createMessage('bot', 'Stopped current response. Send a message when you want to continue.')]);
  };

  const handleCloseChat = () => {
    pendingRequestControllerRef.current?.abort();
    pendingRequestControllerRef.current = null;
    setIsTyping(false);
    setIsChatOpen(false);
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
        className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-[0_18px_40px_-18px_rgba(37,99,235,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-cyan-500 ${
          isChatOpen ? 'pointer-events-none scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label="Open chat"
        title="Open AI Assistant"
      >
        <span className="pointer-events-none absolute -inset-1 rounded-3xl bg-indigo-500/40 blur-lg" />
        <span className="relative">
          <ChatIcon />
        </span>
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mcm-chatbot fixed bottom-3 right-3 z-40 flex h-[min(78vh,36rem)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_30px_80px_-35px_rgba(49,46,129,0.88)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 sm:bottom-5 sm:right-5 sm:w-[24rem] md:w-[26rem]"
          >
            {/* Chat header */}
            <div className="relative flex items-center justify-between bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-4 py-3.5 text-white">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_55%)]" />
              <div className="relative flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/45">
                  <img src="/MyCollegeMart-Icon.jpg" alt="MyCollegeMart logo" className="h-full w-full rounded-full object-cover" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">MarketMate</h3>
                  <p className="text-[11px] text-white/80">Online now</p>
                </div>
              </div>
              <button
                onClick={handleCloseChat}
                className="relative rounded-xl p-1.5 transition-colors hover:bg-white/20"
                aria-label="Close chat"
                title="Close Chat"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Chat messages */}
            <div className="mcm-chat-scroll flex-grow space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50/75 via-slate-100/35 to-white/75 px-3 py-4 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800/70 sm:px-4">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';

                return (
                  <motion.div
                    key={`message-${i}-${msg.time}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[90%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            isUser
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                              : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-300'
                          }`}
                        >
                          {isUser ? 'U' : 'AI'}
                        </span>
                        <div
                          className={`rounded-2xl px-3 py-2.5 shadow-sm ring-1 ${
                            isUser
                              ? 'rounded-br-md bg-gradient-to-br from-indigo-600 to-blue-600 text-white ring-indigo-400/30'
                              : 'rounded-bl-md bg-white text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
                          }`}
                        >
                          {renderMessageContent(msg)}
                        </div>
                      </div>
                      <span className={`text-[11px] text-slate-400 dark:text-slate-500 ${isUser ? 'pr-9' : 'pl-9'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-300">
                      AI
                    </span>
                    <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span className="mcm-chat-dot h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-300" />
                        <span className="mcm-chat-dot h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-300" />
                        <span className="mcm-chat-dot h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-300" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-px" />
            </div>

            {/* Quick buttons */}
            <div className="border-t border-slate-200/70 bg-white/90 px-3 pb-2 pt-2 dark:border-slate-700/70 dark:bg-slate-900/90">
              <div className="mcm-chat-scroll flex gap-2 overflow-x-auto pb-1">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.prompt}
                    onClick={() => sendMessage(action.prompt)}
                    className="whitespace-nowrap rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                    title={`Quick action: ${action.label}`}
                    disabled={isTyping}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat input */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-200/80 bg-white/95 p-3 dark:border-slate-700/80 dark:bg-slate-900/95">
              <div className="flex h-12 items-center rounded-2xl border border-slate-300/80 bg-slate-50 shadow-inner dark:border-slate-600/80 dark:bg-slate-800/80">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="h-full min-w-0 flex-grow bg-transparent px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                  disabled={isTyping}
                />
                <button
                  type={isTyping ? 'button' : 'submit'}
                  onClick={isTyping ? handleStopChat : undefined}
                  className="m-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white transition hover:from-indigo-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!isTyping && input.trim() === ''}
                  title={isTyping ? 'Stop Response' : 'Send Message'}
                  aria-label={isTyping ? 'Stop response' : 'Send message'}
                >
                  {isTyping ? (
                    <span className="flex h-6 w-6 items-center justify-center">
                      <span className="block h-3.5 w-3.5 rounded-sm bg-white" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center">
                      <SendIcon />
                    </span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
