import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ai as aiApi } from '../utils/api';
import {
  ArrowUp,
  Check,
  Copy,
  Ellipsis,
  RefreshCw,
  Share2,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';

const INITIAL_MESSAGE =
  "Hey! I'm your AI Study Planner. To get started, tell me your subject, exam date, and how many hours a week you can study. For example: 'Calculus I, Dec 15th, 10 hours'.";
const DISLIKE_REASON_OPTIONS = [
  { id: 'INCORRECT_OR_INCOMPLETE', label: 'Incorrect or incomplete' },
  { id: 'NOT_WHAT_I_ASKED_FOR', label: 'Not what I asked for' },
  { id: 'SLOW_OR_BUGGY', label: 'Slow or buggy' },
  { id: 'STYLE_OR_TONE', label: 'Style or tone' },
  { id: 'SAFETY_OR_LEGAL_CONCERN', label: 'Safety or legal concern' },
  { id: 'OTHER', label: 'Other' },
];
const BULLET_PATTERN = /^[-*\u2022]\s+/;
const NUMBERED_PATTERN = /^\d+[.)]\s+/;
const HEADING_PATTERN = /^#{1,3}\s+/;
const CODE_FENCE_PATTERN = /^```(?:\s*([\w#+.-]+))?\s*$/;

const LANGUAGE_ALIASES = {
  'c++': 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  c: 'c',
  cs: 'csharp',
  csharp: 'csharp',
  'c#': 'csharp',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  yml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  'objective-c': 'objectivec',
  objc: 'objectivec',
};

let highlightJsModule = null;
let highlighterLoadPromise = null;

const loadHighlighter = async () => {
  if (highlightJsModule) {
    return highlightJsModule;
  }

  if (!highlighterLoadPromise) {
    highlighterLoadPromise = Promise.all([
      import('highlight.js'),
      import('highlight.js/styles/github-dark.css'),
    ])
      .then(([module]) => {
        highlightJsModule = module.default;
        return highlightJsModule;
      })
      .catch((error) => {
        highlighterLoadPromise = null;
        throw error;
      });
  }

  return highlighterLoadPromise;
};

const generateChatSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createMessage = (role, text) => {
  const createdAtDate = new Date();

  return {
    role,
    text,
    createdAt: createdAtDate.toISOString(),
    time: createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const normalizeAiErrorMessage = (error) => {
  const message = error?.message || 'I could not reach the AI planner right now. Please try again.';

  if (/AI chat is not configured|AI_CHAT_API_KEY/i.test(message)) {
    return 'AI planner is not configured on backend yet. Please set AI_CHAT_API_KEY and restart backend.';
  }

  return message;
};

const toSafeHttpUrl = (value = '') => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URL and treat it as plain text.
  }

  return '';
};

const getCodeLanguageKey = (language = '') => String(language || '').trim().toLowerCase();

const resolveHighlightLanguage = (highlighter, language = '') => {
  if (!highlighter) {
    return '';
  }

  const languageKey = getCodeLanguageKey(language);
  if (!languageKey) {
    return '';
  }

  const aliased = LANGUAGE_ALIASES[languageKey] || languageKey;
  if (highlighter.getLanguage(aliased)) {
    return aliased;
  }

  return '';
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatLanguageLabel = (providedLanguage = '', detectedLanguage = '') => {
  const label = String(providedLanguage || detectedLanguage || 'text').trim();
  if (!label) {
    return 'text';
  }

  return label;
};

const highlightCodeToHtml = (codeText = '', language = '', highlighter = null) => {
  const rawCode = String(codeText || '');

  if (!highlighter) {
    return {
      html: escapeHtml(rawCode),
      languageLabel: formatLanguageLabel(language, ''),
    };
  }

  const resolvedLanguage = resolveHighlightLanguage(highlighter, language);

  try {
    if (resolvedLanguage) {
      const result = highlighter.highlight(rawCode, {
        language: resolvedLanguage,
        ignoreIllegals: true,
      });

      return {
        html: result.value,
        languageLabel: formatLanguageLabel(language, resolvedLanguage),
      };
    }

    const autoResult = highlighter.highlightAuto(rawCode);
    return {
      html: autoResult.value,
      languageLabel: formatLanguageLabel(language, autoResult.language),
    };
  } catch {
    return {
      html: escapeHtml(rawCode),
      languageLabel: formatLanguageLabel(language, ''),
    };
  }
};

const renderInlineMarkdown = (text = '', keyPrefix = 'inline') => {
  const segments = [];
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;

    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      segments.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
      lastIndex = tokenPattern.lastIndex;
      continue;
    }

    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      segments.push(
        <code key={key} className="rounded bg-slate-200 px-1.5 py-0.5 text-[13px] text-slate-800 dark:bg-slate-700 dark:text-slate-100">
          {token.slice(1, -1)}
        </code>
      );
      lastIndex = tokenPattern.lastIndex;
      continue;
    }

    if (token.startsWith('[')) {
      const markdownLinkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      const label = markdownLinkMatch?.[1] || '';
      const url = toSafeHttpUrl(markdownLinkMatch?.[2] || '');

      if (label && url) {
        segments.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-indigo-400 underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-300"
          >
            {label}
          </a>
        );
      } else {
        segments.push(token);
      }

      lastIndex = tokenPattern.lastIndex;
      continue;
    }

    // Bare URL support with trailing punctuation preserved outside the link.
    const sanitizedToken = token.replace(/[),.;!?]+$/, '');
    const trailingText = token.slice(sanitizedToken.length);
    const safeUrl = toSafeHttpUrl(sanitizedToken);

    if (safeUrl) {
      segments.push(
        <a
          key={key}
          href={safeUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-indigo-400 underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-300"
        >
          {sanitizedToken}
        </a>
      );

      if (trailingText) {
        segments.push(trailingText);
      }
    } else {
      segments.push(token);
    }

    lastIndex = tokenPattern.lastIndex;
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

  const isStructuredLine = (line) =>
    HEADING_PATTERN.test(line)
    || BULLET_PATTERN.test(line)
    || NUMBERED_PATTERN.test(line)
    || CODE_FENCE_PATTERN.test(line);

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    const codeFenceMatch = line.match(CODE_FENCE_PATTERN);
    if (codeFenceMatch) {
      const language = (codeFenceMatch[1] || '').trim();
      const codeLines = [];
      index += 1;

      while (index < lines.length) {
        const currentRawLine = lines[index];
        if (CODE_FENCE_PATTERN.test(currentRawLine.trim())) {
          index += 1;
          break;
        }

        codeLines.push(currentRawLine);
        index += 1;
      }

      blocks.push({ type: 'code', language, text: codeLines.join('\n').trimEnd() });
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

    const paragraph = [line];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index].trim();

      if (!nextLine) {
        index += 1;
        break;
      }

      if (isStructuredLine(nextLine)) {
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

const renderMessageContent = (message, options = {}) => {
  const {
    messageKey = 'message',
    onCopyCode,
    copiedCodeKey = '',
    highlighter = null,
  } = options;

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
              {renderInlineMarkdown(block.text, `heading-${blockIndex}`)}
            </h4>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={`ul-${blockIndex}`} className="list-disc space-y-1 pl-5 text-[15px] leading-6">
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item, `ul-${blockIndex}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={`ol-${blockIndex}`} className="list-decimal space-y-1 pl-5 text-[15px] leading-6">
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item, `ol-${blockIndex}-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === 'code') {
          const codeKey = `${messageKey}-code-${blockIndex}`;
          const highlightedCode = highlightCodeToHtml(block.text, block.language, highlighter);

          return (
            <div key={`code-${blockIndex}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {highlightedCode.languageLabel}
                </p>
                <button
                  type="button"
                  onClick={() => onCopyCode?.(block.text, codeKey)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  title={copiedCodeKey === codeKey ? 'Copied' : 'Copy code'}
                  aria-label={copiedCodeKey === codeKey ? 'Copied code' : 'Copy code'}
                >
                  {copiedCodeKey === codeKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="m-0 overflow-x-auto rounded-lg border border-slate-300 bg-slate-900 p-3 text-[13px] leading-6 text-slate-100 dark:border-slate-600 dark:bg-slate-950">
                <code
                  className="hljs block"
                  style={{ background: 'transparent', padding: 0 }}
                  dangerouslySetInnerHTML={{ __html: highlightedCode.html }}
                />
              </pre>
            </div>
          );
        }

        return (
          <p key={`p-${blockIndex}`} className="leading-6">
            {renderInlineMarkdown(block.text, `p-${blockIndex}`)}
          </p>
        );
      })}
    </div>
  );
};

