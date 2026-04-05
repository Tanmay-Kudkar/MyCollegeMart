import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { products } from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHandling/errorMessageUtils';

const normalizeAnswerAuthorRole = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'SELLER' || normalized === 'ADMIN' || normalized === 'COMMUNITY') {
        return normalized;
    }

    return 'COMMUNITY';
};

const getRoleBadgeConfig = (role) => {
    if (role === 'SELLER') {
        return {
            label: 'Verified Seller',
            className: 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-300',
        };
    }

    if (role === 'ADMIN') {
        return {
            label: 'Admin',
            className: 'border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-900/30 dark:text-indigo-300',
        };
    }

    return {
        label: 'Community',
        className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
};

const resolveAnswerRole = (answer, listingOwnerUserId) => {
    const roleFromPayload = normalizeAnswerAuthorRole(answer?.authorRole);
    if (roleFromPayload !== 'COMMUNITY') {
        return roleFromPayload;
    }

    const answerUserId = Number(answer?.authorUserId);
    if (listingOwnerUserId != null && Number.isFinite(answerUserId) && answerUserId === listingOwnerUserId) {
        return 'SELLER';
    }

    return 'COMMUNITY';
};

const getRolePriority = (role) => {
    if (role === 'SELLER') {
        return 0;
    }

    if (role === 'ADMIN') {
        return 1;
    }

    return 2;
};

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
                    author: answer?.author || 'Campus User',
                    authorUserId: answer?.authorUserId ?? null,
                    authorRole: normalizeAnswerAuthorRole(answer?.authorRole),
                    createdAt: answer?.createdAt || null,
                }))
                : [],
        }))
        .filter((item) => item.question);
};

const formatDateDayTime = (value) => {
    if (!value) {
        return 'Date unavailable';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Date unavailable';
    }

    return parsed.toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const normalizeSentence = (value) => (value || '').trim().replace(/\s+/g, ' ');

const buildQuestionSignature = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return '';
    }

    return items
        .map((item) => {
            const answers = Array.isArray(item?.answers) ? item.answers : [];

            const answerSignature = answers
                .map((answer) => [
                    String(answer?.id ?? ''),
                    normalizeSentence(answer?.text || answer?.answer || ''),
                    String(answer?.author ?? ''),
                    String(answer?.authorUserId ?? ''),
                    String(answer?.authorRole ?? ''),
                    String(answer?.createdAt ?? ''),
                ].join('~'))
                .join('|');

            return [
                String(item?.id ?? ''),
                normalizeSentence(item?.question || item?.text || ''),
                String(item?.author ?? ''),
                String(item?.createdAt ?? ''),
                answerSignature,
            ].join('#');
        })
        .join('||');
};

const COMMUNITY_QA_FETCH_TIMEOUT_MS = 3500;
const COMMUNITY_QA_RETRY_MS = 1000;

