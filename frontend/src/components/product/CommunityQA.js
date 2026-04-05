import React, { useEffect, useMemo, useState } from 'react';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { products } from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHandling/errorMessageUtils';

const normalizeQuestions = (items) => {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map((item, index) => ({
            id: item?.id ?? `local-question-${index}`,
            question: item?.question || item?.text || '',
            author: item?.author || 'Campus User',
            createdAt: item?.createdAt || null,
            answers: Array.isArray(item?.answers)
                ? item.answers.map((answer, answerIndex) => ({
                    id: answer?.id ?? `local-answer-${index}-${answerIndex}`,
                    text: answer?.text || answer?.answer || '',
                    author: answer?.author || 'Seller',
                    createdAt: answer?.createdAt || null,
                }))
                : [],
        }))
        .filter((item) => item.question);
};

const formatRelativeTime = (value) => {
    if (!value) {
        return 'Just now';
    }

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
        return 'Recently';
    }

    const diffMs = Date.now() - timestamp;
    if (diffMs < 60 * 1000) {
        return 'Just now';
    }

    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
        return `${days}d ago`;
    }

    return new Date(timestamp).toLocaleDateString();
};

const normalizeSentence = (value) => (value || '').trim().replace(/\s+/g, ' ');

const CommunityQA = ({ productId, sellerUserId, questions: initialQuestions = [] }) => {
    const { state, dispatch } = useGlobalState();
    const [newQuestion, setNewQuestion] = useState('');
    const [answerDrafts, setAnswerDrafts] = useState({});
    const [questionItems, setQuestionItems] = useState(() => normalizeQuestions(initialQuestions));
    const [isLoading, setIsLoading] = useState(false);
    const [isAsking, setIsAsking] = useState(false);
    const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
    const [loadError, setLoadError] = useState('');

    const normalizedProductId = useMemo(() => {
        const parsed = Number(productId);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [productId]);

    const canUseBackend = normalizedProductId !== null;
    const currentUserId = useMemo(() => {
        const parsed = Number(state.user?.id);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [state.user?.id]);
    const listingOwnerId = useMemo(() => {
        const parsed = Number(sellerUserId);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [sellerUserId]);
    const canAnswerQuestions = state.isLoggedIn
        && currentUserId != null
        && (Boolean(state.user?.isAdmin) || (listingOwnerId != null && listingOwnerId === currentUserId));

    const pushNotification = (message, type = 'error') => {
        dispatch({
            type: actionTypes.ADD_NOTIFICATION,
            payload: { message, type },
        });
    };

    useEffect(() => {
        setQuestionItems(normalizeQuestions(initialQuestions));
    }, [initialQuestions]);

    useEffect(() => {
        if (!canUseBackend) {
            return;
        }

        setIsLoading(true);
        setLoadError('');

        products.getQuestions(normalizedProductId)
            .then((response) => {
                setQuestionItems(normalizeQuestions(response.data));
            })
            .catch(() => {
                setLoadError('Could not load community questions right now.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [canUseBackend, normalizedProductId]);

    const handleAsk = async (event) => {
        event.preventDefault();

        const normalizedQuestion = normalizeSentence(newQuestion);
        if (normalizedQuestion.length < 8) {
            pushNotification('Question should be at least 8 characters.');
            return;
        }

        if (!state.isLoggedIn) {
            pushNotification('Please sign in to ask a question.');
            return;
        }

        if (!canUseBackend) {
            pushNotification('Q&A for this item is currently unavailable.');
            return;
        }

        if (isAsking) {
            return;
        }

        setIsAsking(true);
        try {
            const response = await products.askQuestion(normalizedProductId, normalizedQuestion);
            const createdQuestion = normalizeQuestions([response.data])[0];
            if (createdQuestion) {
                setQuestionItems((prev) => [createdQuestion, ...prev]);
            }
            setNewQuestion('');
            pushNotification('Question posted successfully!', 'success');
        } catch (error) {
            pushNotification(getErrorMessage(error, 'Unable to post your question right now.'));
        } finally {
            setIsAsking(false);
        }
    };

    const handleAnswerSubmit = async (questionId) => {
        const draft = normalizeSentence(answerDrafts[questionId]);
        if (draft.length < 2) {
            pushNotification('Answer should be at least 2 characters.');
            return;
        }

        if (!state.isLoggedIn) {
            pushNotification('Please sign in to answer questions.');
            return;
        }

        if (!canUseBackend) {
            pushNotification('Q&A for this item is currently unavailable.');
            return;
        }

        if (answeringQuestionId === questionId) {
            return;
        }

        setAnsweringQuestionId(questionId);
        try {
            const response = await products.answerQuestion(normalizedProductId, questionId, draft);
            const updatedQuestion = normalizeQuestions([response.data])[0];

            if (updatedQuestion) {
                setQuestionItems((prev) => prev.map((item) => (
                    String(item.id) === String(questionId) ? updatedQuestion : item
                )));
            }

            setAnswerDrafts((prev) => ({
                ...prev,
                [questionId]: '',
            }));

            pushNotification('Answer posted successfully!', 'success');
        } catch (error) {
            pushNotification(getErrorMessage(error, 'Unable to post answer right now.'));
        } finally {
            setAnsweringQuestionId(null);
        }
    };

    return (
        <section className="mt-12 rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Community Q&amp;A</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Ask about item condition, inclusions, pickup location, or compatibility before buying.
                </p>
            </div>

            <div className="p-5 sm:p-6">
                <form onSubmit={handleAsk} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                        type="text"
                        value={newQuestion}
                        onChange={(event) => setNewQuestion(event.target.value)}
                        placeholder="Ask a question about this item..."
                        className="w-full flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-cyan-900"
                    />
                    <button
                        type="submit"
                        disabled={!normalizeSentence(newQuestion) || isAsking}
                        className="rounded-xl bg-cyan-600 px-5 py-2.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isAsking ? 'Posting...' : 'Ask'}
                    </button>
                </form>

                {!canUseBackend && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                        This listing is in demo mode, so live Q&amp;A is disabled.
                    </p>
                )}

                {loadError && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                        {loadError}
                    </div>
                )}

                <div className="mt-5 space-y-3">
                    {isLoading && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            Loading community questions...
                        </div>
                    )}

                    {!isLoading && questionItems.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            Be the first to ask a question!
                        </div>
                    )}

                    {!isLoading && questionItems.map((question) => (
                        <article
                            key={question.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-cyan-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                                    <span className="mr-1 text-cyan-700 dark:text-cyan-300">Q.</span>
                                    {question.question}
                                </p>
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {formatRelativeTime(question.createdAt)}
                                </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Asked by {question.author || 'Campus User'}
                            </p>

                            {question.answers.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                    {question.answers.map((answer) => (
                                        <div
                                            key={answer.id}
                                            className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-900/20"
                                        >
                                            <p className="text-sm text-slate-800 dark:text-slate-100">
                                                <span className="mr-1 font-semibold text-emerald-700 dark:text-emerald-300">A.</span>
                                                {answer.text}
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                {answer.author || 'Seller'} • {formatRelativeTime(answer.createdAt)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No answers yet.</p>
                            )}

                            {canAnswerQuestions && (
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <input
                                        type="text"
                                        value={answerDrafts[question.id] || ''}
                                        onChange={(event) => setAnswerDrafts((prev) => ({
                                            ...prev,
                                            [question.id]: event.target.value,
                                        }))}
                                        placeholder="Reply as seller"
                                        className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-emerald-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAnswerSubmit(question.id)}
                                        disabled={!normalizeSentence(answerDrafts[question.id]) || answeringQuestionId === question.id}
                                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {answeringQuestionId === question.id ? 'Posting...' : 'Reply'}
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CommunityQA;
