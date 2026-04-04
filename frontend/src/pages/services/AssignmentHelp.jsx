import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { UploadIcon, TrashIcon, PdfIcon, FileTextIcon, CloseIcon } from '../../components/UI/Icons';
import { assignmentHelp } from '../../utils/api';

const engineeringBranches = [
  'All Branches',
  'Computer Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication Engineering',
  'Information Technology',
  'Instrumentation Engineering',
  'Mechanical Engineering',
  'Artificial Intelligence and Data Science',
  'Computer Science and Engineering (Data Science)',
  'Electronics and Telecommunication Engineering (VLSI)'
];

const TRUST_BADGES = [
  'Encrypted file uploads to secure storage',
  'Dedicated support for assignment requests',
  'Transparent pricing with deadline options',
];

const PreviewModal = ({ file, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
      <div className="border-b p-4 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{file.file.name}</h3>
      </div>
      <div className="p-4">
        {file.file.type.startsWith('image/') ? (
          <img src={file.previewUrl} alt={file.file.name} className="max-w-full max-h-[70vh] object-contain mx-auto" />
        ) : file.file.type === 'application/pdf' ? (
          <iframe 
            src={file.previewUrl} 
            className="w-full h-[70vh] border-0"
            title={file.file.name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <FileTextIcon className="w-16 h-16 mb-4" />
            <p>Preview not available for this file type</p>
            <p className="text-sm mt-2">File type: {file.file.type || 'Unknown'}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const AssignmentHelp = ({ selectedService, onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const [serviceType, setServiceType] = useState('Assignment');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState(engineeringBranches[0]);
  const [semester, setSemester] = useState('1');
  const [files, setFiles] = useState([]);
  const [deadline, setDeadline] = useState('Standard');
  const [previewFile, setPreviewFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deadlineOptions = {
    Standard: { label: 'Standard (7 days)', price: 149, eta: 'Balanced turnaround' },
    Express: { label: 'Express (3 days)', price: 249, eta: 'Priority queue delivery' },
    Urgent: { label: 'Urgent (24 hours)', price: 399, eta: 'Fast-track support' }
  };

  const primeDeadlineOptions = {
    Standard: { label: 'Standard (7 days)', price: 99 },
    Express: { label: 'Express (3 days)', price: 149 },
    Urgent: { label: 'Urgent (24 hours)', price: 249 }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(files[index].previewUrl);
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.previewUrl));
    };
  }, [files]);

  useEffect(() => {
    if (!selectedService || typeof selectedService !== 'object') {
      return;
    }

    const normalizedType = selectedService.type === 'Practical' ? 'Practical Report' : 'Assignment';
    setServiceType(normalizedType);
    setSubject(selectedService.title || '');
    setTopic(selectedService.title || '');
    setDescription(selectedService.description || '');
    setBranch(selectedService.branch || engineeringBranches[0]);
    setSemester(String(selectedService.semester || '1'));
  }, [selectedService]);

  const resetForm = () => {
    files.forEach(file => URL.revokeObjectURL(file.previewUrl));
    setServiceType('Assignment');
    setSubject('');
    setTopic('');
    setDescription('');
    setBranch(engineeringBranches[0]);
    setSemester('1');
    setFiles([]);
    setDeadline('Standard');
    setPreviewFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!state.isLoggedIn) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please sign in to continue with payment.', type: 'error' }
      });
      onNavigate?.('Login');
      return;
    }

    if (files.length === 0) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please upload at least one file.', type: 'error' }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      if (selectedService?.id) {
        formData.append('skillServiceId', String(selectedService.id));
      }

      formData.append('serviceType', serviceType);
      formData.append('subject', subject);
      formData.append('topic', topic);
      formData.append('description', description);
      formData.append('branch', branch);
      formData.append('semester', semester);
      formData.append('deadline', deadline);
      formData.append('totalAmount', String(payableAmount));

      files.forEach((item) => {
        formData.append('files', item.file);
      });

      const checkoutResponse = await assignmentHelp.createCheckoutOrder(formData);
      const checkoutData = checkoutResponse?.data;

      if (checkoutData?.requiresPayment && checkoutData?.requestId) {
        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: { message: 'Request saved. Complete payment to confirm submission.', type: 'success' }
        });
        onNavigate?.('AssignmentCheckout', {
          ...checkoutData,
          filesAttached: files.length,
        });
        return;
      }

      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Your request has been submitted successfully.', type: 'success' }
      });

      resetForm();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to prepare payment. Please try again.';
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message, type: 'error' }
      });

      if (error?.response?.status === 401) {
        onNavigate?.('Login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const INPUT_STYLE = 'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';

  const selectedDeadline = deadlineOptions[deadline];
  const selectedPrimeDeadline = primeDeadlineOptions[deadline];
  const payableAmount = state.user?.isPrimeMember ? selectedPrimeDeadline.price : selectedDeadline.price;

  return (
    <div className="relative min-h-screen py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-800/20" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-800/20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6"
      >
        <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">Assignment Utility Bar</p>
          <h1 className="mcm-display mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">Assignment & Practical Help</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Get expert guidance from experienced tutors and submit all supporting files in one secure flow.</p>
          {selectedService?.title && (
            <div className="mt-4 inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
              Prefilled from service: {selectedService.title}
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <fieldset className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
              <legend className="px-2 text-lg font-semibold">1. Select Service Type</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {['Assignment', 'Practical Report'].map(type => (
                  <label
                    key={type}
                    className={`cursor-pointer rounded-xl border p-4 text-center transition ${serviceType === type
                      ? 'border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-900/20'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'}`}
                  >
                    <input
                      type="radio"
                      name="serviceType"
                      value={type}
                      checked={serviceType === type}
                      onChange={e => setServiceType(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-semibold text-slate-900 dark:text-white">{type}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
              <legend className="px-2 text-lg font-semibold">2. Provide Details</legend>
              <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject/Course Name*</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignment/Practical Topic*</label>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`} />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description*</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows="4"
                  className={`mt-1 ${INPUT_STYLE}`}
                  placeholder="Describe your requirements, specific questions, and any guidelines."
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch*</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`}>
                    {engineeringBranches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Semester*</label>
                  <select value={semester} onChange={e => setSemester(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`}>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
              <legend className="px-2 text-lg font-semibold">3. Upload Files*</legend>
              <label htmlFor="file-upload" className="mt-2 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-slate-500 transition hover:border-cyan-500 hover:text-cyan-600 dark:border-slate-600 dark:hover:border-cyan-400 dark:hover:text-cyan-300">
                <UploadIcon />
                <span className="mt-2 text-sm">Click to upload question papers, notes, references, images or PDFs</span>
                <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} multiple />
              </label>

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700"
                      onClick={() => setPreviewFile(file)}
                    >
                      {file.file.type.startsWith('image/') ? (
                        <img src={file.previewUrl} alt={file.file.name} className="h-24 w-full object-cover" />
                      ) : (
                        <div className="flex h-24 w-full flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                          {file.file.type === 'application/pdf' ? <PdfIcon /> : <FileTextIcon />}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-xs text-white">
                        {file.file.name}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        title="Remove file"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
              <legend className="px-2 text-lg font-semibold">4. Select Deadline</legend>
              <div className="mt-2 space-y-2">
                {Object.entries(deadlineOptions).map(([key, { label, price, eta }]) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${deadline === key
                      ? 'border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-900/20'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'}`}
                  >
                    <input type="radio" name="deadline" value={key} checked={deadline === key} onChange={e => setDeadline(e.target.value)} className="sr-only" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{eta}</span>
                      <span className="mt-1 text-xs text-amber-600 dark:text-amber-400">Prime price: ₹{primeDeadlineOptions[key].price}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">₹{price}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Prime members get discounted rates on all service deadlines.</p>
            </fieldset>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
              <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Request Summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Service Type</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{serviceType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Deadline</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedDeadline.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Files Attached</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{files.length}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Standard Price</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{selectedDeadline.price}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Prime Price</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">₹{selectedPrimeDeadline.price}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 w-full rounded-lg bg-cyan-700 py-3 font-bold text-white shadow-md transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Preparing Payment...' : `Proceed to Payment (Total: ₹${payableAmount})`}
              </button>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Trust Indicators</h3>
              <ul className="mt-3 space-y-2">
                {TRUST_BADGES.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </form>
      </motion.div>

      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal 
          file={previewFile} 
          onClose={() => setPreviewFile(null)} 
        />
      )}
    </div>
  );
};

export default AssignmentHelp;