const CommunityQA = ({ productId, sellerUserId, questions: initialQuestions = [] }) => {
    const { state, dispatch } = useGlobalState();
    const normalizedInitialQuestions = useMemo(
        () => normalizeQuestions(initialQuestions),
        [initialQuestions],
    );
    const initialQuestionsSignature = useMemo(
        () => buildQuestionSignature(normalizedInitialQuestions),
        [normalizedInitialQuestions],
    );
    const syncedInitialQuestionsSignatureRef = useRef(initialQuestionsSignature);
    const questionCardRefs = useRef(new Map());
    const [newQuestion, setNewQuestion] = useState('');
    const [answerDrafts, setAnswerDrafts] = useState({});
    const [questionItems, setQuestionItems] = useState(() => normalizedInitialQuestions);
    const [isLoading, setIsLoading] = useState(false);
    const [isAsking, setIsAsking] = useState(false);
    const [recentQuestionId, setRecentQuestionId] = useState(null);
    const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
    const [editingAnswerKey, setEditingAnswerKey] = useState('');
    const [editAnswerDraft, setEditAnswerDraft] = useState('');
    const [updatingAnswerKey, setUpdatingAnswerKey] = useState('');
    const [deletingAnswerKey, setDeletingAnswerKey] = useState('');
    const [loadError, setLoadError] = useState('');
    const [isRetryingLoad, setIsRetryingLoad] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);

    const normalizedProductId = useMemo(() => {
        const parsed = Number(productId);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [productId]);

    const normalizedSellerUserId = useMemo(() => {
        const parsed = Number(sellerUserId);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [sellerUserId]);

    const currentUserId = useMemo(() => {
        const parsed = Number(state.user?.id);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [state.user?.id]);

    const isAdmin = Boolean(state.user?.isAdmin);

    const canUseBackend = normalizedProductId !== null;
    const canAnswerQuestions = state.isLoggedIn;

    const answeredCount = useMemo(
        () => questionItems.filter((question) => question.answers.length > 0).length,
        [questionItems],
    );

    const pushNotification = (message, type = 'error') => {
        dispatch({
            type: actionTypes.ADD_NOTIFICATION,
            payload: { message, type },
        });
    };

    useEffect(() => {
        if (syncedInitialQuestionsSignatureRef.current === initialQuestionsSignature) {
            return;
        }

        syncedInitialQuestionsSignatureRef.current = initialQuestionsSignature;
        setQuestionItems(normalizedInitialQuestions);
    }, [initialQuestionsSignature, normalizedInitialQuestions]);

    useEffect(() => {
        if (!canUseBackend) {
            return;
        }

        let isCancelled = false;

        setIsLoading(true);

        products.getQuestions(normalizedProductId, { timeout: COMMUNITY_QA_FETCH_TIMEOUT_MS })
            .then((response) => {
                if (!isCancelled) {
                    setQuestionItems(normalizeQuestions(response.data));
                    setLoadError('');
                    setIsRetryingLoad(false);
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setLoadError('Reconnecting to the server. Community questions will appear automatically in a moment.');
                    setIsRetryingLoad(true);
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [canUseBackend, normalizedProductId, reloadTick]);

    useEffect(() => {
        if (!canUseBackend || !isRetryingLoad || isLoading || typeof window === 'undefined') {
            return;
        }

        const triggerReload = () => {
            setReloadTick((value) => value + 1);
        };

        const retryTimer = window.setTimeout(triggerReload, COMMUNITY_QA_RETRY_MS);
        window.addEventListener('online', triggerReload);

        return () => {
            window.clearTimeout(retryTimer);
            window.removeEventListener('online', triggerReload);
        };
    }, [canUseBackend, isRetryingLoad, isLoading]);

    useEffect(() => {
        if (recentQuestionId == null || typeof window === 'undefined') {
            return;
        }

        const highlightTimer = window.setTimeout(() => {
            setRecentQuestionId(null);
        }, 4500);

        return () => {
            window.clearTimeout(highlightTimer);
        };
    }, [recentQuestionId]);

    useEffect(() => {
        if (recentQuestionId == null || typeof window === 'undefined') {
            return;
        }

        const cardElement = questionCardRefs.current.get(String(recentQuestionId));
        if (!cardElement) {
            return;
        }

        const scrollFrame = window.requestAnimationFrame(() => {
            cardElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        });

        return () => {
            window.cancelAnimationFrame(scrollFrame);
        };
    }, [recentQuestionId, questionItems]);

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
                setRecentQuestionId(createdQuestion.id ?? null);
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

    const getAnswerActionKey = (questionId, answerId) => `${questionId}:${answerId}`;

    const canManageAnswer = (answer) => {
        if (!state.isLoggedIn) {
            return false;
        }

        if (isAdmin) {
            return true;
        }

        const answerUserId = Number(answer?.authorUserId);
        return currentUserId != null
            && Number.isFinite(answerUserId)
            && answerUserId === currentUserId;
    };

    const sortAnswersForDisplay = (answers) => {
        if (!Array.isArray(answers)) {
            return [];
        }

        return [...answers].sort((first, second) => {
            const firstRole = resolveAnswerRole(first, normalizedSellerUserId);
            const secondRole = resolveAnswerRole(second, normalizedSellerUserId);

            const priorityDiff = getRolePriority(firstRole) - getRolePriority(secondRole);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            const firstTime = new Date(first?.createdAt || 0).getTime();
            const secondTime = new Date(second?.createdAt || 0).getTime();
            if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) {
                return 0;
            }

            return firstTime - secondTime;
        });
    };

    const handleStartAnswerEdit = (questionId, answer) => {
        const actionKey = getAnswerActionKey(questionId, answer.id);
        setEditingAnswerKey(actionKey);
        setEditAnswerDraft(answer?.text || '');
    };

    const handleCancelAnswerEdit = () => {
        setEditingAnswerKey('');
        setEditAnswerDraft('');
    };

    const handleUpdateAnswer = async (questionId, answerId) => {
        const actionKey = getAnswerActionKey(questionId, answerId);
        const normalizedDraft = normalizeSentence(editAnswerDraft);

        if (normalizedDraft.length < 2) {
            pushNotification('Answer should be at least 2 characters.');
            return;
        }

        if (!state.isLoggedIn) {
            pushNotification('Please sign in to edit responses.');
            return;
        }

        if (!canUseBackend) {
            pushNotification('Q&A for this item is currently unavailable.');
            return;
        }

        if (updatingAnswerKey === actionKey) {
            return;
        }

        setUpdatingAnswerKey(actionKey);
        try {
            const response = await products.updateQuestionAnswer(
                normalizedProductId,
                questionId,
                answerId,
                normalizedDraft,
            );

            const updatedQuestion = normalizeQuestions([response.data])[0];
            if (updatedQuestion) {
                setQuestionItems((prev) => prev.map((item) => (
                    String(item.id) === String(questionId) ? updatedQuestion : item
                )));
            }

            setEditingAnswerKey('');
            setEditAnswerDraft('');
            pushNotification('Response updated successfully!', 'success');
        } catch (error) {
            pushNotification(getErrorMessage(error, 'Unable to update response right now.'));
        } finally {
            setUpdatingAnswerKey('');
        }
    };

    const handleDeleteAnswer = async (questionId, answerId) => {
        const actionKey = getAnswerActionKey(questionId, answerId);

        if (!state.isLoggedIn) {
            pushNotification('Please sign in to delete responses.');
            return;
        }

        if (!canUseBackend) {
            pushNotification('Q&A for this item is currently unavailable.');
            return;
        }

        if (deletingAnswerKey === actionKey) {
            return;
        }

        if (typeof window !== 'undefined' && !window.confirm('Delete this response?')) {
            return;
        }

        setDeletingAnswerKey(actionKey);
        try {
            const response = await products.deleteQuestionAnswer(normalizedProductId, questionId, answerId);
            const updatedQuestion = normalizeQuestions([response.data])[0];

            if (updatedQuestion) {
                setQuestionItems((prev) => prev.map((item) => (
                    String(item.id) === String(questionId) ? updatedQuestion : item
                )));
            }

            if (editingAnswerKey === actionKey) {
                setEditingAnswerKey('');
                setEditAnswerDraft('');
            }

            pushNotification('Response deleted successfully!', 'success');
        } catch (error) {
            pushNotification(getErrorMessage(error, 'Unable to delete response right now.'));
        } finally {
            setDeletingAnswerKey('');
        }
    };

    return (
        <section className="mt-12 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 bg-slate-50/85 px-5 py-5 dark:border-slate-700 dark:bg-slate-900/40 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Customer Questions &amp; Answers</h3>
                        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                            Ask about condition, included accessories, pickup options, and compatibility before ordering.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                            {questionItems.length} Questions
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/25 dark:text-emerald-300">
                            {answeredCount} Answered
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                <form
                    onSubmit={handleAsk}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
                >
                    <label htmlFor="qa-question-input" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Have a question?
                    </label>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                            id="qa-question-input"
                            type="text"
                            value={newQuestion}
                            onChange={(event) => setNewQuestion(event.target.value)}
                            placeholder="Example: Does this calculator include original cover and batteries?"
                            className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-amber-900/40"
                        />
                        <button
                            type="submit"
                            disabled={!normalizeSentence(newQuestion) || isAsking}
                            className="rounded-lg border border-amber-500 bg-amber-400 px-6 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isAsking ? 'Posting...' : 'Ask Question'}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Keep your question specific so sellers can respond quickly.
                    </p>
                </form>

                {!canUseBackend && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                        This listing is in demo mode, so live Q&amp;A is currently unavailable.
                    </p>
                )}

                {isRetryingLoad && loadError && (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                        {loadError}
                    </div>
                )}

                <div className="mt-5 space-y-3">
                    {isLoading && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            Loading community questions...
                        </div>
                    )}

                    {!isLoading && questionItems.length === 0 && (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            Be the first to ask a question.
                        </div>
                    )}

                    {!isLoading && questionItems.map((question) => {
                        const sortedAnswers = sortAnswersForDisplay(question.answers);
                        const isRecentlyPosted = recentQuestionId != null
                            && String(question.id) === String(recentQuestionId);

                        return (
                            <article
                                key={question.id}
                                ref={(node) => {
                                    const questionKey = String(question.id);

                                    if (node) {
                                        questionCardRefs.current.set(questionKey, node);
                                        return;
                                    }

                                    questionCardRefs.current.delete(questionKey);
                                }}
                                className={`rounded-xl border p-4 shadow-sm transition-colors ${
                                    isRecentlyPosted
                                        ? 'border-amber-300 bg-amber-50/70 ring-1 ring-amber-200/80 dark:border-amber-500/50 dark:bg-amber-900/20 dark:ring-amber-500/40'
                                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                            Q
                                        </span>
                                        <p className="min-w-0 break-words text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                                            {question.question}
                                        </p>
                                    </div>

                                    {isRecentlyPosted && (
                                        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-700/70 dark:bg-amber-900/40 dark:text-amber-300">
                                            Just posted
                                        </span>
                                    )}
                                </div>

                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Asked by <span className="font-semibold text-slate-700 dark:text-slate-200">{question.author || 'Campus User'}</span> - {formatDateDayTime(question.createdAt)}
                                </p>

                                {sortedAnswers.length > 0 ? (
                                    <div className="mt-3 space-y-2">
                                        {sortedAnswers.map((answer) => {
                                            const role = resolveAnswerRole(answer, normalizedSellerUserId);
                                            const roleBadge = getRoleBadgeConfig(role);
                                            const answerActionKey = getAnswerActionKey(question.id, answer.id);
                                            const isEditing = editingAnswerKey === answerActionKey;
                                            const isUpdating = updatingAnswerKey === answerActionKey;
                                            const isDeleting = deletingAnswerKey === answerActionKey;
                                            const canManage = canManageAnswer(answer);

                                            return (
                                                <div
                                                    key={answer.id}
                                                    className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-900/20"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white dark:bg-emerald-500">
                                                            A
                                                        </span>
                                                        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                                            {answer.text}
                                                        </p>
                                                    </div>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadge.className}`}>
                                                            {roleBadge.label}
                                                        </span>
                                                        <span className="break-words">
                                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{answer.author || 'Campus User'}</span> - {formatDateDayTime(answer.createdAt)}
                                                        </span>
                                                    </div>

                                                    {canManage && (
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            {!isEditing ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStartAnswerEdit(question.id, answer)}
                                                                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteAnswer(question.id, answer.id)}
                                                                        disabled={isDeleting}
                                                                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                                                                    >
                                                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                                                                    <input
                                                                        type="text"
                                                                        value={editAnswerDraft}
                                                                        onChange={(event) => setEditAnswerDraft(event.target.value)}
                                                                        className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-emerald-900"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateAnswer(question.id, answer.id)}
                                                                        disabled={!normalizeSentence(editAnswerDraft) || isUpdating}
                                                                        className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        {isUpdating ? 'Saving...' : 'Save'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleCancelAnswerEdit}
                                                                        disabled={isUpdating}
                                                                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                            placeholder="Write your response"
                                            className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-emerald-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleAnswerSubmit(question.id)}
                                            disabled={!normalizeSentence(answerDrafts[question.id]) || answeringQuestionId === question.id}
                                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {answeringQuestionId === question.id ? 'Posting...' : 'Reply'}
                                        </button>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default CommunityQA;