const StudyCorner = () => {
  const [chatSessionId] = useState(() => generateChatSessionId());
  const [chatSessionStartedAt] = useState(() => new Date().toISOString());
  const [chatHistory, setChatHistory] = useState([createMessage('bot', INITIAL_MESSAGE)]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodeKey, setCopiedCodeKey] = useState('');
  const [messageFeedback, setMessageFeedback] = useState({});
  const [feedbackPendingByKey, setFeedbackPendingByKey] = useState({});
  const [feedbackToastByKey, setFeedbackToastByKey] = useState({});
  const [dislikeModalState, setDislikeModalState] = useState({
    isOpen: false,
    messageKey: '',
    botMessageIndex: -1,
    selectedReasons: [],
    details: '',
  });
  const [isSubmittingDislikeFeedback, setIsSubmittingDislikeFeedback] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState('');
  const [isHighlighterReady, setIsHighlighterReady] = useState(Boolean(highlightJsModule));
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const pendingRequestControllerRef = useRef(null);
  const copyResetTimerRef = useRef(null);
  const feedbackToastTimersRef = useRef({});

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container || !shouldStickToBottomRef.current) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(rafId);
  }, [chatHistory, isLoading]);

  useEffect(() => () => {
    pendingRequestControllerRef.current?.abort();
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }

    Object.values(feedbackToastTimersRef.current).forEach((timerId) => {
      clearTimeout(timerId);
    });
    feedbackToastTimersRef.current = {};
  }, []);

  useEffect(() => {
    if (!activeMenuKey || typeof document === 'undefined') {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest('[data-study-action-menu="true"]')) {
        setActiveMenuKey('');
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveMenuKey('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeMenuKey]);

  useEffect(() => {
    if (!dislikeModalState.isOpen || typeof document === 'undefined') {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeDislikeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dislikeModalState.isOpen]);

  useEffect(() => {
    if (highlightJsModule) {
      if (!isHighlighterReady) {
        setIsHighlighterReady(true);
      }
      return;
    }

    const hasCodeBlocks = chatHistory.some((entry) => entry.role === 'bot' && /```/.test(String(entry.text || '')));
    if (!hasCodeBlocks) {
      return;
    }

    let cancelled = false;
    loadHighlighter()
      .then(() => {
        if (!cancelled) {
          setIsHighlighterReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsHighlighterReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatHistory, isHighlighterReady]);

  const markActionComplete = (actionKey) => {
    if (!actionKey) {
      return;
    }

    setCopiedCodeKey(actionKey);

    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }

    copyResetTimerRef.current = setTimeout(() => {
      setCopiedCodeKey('');
    }, 1800);
  };

  const handleCopyCode = async (codeText, codeKey) => {
    const value = String(codeText || '');
    if (!value || !codeKey) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', 'true');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      markActionComplete(codeKey);
    } catch {
      setCopiedCodeKey('');
    }
  };

  const clearFeedbackToast = (messageKey) => {
    if (!messageKey) {
      return;
    }

    if (feedbackToastTimersRef.current[messageKey]) {
      clearTimeout(feedbackToastTimersRef.current[messageKey]);
      delete feedbackToastTimersRef.current[messageKey];
    }

    setFeedbackToastByKey((prev) => {
      if (!prev[messageKey]) {
        return prev;
      }

      const nextToasts = { ...prev };
      delete nextToasts[messageKey];
      return nextToasts;
    });
  };

  const showFeedbackToast = (messageKey, type, text) => {
    if (!messageKey || !text) {
      return;
    }

    if (feedbackToastTimersRef.current[messageKey]) {
      clearTimeout(feedbackToastTimersRef.current[messageKey]);
    }

    setFeedbackToastByKey((prev) => ({
      ...prev,
      [messageKey]: {
        type,
        text,
      },
    }));

    feedbackToastTimersRef.current[messageKey] = setTimeout(() => {
      setFeedbackToastByKey((prev) => {
        if (!prev[messageKey]) {
          return prev;
        }

        const nextToasts = { ...prev };
        delete nextToasts[messageKey];
        return nextToasts;
      });

      delete feedbackToastTimersRef.current[messageKey];
    }, 2400);
  };

  const findPromptForBotReply = (botMessageIndex) => {
    if (botMessageIndex < 0 || botMessageIndex >= chatHistory.length) {
      return '';
    }

    for (let index = botMessageIndex - 1; index >= 0; index -= 1) {
      if (chatHistory[index]?.role === 'user') {
        return String(chatHistory[index]?.text || '').trim();
      }
    }

    return '';
  };

  const closeDislikeModal = () => {
    setDislikeModalState({
      isOpen: false,
      messageKey: '',
      botMessageIndex: -1,
      selectedReasons: [],
      details: '',
    });
    setIsSubmittingDislikeFeedback(false);
  };

  const openDislikeModal = (messageKey, botMessageIndex) => {
    setActiveMenuKey('');
    setDislikeModalState({
      isOpen: true,
      messageKey,
      botMessageIndex,
      selectedReasons: [],
      details: '',
    });
  };

  const toggleDislikeReason = (reasonId) => {
    if (!reasonId) {
      return;
    }

    setDislikeModalState((prev) => {
      const isSelected = prev.selectedReasons.includes(reasonId);
      return {
        ...prev,
        selectedReasons: isSelected
          ? prev.selectedReasons.filter((reason) => reason !== reasonId)
          : [...prev.selectedReasons, reasonId],
      };
    });
  };

  const updateDislikeDetails = (value) => {
    setDislikeModalState((prev) => ({
      ...prev,
      details: String(value || '').slice(0, 1000),
    }));
  };

  const submitFeedback = async ({
    messageKey,
    value,
    botMessageIndex,
    currentSelection,
    reasons = [],
    details = '',
  }) => {
    if (!messageKey || !value || botMessageIndex < 0 || botMessageIndex >= chatHistory.length) {
      return false;
    }

    if (feedbackPendingByKey[messageKey]) {
      return false;
    }

    const nextSelection = currentSelection === value ? '' : value;
    setMessageFeedback((prev) => ({
      ...prev,
      [messageKey]: nextSelection,
    }));

    if (!nextSelection) {
      clearFeedbackToast(messageKey);
      return true;
    }

    const responseText = String(chatHistory[botMessageIndex]?.text || '').trim();
    if (!responseText) {
      return false;
    }

    const promptText = findPromptForBotReply(botMessageIndex);
    const messageTimestamp = String(chatHistory[botMessageIndex]?.createdAt || new Date().toISOString());
    const normalizedReasons = Array.isArray(reasons)
      ? reasons.map((reason) => String(reason || '').trim()).filter(Boolean)
      : [];

    setFeedbackPendingByKey((prev) => ({
      ...prev,
      [messageKey]: true,
    }));
    clearFeedbackToast(messageKey);

    try {
      await aiApi.feedback({
        assistantType: 'STUDY_PLANNER',
        feedbackType: nextSelection.toUpperCase(),
        message: promptText,
        response: responseText,
        sourcePage: 'STUDY_CORNER',
        reasons: normalizedReasons,
        details: String(details || '').trim(),
        chatSessionId,
        chatSessionStartedAt,
        messageTimestamp,
      });

      showFeedbackToast(
        messageKey,
        'success',
        nextSelection === 'up'
          ? 'Saved as helpful.'
          : 'Feedback submitted. Thank you.'
      );

      return true;
    } catch {
      setMessageFeedback((prev) => ({
        ...prev,
        [messageKey]: currentSelection || '',
      }));

      showFeedbackToast(messageKey, 'error', 'Could not save feedback. Please retry.');
      return false;
    } finally {
      setFeedbackPendingByKey((prev) => {
        const nextPending = { ...prev };
        delete nextPending[messageKey];
        return nextPending;
      });
    }
  };

  const handleThumbUpFeedback = (messageKey, botMessageIndex, currentSelection) => {
    void submitFeedback({
      messageKey,
      value: 'up',
      botMessageIndex,
      currentSelection,
    });
  };

  const handleThumbDownClick = (messageKey, botMessageIndex, currentSelection) => {
    if (feedbackPendingByKey[messageKey]) {
      return;
    }

    if (currentSelection === 'down') {
      setMessageFeedback((prev) => ({
        ...prev,
        [messageKey]: '',
      }));
      clearFeedbackToast(messageKey);
      closeDislikeModal();
      return;
    }

    openDislikeModal(messageKey, botMessageIndex);
  };

  const handleSubmitDislikeFeedback = async () => {
    if (isSubmittingDislikeFeedback || !dislikeModalState.isOpen) {
      return;
    }

    const { messageKey, botMessageIndex, selectedReasons, details } = dislikeModalState;
    if (!messageKey || botMessageIndex < 0 || selectedReasons.length === 0) {
      return;
    }

    setIsSubmittingDislikeFeedback(true);
    const currentSelection = messageFeedback[messageKey] || '';

    const didSubmit = await submitFeedback({
      messageKey,
      value: 'down',
      botMessageIndex,
      currentSelection,
      reasons: selectedReasons,
      details,
    });

    setIsSubmittingDislikeFeedback(false);
    if (didSubmit) {
      closeDislikeModal();
    }
  };

  const handleShareResponse = async (responseText, responseKey) => {
    const value = String(responseText || '').trim();
    if (!value) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: value });
        markActionComplete(responseKey);
        return;
      } catch {
        // User may cancel share; fall back to copy behavior.
      }
    }

    await handleCopyCode(value, responseKey);
  };

  const handleToggleMoreMenu = (messageKey) => {
    setActiveMenuKey((current) => (current === messageKey ? '' : messageKey));
  };

  const handleUseResponseAsPrompt = (responseText) => {
    const value = String(responseText || '').trim();
    if (!value) {
      return;
    }

    setUserInput(value);
    setActiveMenuKey('');

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (typeof inputRef.current?.setSelectionRange === 'function') {
        const cursorIndex = value.length;
        inputRef.current.setSelectionRange(cursorIndex, cursorIndex);
      }
    });
  };

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

    closeDislikeModal();
    setActiveMenuKey('');
    shouldStickToBottomRef.current = true;
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

  const handleRegenerateResponse = async (botMessageIndex) => {
    if (isLoading || botMessageIndex < 0 || botMessageIndex >= chatHistory.length) {
      return;
    }

    let userMessageIndex = botMessageIndex - 1;
    while (userMessageIndex >= 0 && chatHistory[userMessageIndex]?.role !== 'user') {
      userMessageIndex -= 1;
    }

    if (userMessageIndex < 0) {
      return;
    }

    const prompt = String(chatHistory[userMessageIndex]?.text || '').trim();
    if (!prompt) {
      return;
    }

    closeDislikeModal();
    setActiveMenuKey('');
    const baseConversation = chatHistory.slice(0, userMessageIndex + 1);
    shouldStickToBottomRef.current = true;
    setChatHistory(baseConversation);
    setIsLoading(true);
    const controller = new AbortController();
    pendingRequestControllerRef.current = controller;

    try {
      const reply = await getAiReply(prompt, baseConversation, controller.signal);
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

  const lastBotMessageIndex = (() => {
    for (let i = chatHistory.length - 1; i >= 0; i -= 1) {
      if (chatHistory[i]?.role === 'bot') {
        return i;
      }
    }

    return -1;
  })();

  const messageActionButtonClass = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-transparent text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200 sm:h-7 sm:w-7';
  const menuItemClass = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 sm:text-sm';
  const activeDislikeResponseText = dislikeModalState.botMessageIndex >= 0
    ? String(chatHistory[dislikeModalState.botMessageIndex]?.text || '')
    : '';
  const canSubmitDislikeFeedback = dislikeModalState.selectedReasons.length > 0 && !isSubmittingDislikeFeedback;

  return (
    <section className="w-full py-2 sm:py-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto w-full max-w-6xl rounded-2xl border-2 border-slate-400 bg-[linear-gradient(145deg,#f8fafc_0%,#e2e8f0_55%,#dbeafe_100%)] p-4 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-[linear-gradient(145deg,#0f172a_0%,#1e293b_55%,#0b1220_100%)] sm:rounded-3xl sm:p-6 md:p-8"
      >
        <header className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl" aria-hidden="true">🎓</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">AI Study Corner</h1>
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 sm:text-base">
            Chat with our AI planner to create a custom study schedule to help you ace your tests.
          </p>
        </header>

        <div className="flex h-[68vh] min-h-[24rem] max-h-[42rem] flex-col overflow-hidden rounded-2xl border-2 border-slate-400 bg-[linear-gradient(180deg,#e2e8f0_0%,#e5e7eb_48%,#dbeafe_100%)] p-3 shadow-inner dark:border-slate-700 dark:bg-[linear-gradient(180deg,#1e293b_0%,#172033_55%,#0f172a_100%)] sm:p-4">
          <div
            ref={chatScrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              shouldStickToBottomRef.current = distanceFromBottom < 96;
            }}
            className="mcm-chat-scroll flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 sm:space-y-4 sm:pr-2"
          >
            {chatHistory.map((msg, index) => {
              const isUser = msg.role === 'user';
              const messageKey = `study-corner-msg-${index}`;
              const copyAllKey = `${messageKey}-all`;
              const shareAllKey = `${messageKey}-share`;
              const selectedFeedback = messageFeedback[messageKey] || '';
              const isFeedbackPending = Boolean(feedbackPendingByKey[messageKey]);
              const feedbackToast = feedbackToastByKey[messageKey] || null;
              const canRegenerate = index === lastBotMessageIndex;
              const isMenuOpen = activeMenuKey === messageKey;

              return (
                <div key={`study-corner-msg-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[80%] sm:px-4 sm:py-3 sm:text-[15px] ${isUser
                    ? 'rounded-br-md border border-indigo-700/80 bg-indigo-600 text-white dark:border-indigo-400/40'
                    : 'rounded-bl-md border border-slate-400 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
                    {renderMessageContent(msg, {
                      messageKey,
                      onCopyCode: handleCopyCode,
                      copiedCodeKey,
                      highlighter: isHighlighterReady ? highlightJsModule : null,
                    })}
                    <p className={`mt-1 text-[11px] ${isUser ? 'text-indigo-100/90' : 'text-slate-500 dark:text-slate-500'}`}>
                      {msg.time}
                    </p>
                    {!isUser && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(msg.text, copyAllKey)}
                            className={messageActionButtonClass}
                            title={copiedCodeKey === copyAllKey ? 'Copied' : 'Copy response'}
                            aria-label={copiedCodeKey === copyAllKey ? 'Copied response' : 'Copy response'}
                          >
                            {copiedCodeKey === copyAllKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleThumbUpFeedback(messageKey, index, selectedFeedback)}
                            disabled={isFeedbackPending}
                            className={`${messageActionButtonClass} ${selectedFeedback === 'up' ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-300' : ''} ${isFeedbackPending ? 'cursor-not-allowed opacity-60' : ''}`}
                            title="Helpful"
                            aria-label="Mark response as helpful"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleThumbDownClick(messageKey, index, selectedFeedback)}
                            disabled={isFeedbackPending}
                            className={`${messageActionButtonClass} ${selectedFeedback === 'down' ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/20 dark:text-rose-300' : ''} ${isFeedbackPending ? 'cursor-not-allowed opacity-60' : ''}`}
                            title="Needs improvement"
                            aria-label="Mark response as not helpful"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareResponse(msg.text, shareAllKey)}
                            className={messageActionButtonClass}
                            title="Share response"
                            aria-label="Share response"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateResponse(index)}
                            disabled={!canRegenerate || isLoading}
                            className={`${messageActionButtonClass} ${(!canRegenerate || isLoading) ? 'cursor-not-allowed opacity-50' : ''}`}
                            title={canRegenerate ? 'Regenerate response' : 'Regenerate available on latest response'}
                            aria-label="Regenerate response"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <div className="relative" data-study-action-menu="true">
                            <button
                              type="button"
                              onClick={() => handleToggleMoreMenu(messageKey)}
                              className={`${messageActionButtonClass} ${isMenuOpen ? 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100' : ''}`}
                              title="More options"
                              aria-label="More options"
                              aria-expanded={isMenuOpen}
                            >
                              <Ellipsis className="h-3.5 w-3.5" />
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-slate-300 bg-white p-1.5 shadow-lg dark:border-slate-600 dark:bg-slate-800 sm:w-48">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCopyCode(msg.text, copyAllKey);
                                    setActiveMenuKey('');
                                  }}
                                  className={menuItemClass}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copy response</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUseResponseAsPrompt(msg.text)}
                                  className={menuItemClass}
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  <span>Use in prompt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (canRegenerate && !isLoading) {
                                      handleRegenerateResponse(index);
                                    }
                                    setActiveMenuKey('');
                                  }}
                                  disabled={!canRegenerate || isLoading}
                                  className={`${menuItemClass} ${(!canRegenerate || isLoading) ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  <span>Regenerate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveMenuKey('')}
                                  className={menuItemClass}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Close</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {feedbackToast && (
                          <div
                            role="status"
                            aria-live="polite"
                            className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${feedbackToast.type === 'success'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/20 dark:text-rose-300'}`}
                          >
                            {feedbackToast.type === 'success'
                              ? <Check className="h-3 w-3 shrink-0" />
                              : <X className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{feedbackToast.text}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-400 bg-slate-50 px-3 py-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse dark:bg-slate-300" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse [animation-delay:0.15s] dark:bg-slate-300" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse [animation-delay:0.3s] dark:bg-slate-300" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 sm:mt-4 sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-500 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:text-base"
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
                <span className="inline-flex items-center gap-2">
                  <Square className="h-3.5 w-3.5 fill-current stroke-current" />
                  <span>Stop</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <ArrowUp className="h-4 w-4" />
                  <span>Send</span>
                </span>
              )}
            </button>
          </form>
        </div>
      </motion.div>

      {dislikeModalState.isOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 mcm-safe-overlay-padding"
          onClick={closeDislikeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share feedback"
            className="w-full max-w-xl rounded-2xl border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Share feedback</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Help us improve this response quality.</p>
              </div>
              <button
                type="button"
                onClick={closeDislikeModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                aria-label="Close feedback dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {DISLIKE_REASON_OPTIONS.map((reason) => {
                const isSelected = dislikeModalState.selectedReasons.includes(reason.id);

                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => toggleDislikeReason(reason.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${isSelected
                      ? 'border-rose-400 bg-rose-100 text-rose-700 dark:border-rose-400/60 dark:bg-rose-500/20 dark:text-rose-300'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    {reason.label}
                  </button>
                );
              })}
            </div>

            <label htmlFor="study-corner-feedback-details" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Share details (optional)
            </label>
            <textarea
              id="study-corner-feedback-details"
              rows={3}
              value={dislikeModalState.details}
              onChange={(event) => updateDislikeDetails(event.target.value)}
              placeholder="Tell us what was wrong with this answer..."
              className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Chat session id: <span className="font-mono">{chatSessionId}</span>
            </div>

            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Your conversation context will be included with this feedback to improve Study Corner responses.
            </p>

            {activeDislikeResponseText && (
              <p className="mt-2 max-h-10 overflow-hidden text-xs text-slate-500 dark:text-slate-400">
                Response preview: {activeDislikeResponseText}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDislikeModal}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDislikeFeedback}
                disabled={!canSubmitDislikeFeedback}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 dark:border-slate-500 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white dark:disabled:border-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              >
                {isSubmittingDislikeFeedback ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default StudyCorner;
