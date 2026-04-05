import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ai as aiApi } from '../utils/api';

const INITIAL_MESSAGE =
  "Hey! I'm your AI Study Planner. To get started, tell me your subject, exam date, and how many hours a week you can study. For example: 'Calculus I, Dec 15th, 10 hours'.";
const BULLET_PATTERN = /^[-*\u2022]\s+/;
const NUMBERED_PATTERN = /^\d+[.)]\s+/;
const HEADING_PATTERN = /^#{1,3}\s+/;

const createMessage = (role, text) => ({
  role,
  text,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

const normalizeAiErrorMessage = (error) => {
  const message = error?.message || 'I could not reach the AI planner right now. Please try again.';

  if (/AI chat is not configured|AI_CHAT_API_KEY/i.test(message)) {
    return 'AI planner is not configured on backend yet. Please set AI_CHAT_API_KEY and restart backend.';
  }

  return message;
};

const renderInlineMarkdown = (text = '') => {
  const segments = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    segments.push(
      <strong key={`strong-${match.index}`} className="font-semibold">
        {match[1]}
      </strong>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments.length ? segments : text;
};

const parseMessageBlocks = (text = '') => {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks = [];
  let index = 0;

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

        items.push(currentLine.replace(BULLET_PATTERN, '').trim());
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

        items.push(currentLine.replace(NUMBERED_PATTERN, '').trim());
        index += 1;
      }

      blocks.push({ type: 'ol', items });
      continue;
    }

    blocks.push({ type: 'p', text: line });
    index += 1;
  }

  if (!blocks.length && text.trim()) {
    blocks.push({ type: 'p', text: text.trim() });
  }

  return blocks;
};

const renderMessageContent = (message) => {
  if (message.role !== 'bot') {
    return <p className="whitespace-pre-wrap break-words">{message.text}</p>;
  }

  const blocks = parseMessageBlocks(message.text);

  return (
    <div className="space-y-2">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return (
            <h4 key={`heading-${blockIndex}`} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {renderInlineMarkdown(block.text)}
            </h4>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={`ul-${blockIndex}`} className="list-disc space-y-1 pl-5 text-[15px] leading-6">
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={`ol-${blockIndex}`} className="list-decimal space-y-1 pl-5 text-[15px] leading-6">
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`p-${blockIndex}`} className="leading-6">
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
};

const StudyCorner = () => {
  const [chatHistory, setChatHistory] = useState([createMessage('bot', INITIAL_MESSAGE)]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const pendingRequestControllerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatHistory, isLoading]);

  useEffect(() => () => {
    pendingRequestControllerRef.current?.abort();
  }, []);

  const getAiReply = async (message, conversation, signal) => {
    const history = conversation
      .slice(-8)
      .map((entry) => ({
        role: entry.role === 'bot' ? 'assistant' : 'user',
        text: entry.text,
      }));

    const response = await aiApi.chat(
      {
        assistantType: 'STUDY_PLANNER',
        message,
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

    return reply.trim();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const prompt = userInput.trim();
    if (!prompt || isLoading) {
      return;
    }

    const nextHistory = [...chatHistory, createMessage('user', prompt)];
    setChatHistory(nextHistory);
    setUserInput('');
    setIsLoading(true);
    const controller = new AbortController();
    pendingRequestControllerRef.current = controller;

    try {
      const reply = await getAiReply(prompt, nextHistory, controller.signal);
      setChatHistory((prev) => [...prev, createMessage('bot', reply)]);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setChatHistory((prev) => [...prev, createMessage('bot', normalizeAiErrorMessage(error))]);
    } finally {
      if (pendingRequestControllerRef.current === controller) {
        pendingRequestControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleStopResponse = () => {
    if (!isLoading) {
      return;
    }

    pendingRequestControllerRef.current?.abort();
    pendingRequestControllerRef.current = null;
    setIsLoading(false);
  };

  return (
    <section className="w-full py-2 sm:py-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto w-full max-w-6xl rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-lg dark:border-slate-600 dark:bg-slate-800 sm:rounded-3xl sm:p-6 md:p-8"
      >
        <header className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl" aria-hidden="true">🎓</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">AI Study Corner</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Chat with our AI planner to create a custom study schedule to help you ace your tests.
          </p>
        </header>

        <div className="flex h-[68vh] min-h-[24rem] max-h-[42rem] flex-col rounded-2xl border-2 border-slate-300 bg-slate-100/95 p-3 shadow-inner dark:border-slate-600 dark:bg-slate-900/35 sm:p-4">
          <div className="mcm-chat-scroll flex-1 space-y-3 overflow-y-auto pr-1 sm:space-y-4 sm:pr-2">
            {chatHistory.map((msg, index) => {
              const isUser = msg.role === 'user';

              return (
                <div key={`study-corner-msg-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[80%] sm:px-4 sm:py-3 sm:text-[15px] ${isUser
                    ? 'rounded-br-md border border-indigo-700/80 bg-indigo-600 text-white dark:border-indigo-400/40'
                    : 'rounded-bl-md border border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
                    {renderMessageContent(msg)}
                    <p className={`mt-1 text-[11px] ${isUser ? 'text-indigo-100/90' : 'text-slate-400 dark:text-slate-500'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-300 bg-white px-3 py-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse dark:bg-slate-300" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse [animation-delay:0.15s] dark:bg-slate-300" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse [animation-delay:0.3s] dark:bg-slate-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-px" />
          </div>

          <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 sm:mt-4 sm:gap-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-400 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:text-base"
              disabled={isLoading}
            />
            <button
              type={isLoading ? 'button' : 'submit'}
              onClick={isLoading ? handleStopResponse : undefined}
              disabled={!isLoading && !userInput.trim()}
              className="h-11 min-w-[5.5rem] rounded-xl border border-indigo-700 bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:border-indigo-300 disabled:bg-indigo-400 sm:h-12 sm:min-w-[6.5rem] sm:px-6 sm:text-base dark:border-indigo-500"
              title={isLoading ? 'Stop response' : 'Send'}
              aria-label={isLoading ? 'Stop response' : 'Send'}
            >
              {isLoading ? (
                <span className="inline-flex h-6 w-6 items-center justify-center">
                  <span className="block h-3.5 w-3.5 rounded-sm bg-white" />
                </span>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
};

export default StudyCorner;
