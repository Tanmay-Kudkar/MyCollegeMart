import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { TrashIcon, SparklesIcon, UploadIcon, CloseIcon } from '../../components/UI/Icons';
import { products, ai as aiApi } from '../../utils/api';
import { ENGINEERING_BRANCHES, SEMESTERS, PRODUCT_CATEGORIES } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errorHandling/errorMessageUtils';

const FALLBACK_SPEC_PLACEHOLDER = { id: 'custom', key: 'Specification', value: 'Value' };
const MAX_IMAGES = 10;
const MAX_VIDEOS = 3;
const MAX_VIDEO_SIZE_MB = 10;

const safeParseJson = (value, fallback) => {
  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
};

const Sell = ({ onNavigate, pageParams = {} }) => {
  const { state, dispatch } = useGlobalState();
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Textbooks');
  const [branch, setBranch] = useState('All Branches');
  const [semester, setSemester] = useState('All');
  const [inStock, setInStock] = useState(true);
  const [stockQuantity, setStockQuantity] = useState('');
  const [targetSuggestion, setTargetSuggestion] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]); // New state for video previews
  const [videoUrl, setVideoUrl] = useState('');
  const [highlights, setHighlights] = useState(['', '', '']);
  // const [specs, setSpecs] = useState([{ key: '', value: '' }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [videoError, setVideoError] = useState(''); // Track video upload errors
  const videoInputRef = useRef(null); // Reference to video input element

  const isEditMode = pageParams?.mode === 'edit' && Number.isFinite(Number(pageParams?.productId));
  const editProductId = isEditMode ? Number(pageParams?.productId) : null;

  const branches = ENGINEERING_BRANCHES;

  const normalizeAiDescription = (rawText) => {
    const cleaned = String(rawText || '')
      .replace(/\r/g, '')
      .replace(/^\"|\"$/g, '')
      .trim();

    if (!cleaned) {
      return '';
    }

    let lines = cleaned
      .split('\n')
      .map((line) => line.replace(/^[-*\u2022]\s*/, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      const sentenceParts = cleaned
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      if (sentenceParts.length > 1) {
        lines = sentenceParts;
      }
    }

    const contentLines = (lines.length ? lines : [cleaned]).slice(0, 2);
    const branchKeyword = branch === 'All Branches' ? 'All Branches' : branch;
    const semesterKeyword = semester === 'All' ? 'All Semesters' : `Semester ${semester}`;
    const keywordLine = `Best for: ${branchKeyword}, ${semesterKeyword}.`;

    const joinedLower = contentLines.join(' ').toLowerCase();
    const hasBranchKeyword = joinedLower.includes(branchKeyword.toLowerCase());
    const hasSemesterKeyword = joinedLower.includes(semesterKeyword.toLowerCase());

    const finalLines = [...contentLines];
    if (!hasBranchKeyword || !hasSemesterKeyword) {
      finalLines.push(keywordLine);
    }

    return finalLines.slice(0, 3).join('\n');
  };
  const semesters = SEMESTERS;
  const categories = PRODUCT_CATEGORIES;

  const handleImageChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const selectedImages = Array.from(e.target.files);
    if (imagePreviews.length + selectedImages.length > MAX_IMAGES) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: `You can upload up to ${MAX_IMAGES} images.`, type: 'error' }
      });
      e.target.value = '';
      return;
    }

    const filesArray = selectedImages.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setImagePreviews(prev => prev.concat(filesArray));
    e.target.value = '';
  };
  
  const removeImage = (index) => {
    setImagePreviews(prev => {
      const nextImages = [...prev];
      URL.revokeObjectURL(nextImages[index].url);
      nextImages.splice(index, 1);
      return nextImages;
    });
  };

  // New function to handle video uploads
  const handleVideoChange = async (e) => {
    setVideoError('');
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newVideos = Array.from(e.target.files);
    if (videoPreviews.length + newVideos.length > MAX_VIDEOS) {
      const message = `Maximum ${MAX_VIDEOS} videos allowed`;
      setVideoError(message);
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message, type: 'error' }
      });
      return;
    }
    
    for (const file of newVideos) {
      // Check file size (rough estimate: 1MB per 10 seconds for medium quality)
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        const message = `Video "${file.name}" exceeds maximum size of ${MAX_VIDEO_SIZE_MB}MB`;
        setVideoError(message);
        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: { message, type: 'error' }
        });
        return;
      }
      
      // Create preview with additional metadata
      const videoObj = {
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        file: file // Store the actual file
      };
      
      setVideoPreviews(prev => [...prev, videoObj]);
    }
    
    // Reset the input to allow selecting the same file again
    if (videoInputRef.current) videoInputRef.current.value = '';
  };
  
  // Remove video function
  const removeVideo = (index) => {
    setVideoPreviews(prev => {
      const newPreviews = [...prev];
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };
  
  const handleHighlightChange = (index, value) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  // Define all available specification options
  const allSpecOptions = [
    { id: "condition", key: "Condition", value: "Used - Like New" },
    { id: "brand", key: "Brand", value: "e.g., Casio, HP, Staedtler" },
    { id: "edition", key: "Edition", value: "e.g., 4th Edition, 2023" },
    { id: "author", key: "Author", value: "e.g., P.K. Nag, H.C. Verma" },
    { id: "publication", key: "Publication", value: "e.g., Pearson, McGraw Hill" },
    { id: "age", key: "Age", value: "e.g., 6 months old" },
    { id: "purchase_date", key: "Purchase Date", value: "e.g., Jan 2023" },
    { id: "warranty", key: "Warranty", value: "e.g., 3 months remaining" },
    { id: "features", key: "Features", value: "e.g., Annotated, Solved examples" },
    { id: "subject", key: "Subject", value: "e.g., Data Structures, Thermodynamics" }
  ];

  // Initialize specs and track available options
  const [specs, setSpecs] = useState([]);
  const [availableOptions, setAvailableOptions] = useState([...allSpecOptions]);
  const [showMaxSpecsWarning, setShowMaxSpecsWarning] = useState(false);

  const clearImagePreviews = () => {
    setImagePreviews((prev) => {
      prev.forEach((image) => {
        if (image?.url) {
          URL.revokeObjectURL(image.url);
        }
      });
      return [];
    });
  };

  const clearVideoPreviews = () => {
    setVideoPreviews((prev) => {
      prev.forEach((video) => {
        if (video?.url) {
          URL.revokeObjectURL(video.url);
        }
      });
      return [];
    });
  };

  const resetFormState = () => {
    setItemName('');
    setPrice('');
    setCategory('Textbooks');
    setBranch('All Branches');
    setSemester('All');
    setInStock(true);
    setStockQuantity('');
    setTargetSuggestion('');
    setDescription('');
    setVideoUrl('');
    setHighlights(['', '', '']);
    setSpecs([]);
    setAvailableOptions([...allSpecOptions]);
    setVideoError('');
    clearImagePreviews();
    clearVideoPreviews();
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const hydrateSpecsForEdit = (rawSpecs) => {
    const parsedSpecs = safeParseJson(rawSpecs, {});
    const specEntries = parsedSpecs && typeof parsedSpecs === 'object' && !Array.isArray(parsedSpecs)
      ? Object.entries(parsedSpecs)
      : [];

    const optionByKey = new Map(allSpecOptions.map((option) => [option.key.toLowerCase(), option]));
    const usedOptionIds = new Set();

    const nextSpecs = specEntries
      .map(([key, value]) => {
        const normalizedKey = String(key || '').trim();
        const normalizedValue = String(value ?? '').trim();
        if (!normalizedKey || !normalizedValue) {
          return null;
        }

        const matchedOption = optionByKey.get(normalizedKey.toLowerCase());
        if (matchedOption?.id) {
          usedOptionIds.add(matchedOption.id);
        }

        return {
          id: matchedOption?.id || null,
          key: normalizedKey,
          value: normalizedValue,
          placeholder: matchedOption || FALLBACK_SPEC_PLACEHOLDER,
        };
      })
      .filter(Boolean);

    setSpecs(nextSpecs);
    setAvailableOptions(allSpecOptions.filter((option) => !usedOptionIds.has(option.id)));
  };

  // Track when warning should be shown or hidden
  useEffect(() => {
    if (availableOptions.length === 0) {
      setShowMaxSpecsWarning(true);
    } else {
      setShowMaxSpecsWarning(false);
    }
  }, [availableOptions]);

  useEffect(() => {
    let isCancelled = false;

    if (!isEditMode || !editProductId || !state.isLoggedIn) {
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingEditData(true);
    products.getById(editProductId)
      .then((response) => {
        if (isCancelled) {
          return;
        }

        const listing = response?.data;
        const ownerId = Number(listing?.listedByUserId);
        const currentUserId = Number(state.user?.id);
        const isAdminUser = Boolean(state.user?.isAdmin);
        if (!isAdminUser && (!Number.isFinite(ownerId) || !Number.isFinite(currentUserId) || ownerId !== currentUserId)) {
          throw new Error('You can edit only your own listing.');
        }

        setItemName(listing?.name || '');
        setPrice(listing?.price != null ? String(listing.price) : '');
        setCategory(listing?.category || 'General');
        setBranch(listing?.branch || 'All Branches');
        setSemester(listing?.semester || 'All');
        setInStock(listing?.inStock !== false);
        setStockQuantity(listing?.stockQuantity == null ? '' : String(listing.stockQuantity));
        setDescription(listing?.description || '');
        setVideoUrl(listing?.externalVideoUrl || '');
        setTargetSuggestion('');
        setVideoError('');

        const parsedHighlights = safeParseJson(listing?.highlightsJson, []);
        const normalizedHighlights = Array.isArray(parsedHighlights)
          ? parsedHighlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
          : [];
        while (normalizedHighlights.length < 3) {
          normalizedHighlights.push('');
        }
        setHighlights(normalizedHighlights);

        hydrateSpecsForEdit(listing?.specsJson);
        clearImagePreviews();
        clearVideoPreviews();
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: {
            message: getErrorMessage(error, 'Unable to load listing for editing.'),
            type: 'error',
          },
        });
        onNavigate('SellerDashboard');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingEditData(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isEditMode, editProductId, state.isLoggedIn, state.user?.id, state.user?.isAdmin]);

  const addSpecField = () => {
    if (availableOptions.length === 0) {
      setShowMaxSpecsWarning(true);
      return;
    }

    // Add the first available option
    const optionToAdd = availableOptions[0];
    
    // Remove the selected option from available options
    setAvailableOptions(prev => prev.filter(option => option.id !== optionToAdd.id));
    
    // Add new spec with the selected option
    setSpecs(prev => [
      ...prev, 
      { 
        id: optionToAdd.id,
        key: '',
        value: '',
        placeholder: optionToAdd
      }
    ]);
  };
  
  const removeSpecField = (index) => {
    // Get the spec to remove
    const removedSpec = specs[index];
    
    // Add the option back to available options if it has an id
    if (removedSpec && removedSpec.id) {
      const originalOption = allSpecOptions.find(option => option.id === removedSpec.id);
      if (originalOption) {
        setAvailableOptions(prev => [...prev, originalOption]);
      }
    }
    
    // Remove the spec
    setSpecs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSpecChange = (index, field, value) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = value;
    setSpecs(newSpecs);
  };

  const handleSuggestAcademicTarget = () => {
    const searchText = `${itemName} ${description} ${category}`.toLowerCase();
    const rules = [
      {
        keywords: ['dsa', 'data structure', 'algorithm', 'oop', 'java', 'python', 'dbms', 'operating system', 'computer network'],
        branch: 'Computer Engineering',
        semester: '3',
        reason: 'Looks like a core Computer/IT subject listing, so Sem 3 is a good default.',
      },
      {
        keywords: ['mechanics', 'thermodynamics', 'machine design', 'cad', 'workshop'],
        branch: 'Mechanical Engineering',
        semester: '4',
        reason: 'Matched Mechanical keywords often taught around Sem 3-5.',
      },
      {
        keywords: ['circuit', 'vlsi', 'signal', 'embedded', 'microcontroller', 'electronic'],
        branch: 'Electronics and Telecommunication Engineering',
        semester: '4',
        reason: 'Matched Electronics/ENTC keywords, so Sem 4 is a practical target.',
      },
      {
        keywords: ['survey', 'concrete', 'structure', 'geotech', 'transportation'],
        branch: 'Civil Engineering',
        semester: '4',
        reason: 'Civil-focused keywords detected, mapped to a mid-semester audience.',
      },
      {
        keywords: ['ai', 'machine learning', 'ml', 'deep learning', 'neural network', 'data science'],
        branch: 'Artificial Intelligence and Data Science',
        semester: '6',
        reason: 'AI/ML content usually gets best reach in higher semesters.',
      },
    ];

    const matched = rules.find((rule) => rule.keywords.some((keyword) => searchText.includes(keyword)));

    if (matched) {
      setBranch(matched.branch);
      setSemester(matched.semester);
      setTargetSuggestion(`${matched.branch}, Sem ${matched.semester}. ${matched.reason}`);
      return;
    }

    if (['Textbooks', 'Notes', 'Study Guides', 'Reference Books'].includes(category)) {
      setTargetSuggestion('Tip: Choose an exact branch and semester to improve discovery for academic listings.');
      return;
    }

    setBranch('All Branches');
    setSemester('All');
    setTargetSuggestion('Suggested All Branches / All Semesters for a general campus listing.');
  };

  const handleGenerateDescription = async () => {
    if (!itemName) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: `Please enter an item name first.`, type: 'error' }
      });
      return;
    }

    const highlightsList = highlights
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);

    const specsSummary = specs
      .map((spec) => {
        const key = spec?.key?.trim();
        const value = spec?.value?.trim();
        return key && value ? `${key}: ${value}` : '';
      })
      .filter(Boolean)
      .slice(0, 8)
      .join('; ');

    const prompt = [
      'Generate a marketplace-ready product description for MyCollegeMart.',
      'Return only the final description text (no headings, no markdown, no quotes).',
      'Keep it concise, student-friendly, honest, and under 450 characters.',
      'Output 2 to 3 short lines total.',
      `Include these discoverability keywords naturally: ${branch === 'All Branches' ? 'All Branches' : branch}, ${semester === 'All' ? 'All Semesters' : `Semester ${semester}`}.`,
      `Item name: ${itemName.trim()}`,
      `Category: ${category}`,
      `Branch: ${branch}`,
      `Semester: ${semester}`,
      `Price: ${price ? `INR ${price}` : 'Not provided'}`,
      `Stock: ${inStock ? `In stock${stockQuantity ? ` (${stockQuantity})` : ''}` : 'Out of stock'}`,
      `Highlights: ${highlightsList.length ? highlightsList.join('; ') : 'None provided'}`,
      `Specifications: ${specsSummary || 'None provided'}`,
      `Current draft: ${description.trim() || 'None'}`
    ].join('\n');

    setIsGenerating(true);

    try {
      const response = await aiApi.chat({
        assistantType: 'MARKETMATE',
        message: prompt,
        history: [],
      });

      const generatedText = response?.data?.reply?.trim();

      if (!generatedText) {
        throw new Error('AI returned an empty description. Please try again.');
      }

      const normalizedDescription = normalizeAiDescription(generatedText);
      if (!normalizedDescription) {
        throw new Error('AI returned an invalid description. Please try again.');
      }

      setDescription(normalizedDescription);
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Description generated with AI.', type: 'success' }
      });
    } catch (error) {
      const message = error?.message || 'Unable to generate description right now.';
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message, type: 'error' }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!itemName.trim() || itemName.trim().length < 3) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Item name should be at least 3 characters.', type: 'error' }
      });
      return;
    }

    if (!description.trim() || description.trim().length < 15) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Description should be at least 15 characters.', type: 'error' }
      });
      return;
    }

    if (!price || Number(price) <= 0) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please enter a valid price.', type: 'error' }
      });
      return;
    }

    if (Number(price) > 500000) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Price is too high for a campus listing.', type: 'error' }
      });
      return;
    }

    if (stockQuantity !== '' && Number(stockQuantity) < 0) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Stock quantity cannot be negative.', type: 'error' }
      });
      return;
    }

    if (inStock && stockQuantity !== '' && Number(stockQuantity) === 0) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Set stock above 0 or mark item as out of stock.', type: 'error' }
      });
      return;
    }

    if (
      ['Textbooks', 'Notes', 'Study Guides', 'Reference Books'].includes(category)
      && (branch === 'All Branches' || semester === 'All')
    ) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: 'For academic listings, select a specific branch and semester (or use Suggest Branch & Semester).',
          type: 'error'
        }
      });
      return;
    }

    if (!isEditMode && imagePreviews.length === 0) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please upload at least one image.', type: 'error' }
      });
      return;
    }

    if (imagePreviews.length > MAX_IMAGES) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: `You can upload up to ${MAX_IMAGES} images.`, type: 'error' }
      });
      return;
    }

    if (videoPreviews.length > MAX_VIDEOS) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: `You can upload up to ${MAX_VIDEOS} videos.`, type: 'error' }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const highlightsList = highlights
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);

      const specsMap = specs.reduce((acc, spec) => {
        const key = spec.key?.trim();
        const value = spec.value?.trim();
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const formData = new FormData();
      formData.append('name', itemName.trim());
      formData.append('description', description.trim());
      formData.append('price', String(Number(price)));
      formData.append('category', category);
      formData.append('branch', branch);
      formData.append('semester', semester);
      formData.append('inStock', String(inStock));
      if (!inStock) {
        formData.append('stockQuantity', '0');
      } else if (stockQuantity !== '') {
        formData.append('stockQuantity', String(Number(stockQuantity)));
      }
      formData.append('highlightsJson', JSON.stringify(highlightsList));
      formData.append('specsJson', JSON.stringify(specsMap));

      if (videoUrl.trim()) {
        formData.append('externalVideoUrl', videoUrl.trim());
      }

      imagePreviews.forEach((image) => {
        formData.append('images', image.file);
      });

      videoPreviews.forEach((video) => {
        formData.append('videos', video.file);
      });

      if (isEditMode && editProductId) {
        const response = await products.updateListing(editProductId, formData);
        const updatedProduct = response.data;
        const currentItems = Array.isArray(state.products?.items) ? state.products.items : [];
        dispatch({
          type: actionTypes.FETCH_PRODUCTS_SUCCESS,
          payload: currentItems.map((item) => (item.id === updatedProduct?.id ? { ...item, ...updatedProduct } : item)),
        });

        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: { message: 'Listing updated successfully.', type: 'success' }
        });

        onNavigate('SellerDashboard');
        return;
      }

      const response = await products.createListing(formData);
      const createdProduct = response.data;

      const currentItems = Array.isArray(state.products?.items) ? state.products.items : [];
      dispatch({
        type: actionTypes.FETCH_PRODUCTS_SUCCESS,
        payload: [createdProduct, ...currentItems.filter((item) => item.id !== createdProduct?.id)],
      });

      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Item listed for sale successfully!', type: 'success' }
      });

      resetFormState();

      onNavigate('Marketplace');
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: getErrorMessage(error, isEditMode ? 'Failed to update listing.' : 'Failed to create listing.'),
          type: 'error'
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const INPUT_STYLE = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition";
  const isMerchant = (state.user?.accountType || 'INDIVIDUAL').toUpperCase() === 'MERCHANT';
  const canManageListings = Boolean(state.user?.canManageListings);
  const isAdmin = Boolean(state.user?.isAdmin);
  const hasSellerAccess = canManageListings || isAdmin;
  const verificationStatus = (state.user?.merchantVerificationStatus || (isMerchant ? 'PENDING' : 'NOT_REQUIRED')).toUpperCase();

  if (!state.isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in required</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-3">
            Please sign in with a Merchant or Admin account to manage listings.
          </p>
          <button
            onClick={() => onNavigate('Login')}
            className="mt-6 px-5 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-semibold transition-colors"
          >
            Go to Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!isMerchant && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Seller Access Needed</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-3">
            Listing management is available for campus Merchant or Admin accounts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('Signup')}
              className="px-5 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-semibold transition-colors"
            >
              Create Merchant Account
            </button>
            <button
              onClick={() => onNavigate('Account')}
              className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Go to Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSellerAccess) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/40 rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Merchant Verification Pending</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-3">
            Submit your Merchant profile for admin approval to unlock listing access. Current status: <span className="font-semibold">{verificationStatus}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('Account')}
              className="px-5 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-semibold transition-colors"
            >
              Open Merchant Profile
            </button>
            <button
              onClick={() => onNavigate('SellerDashboard')}
              className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEditMode && isLoadingEditData) {
    return (
      <div className="py-12 text-center text-slate-600 dark:text-slate-300">Loading listing details...</div>
    );
  }

  return (
    <div className="min-h-[60vh] py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto p-4 sm:p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg"
      >
        <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white">
          {isEditMode ? 'Edit Your Listing' : 'Create Your Listing'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <fieldset className="space-y-4 p-4 border rounded-lg">
            <legend className="text-lg font-semibold px-2">Basic Info</legend>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Name*</label>
              <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`}/>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Price (₹)*</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min="1"
                  step="0.01"
                  required
                  className={`mt-1 ${INPUT_STYLE}`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category*</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  required 
                  className={`mt-1 ${INPUT_STYLE}`}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Added Branch and Semester dropdowns */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch*</label>
                <select 
                  value={branch} 
                  onChange={e => setBranch(e.target.value)} 
                  required 
                  className={`mt-1 ${INPUT_STYLE}`}
                >
                  {branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Semester*</label>
                <select 
                  value={semester} 
                  onChange={e => setSemester(e.target.value)} 
                  required 
                  className={`mt-1 ${INPUT_STYLE}`}
                >
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-900/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Listing for a specific subject? Suggest branch and semester automatically.
                </p>
                <button
                  type="button"
                  onClick={handleSuggestAcademicTarget}
                  className="rounded-md border border-cyan-500/40 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-900/20 dark:text-cyan-200 dark:hover:bg-cyan-900/30"
                >
                  Suggest Branch & Semester
                </button>
              </div>
              {targetSuggestion && (
                <p className="mt-2 text-xs text-cyan-700 dark:text-cyan-300">{targetSuggestion}</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Availability*</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setInStock(true);
                    if (stockQuantity === '0') {
                      setStockQuantity('');
                    }
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${inStock
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                >
                  In Stock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInStock(false);
                    setStockQuantity('0');
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${!inStock
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                >
                  Out of Stock
                </button>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Quantity (optional)</label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  disabled={!inStock}
                  placeholder={inStock ? 'e.g., 5' : '0'}
                  className={`mt-1 ${INPUT_STYLE} ${!inStock ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
          </fieldset>

          {/* Description */}
          <fieldset className="p-4 border rounded-lg">
            <legend className="text-lg font-semibold px-2">Description</legend>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Description*</label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={isGenerating}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 flex items-center"
                title="Automatically generate a description based on item details"
              >
                {isGenerating ? 'Generating...' : <> <SparklesIcon className="w-5 h-5 mr-1"/> Generate with AI </>}
              </button>
            </div>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows="3" 
              required 
              className={`w-full ${INPUT_STYLE}`}
              placeholder={`Describe your item, including condition, usage history, and any special features.${branch !== 'All Branches' ? ` Ideal for ${branch} students.` : ''}`}
            ></textarea>
          </fieldset>

          {/* Image & Video Upload */}
          <fieldset className="space-y-4 p-4 border rounded-lg">
            <legend className="text-lg font-semibold px-2">Media</legend>
            {isEditMode && (
              <p className="text-xs text-cyan-700 dark:text-cyan-300">
                Uploading media in edit mode will replace the current listing media after saving.
              </p>
            )}
            
            {/* Images section */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isEditMode ? `Images (Optional, max ${MAX_IMAGES})` : `Images* (max ${MAX_IMAGES})`}
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">{imagePreviews.length}/{MAX_IMAGES} images</span>
              </div>
              <div className="mt-2 flex items-center flex-wrap gap-4">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <img src={src.url} alt="Preview" className="w-full h-full object-cover rounded-lg"/>
                    <button 
                      type="button" 
                      onClick={() => removeImage(index)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      title="Remove image"
                    >
                      <CloseIcon className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
                {imagePreviews.length < MAX_IMAGES && (
                  <label htmlFor="file-upload" title="Upload images" className="cursor-pointer w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500">
                    <UploadIcon />
                    <span className="text-xs">Add Image</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} multiple />
                  </label>
                )}
              </div>
            </div>
            
            {/* New Video Upload section */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Videos (Optional, max {MAX_VIDEOS})</label>
                <span className="text-xs text-slate-500 dark:text-slate-400">{videoPreviews.length}/{MAX_VIDEOS} videos</span>
              </div>
              
              {videoError && (
                <p className="text-sm text-red-500 mt-1">{videoError}</p>
              )}
              
              <div className="mt-2 flex items-center flex-wrap gap-4">
                {videoPreviews.map((video, index) => (
                  <div key={index} className="relative w-32 h-24 bg-black rounded-lg overflow-hidden">
                    <video 
                      src={video.url} 
                      className="w-full h-full object-cover" 
                      controls
                    ></video>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 text-[10px] text-white truncate">
                      {video.name}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeVideo(index)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      title="Remove video"
                    >
                      <CloseIcon className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
                
                {videoPreviews.length < MAX_VIDEOS && (
                  <label htmlFor="video-upload" title="Upload videos" className="cursor-pointer w-32 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500">
                    <UploadIcon />
                    <span className="text-xs">Add Video</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Max 1 min each</span>
                    <input 
                      id="video-upload" 
                      name="video-upload" 
                      type="file" 
                      className="sr-only" 
                      accept="video/*" 
                      onChange={handleVideoChange} 
                      multiple 
                      ref={videoInputRef}
                    />
                  </label>
                )}
              </div>
            </div>
            
            {/* Video URL section */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Video URL (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g., https://youtube.com/watch?v=..." 
                value={videoUrl} 
                onChange={e => setVideoUrl(e.target.value)} 
                className={`mt-1 ${INPUT_STYLE}`}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You can provide a YouTube or other video URL in addition to or instead of uploading videos</p>
            </div>
          </fieldset>
          
          {/* Details */}
          <fieldset className="space-y-4 p-4 border rounded-lg">
            <legend className="text-lg font-semibold px-2">Additional Details</legend>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Key Highlights (Optional)</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Add up to 3 key features.</p>
              {highlights.map((h, i) => (
                <input key={i} type="text" value={h} onChange={e => handleHighlightChange(i, e.target.value)} placeholder={`Highlight ${i+1}`} className={`mt-1 ${INPUT_STYLE} mb-2`}/>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specifications (Optional)</label>
              <div className="space-y-2 max-w-2xl">
                {specs.map((spec, i) => (
                  <div key={i} className="mt-1 flex flex-col gap-2 bg-slate-100 dark:bg-slate-700/40 rounded px-2 py-1 sm:flex-row sm:items-center">
                    <input 
                      type="text" 
                      value={spec.key} 
                      onChange={e => handleSpecChange(i, 'key', e.target.value)} 
                      placeholder={spec.placeholder.key} 
                      className={`w-full sm:w-1/3 ${INPUT_STYLE}`}
                    />
                    <input 
                      type="text" 
                      value={spec.value} 
                      onChange={e => handleSpecChange(i, 'value', e.target.value)} 
                      placeholder={spec.placeholder.value} 
                      className={`w-full sm:w-2/3 ${INPUT_STYLE}`}
                    />
                    <button 
                      type="button" 
                      onClick={() => removeSpecField(i)} 
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      title="Remove specification"
                    >
                      <TrashIcon/>
                    </button>
                  </div>
                ))}
              </div>

              {showMaxSpecsWarning ? (
                <div className="mt-2 text-amber-600 dark:text-amber-400 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Maximum number of specification types reached
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={addSpecField} 
                  className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                  title="Add a new specification field"
                >
                  <span className="mr-1">+</span> Add another spec
                </button>
              )}
            </div>
          </fieldset>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold rounded-lg transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (isEditMode ? 'Saving Changes...' : 'Listing Item...')
              : (isEditMode ? 'Save Listing Changes' : 'List My Item')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Sell;
