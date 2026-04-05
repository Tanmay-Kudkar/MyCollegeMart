import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AcademicCapIcon } from '../components/UI/Icons';
import { ENGINEERING_BRANCHES } from '../utils/constants';
import { skills } from '../utils/api';
import { useGlobalState, actionTypes } from '../context/GlobalStateContext';

const SKILL_SERVICES = [
  {
    id: 'svc-1',
    title: 'Digital Electronics Assignment Review',
    type: 'Assignment',
    description: 'Detailed review with corrections and explanation notes for submission.',
    price: 99,
    branch: 'Electronics and Telecommunication Engineering',
    semester: 4,
  },
  {
    id: 'svc-2',
    title: 'Data Structures Practical Guidance',
    type: 'Practical',
    description: 'Step-by-step coding support with viva preparation pointers.',
    price: 149,
    branch: 'Computer Engineering',
    semester: 3,
  },
  {
    id: 'svc-3',
    title: 'Engineering Maths Tutoring Session',
    type: 'Tutoring',
    description: 'One-on-one session focused on difficult modules and problem solving.',
    price: 199,
    branch: 'All Branches',
    semester: 2,
  },
  {
    id: 'svc-4',
    title: 'Mini Project Architecture Consultation',
    type: 'Project',
    description: 'Project planning support including tech stack and milestone roadmap.',
    price: 299,
    branch: 'Information Technology',
    semester: 6,
  },
  {
    id: 'svc-5',
    title: 'Mechanics Lab Journal Completion Help',
    type: 'Practical',
    description: 'Format correction and experiment write-up guidance for timely submission.',
    price: 129,
    branch: 'Mechanical Engineering',
    semester: 3,
  },
  {
    id: 'svc-6',
    title: 'AI/ML Assignment Debug Session',
    type: 'Assignment',
    description: 'Hands-on debugging and model result interpretation support.',
    price: 249,
    branch: 'Artificial Intelligence and Data Science',
    semester: 7,
  },
];

const FILTER_SELECT_STYLE = 'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';
const CREATE_INPUT_STYLE = 'mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';
const SKILL_TYPES = ['Assignment', 'Practical', 'Tutoring', 'Project'];
const SKILL_SEMESTERS = ['All', 1, 2, 3, 4, 5, 6, 7, 8];
const SKILL_MARKETPLACE_FETCH_TIMEOUT_MS = 4000;
const SKILL_MARKETPLACE_RETRY_MS = 1000;

const TYPE_STYLES = {
  Assignment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Practical: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  Tutoring: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Project: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

const SKILL_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
];

const getServiceImage = (service, index) => {
  if (service?.imageUrl) {
    return service.imageUrl;
  }

  const fallbackIndex = Number.isFinite(index) ? index % SKILL_FALLBACK_IMAGES.length : 0;
  return SKILL_FALLBACK_IMAGES[fallbackIndex];
};

const buildInitialCreateForm = () => ({
  title: '',
  type: 'Assignment',
  description: '',
  price: '',
  branch: 'All Branches',
  semester: 'All',
  images: [],
  videos: [],
});

const ServiceCard = ({ service, onSelect, index }) => (
  <motion.div
    className="group h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
  >
    <div className="relative">
      <img
        src={getServiceImage(service, index)}
        alt={service.title}
        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <span className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[11px] font-semibold ${TYPE_STYLES[service.type] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
        {service.type}
      </span>
    </div>

    <div className="flex h-[260px] flex-col p-5">
      <h3 className="line-clamp-2 text-xl font-bold text-slate-900 dark:text-white">{service.title}</h3>
      <p className="mt-2 min-h-[72px] line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{service.description}</p>

      <div className="mt-auto flex items-start justify-between gap-2">
        <span className="text-xl font-extrabold text-cyan-700 dark:text-cyan-400">₹{service.price}</span>
        <div className="flex max-w-[65%] items-start gap-1.5 text-right text-xs text-slate-500 dark:text-slate-400">
          <AcademicCapIcon className="w-4 h-4" />
          <span className="line-clamp-2">{service.branch} - Sem {service.semester}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(service)}
        className="mt-4 w-full rounded-lg border border-cyan-600/40 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-900/20 dark:text-cyan-300 dark:hover:bg-cyan-900/30"
      >
        Request Help
      </button>
    </div>
  </motion.div>
);

const Filters = ({ onFilterChange, currentFilters }) => {
  const serviceTypes = ['All', 'Assignment', 'Practical', 'Tutoring', 'Project'];
  const semesters = ['All', 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <aside className="w-full rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 xl:sticky xl:top-24 xl:h-fit">
      <h3 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Filters</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Find the right expert for your branch and semester.</p>

      <div className="mt-5 space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Service Type</h4>
        <select onChange={(e) => onFilterChange('type', e.target.value)} value={currentFilters.type} className={FILTER_SELECT_STYLE}>
          {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Branch</h4>
        <select onChange={(e) => onFilterChange('branch', e.target.value)} value={currentFilters.branch} className={FILTER_SELECT_STYLE}>
          {ENGINEERING_BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
        </select>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Semester</h4>
        <select onChange={(e) => onFilterChange('semester', e.target.value)} value={currentFilters.semester} className={FILTER_SELECT_STYLE}>
          {semesters.map(s => <option key={s} value={s}>{s === 'All' ? 'All Semesters' : `Semester ${s}`}</option>)}
        </select>
      </div>
      </div>
    </aside>
  );
};

const SkillMarketplace = ({ onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [createForm, setCreateForm] = useState(buildInitialCreateForm());
  const [filters, setFilters] = useState({
    type: 'All',
    branch: 'All Branches',
    semester: 'All',
  });

  const isMaster = Boolean(state.user?.isMaster);

  useEffect(() => {
    let isCancelled = false;

    setStatus('loading');
    skills.getAll({ timeout: SKILL_MARKETPLACE_FETCH_TIMEOUT_MS })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        const items = Array.isArray(response.data) ? response.data : [];
        if (items.length > 0) {
          setServices(items);
        } else {
          setServices(SKILL_SERVICES);
        }
        setErrorMessage('');
        setStatus('succeeded');
      })
      .catch(() => {
        if (!isCancelled) {
          setErrorMessage('Reconnecting to the server. Services will appear automatically in a moment.');
          setStatus('failed');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'failed' || typeof window === 'undefined') {
      return;
    }

    let isCancelled = false;

    const attemptReloadServices = () => {
      skills.getAll({ timeout: SKILL_MARKETPLACE_FETCH_TIMEOUT_MS })
        .then((response) => {
          if (isCancelled) {
            return;
          }

          const items = Array.isArray(response.data) ? response.data : [];
          if (items.length > 0) {
            setServices(items);
          } else {
            setServices(SKILL_SERVICES);
          }
          setErrorMessage('');
          setStatus('succeeded');
        })
        .catch(() => {
          // Keep retrying until backend is reachable.
        });
    };

    attemptReloadServices();
    const retryInterval = window.setInterval(attemptReloadServices, SKILL_MARKETPLACE_RETRY_MS);
    window.addEventListener('online', attemptReloadServices);

    return () => {
      isCancelled = true;
      window.clearInterval(retryInterval);
      window.removeEventListener('online', attemptReloadServices);
    };
  }, [status]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateFieldChange = (field, value) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetCreateForm = () => {
    setCreateForm(buildInitialCreateForm());
  };

  const handleCreateService = async (event) => {
    event.preventDefault();

    if (!state.isLoggedIn) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please sign in with Master portal first.', type: 'error' },
      });
      onNavigate?.('Login', { accountType: 'MASTER' });
      return;
    }

    if (!isMaster) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Only Master login can add new services.', type: 'error' },
      });
      return;
    }

    if (!createForm.title.trim() || createForm.title.trim().length < 3) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Service title must be at least 3 characters.', type: 'error' },
      });
      return;
    }

    if (!createForm.description.trim() || createForm.description.trim().length < 15) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Description should be at least 15 characters.', type: 'error' },
      });
      return;
    }

    const parsedPrice = Number(createForm.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please enter a valid service price.', type: 'error' },
      });
      return;
    }

    setIsCreatingService(true);
    try {
      const formData = new FormData();
      formData.append('title', createForm.title.trim());
      formData.append('type', createForm.type);
      formData.append('description', createForm.description.trim());
      formData.append('price', String(parsedPrice));
      formData.append('branch', createForm.branch);
      formData.append('semester', String(createForm.semester));

      createForm.images.forEach((file) => {
        formData.append('images', file);
      });

      createForm.videos.forEach((file) => {
        formData.append('videos', file);
      });

      const response = await skills.create(formData);
      const created = response?.data;
      if (created) {
        setServices((prev) => [created, ...prev]);
      }

      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'New skill service added successfully.', type: 'success' },
      });

      resetCreateForm();
      setShowCreatePanel(false);
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: error?.message || 'Failed to add service. Please try again.',
          type: 'error',
        },
      });
    } finally {
      setIsCreatingService(false);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const typeMatch = filters.type === 'All' || service.type === filters.type;
      const branchMatch = filters.branch === 'All Branches' || service.branch === filters.branch;
      const semesterMatch = filters.semester === 'All' || service.semester.toString() === filters.semester.toString();
      return typeMatch && branchMatch && semesterMatch;
    });
  }, [services, filters]);

  const activeBranchCount = useMemo(
    () => new Set(filteredServices.map((service) => service.branch)).size,
    [filteredServices]
  );

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-800/20" />
        <div className="absolute right-0 top-48 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-800/20" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
        <Filters onFilterChange={handleFilterChange} currentFilters={filters} />

        <main className="space-y-5">
          <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">Skill Utility Bar</p>
            <h1 className="mcm-display mt-1 text-3xl font-bold text-slate-900 dark:text-white">Skills & Services Marketplace</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose trusted student experts for assignments, practicals, tutoring and project reviews.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {filteredServices.length} services visible
              </span>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                {activeBranchCount} branches covered
              </span>
              {isMaster && (
                <button
                  type="button"
                  onClick={() => setShowCreatePanel((prev) => !prev)}
                  className="rounded-full border border-cyan-600/40 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-900/20 dark:text-cyan-300 dark:hover:bg-cyan-900/30"
                >
                  {showCreatePanel ? 'Close Add Service' : 'Add New Service'}
                </button>
              )}
            </div>
          </section>

        {isMaster && showCreatePanel && (
          <section className="rounded-[24px] border border-cyan-200 bg-cyan-50/50 p-5 shadow-sm dark:border-cyan-800/40 dark:bg-cyan-900/10 sm:p-6">
            <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Master Service Creator</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Publish a new service card that students can immediately request.</p>

            <form className="mt-4 space-y-4" onSubmit={handleCreateService}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Service Title</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => handleCreateFieldChange('title', e.target.value)}
                    className={CREATE_INPUT_STYLE}
                    placeholder="AI/ML Assignment Debug Session"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Service Type</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => handleCreateFieldChange('type', e.target.value)}
                    className={CREATE_INPUT_STYLE}
                  >
                    {SKILL_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => handleCreateFieldChange('description', e.target.value)}
                  className={CREATE_INPUT_STYLE}
                  placeholder="Explain what support this service provides."
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Price (INR)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={createForm.price}
                    onChange={(e) => handleCreateFieldChange('price', e.target.value)}
                    className={CREATE_INPUT_STYLE}
                    placeholder="199"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branch</label>
                  <select
                    value={createForm.branch}
                    onChange={(e) => handleCreateFieldChange('branch', e.target.value)}
                    className={CREATE_INPUT_STYLE}
                  >
                    {ENGINEERING_BRANCHES.map((branch) => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Semester</label>
                  <select
                    value={createForm.semester}
                    onChange={(e) => handleCreateFieldChange('semester', e.target.value)}
                    className={CREATE_INPUT_STYLE}
                  >
                    {SKILL_SEMESTERS.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester === 'All' ? 'All Semesters' : `Semester ${semester}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Images (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleCreateFieldChange('images', Array.from(e.target.files || []))}
                    className={`${CREATE_INPUT_STYLE} file:mr-3 file:rounded-md file:border-0 file:bg-cyan-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-cyan-700 dark:file:bg-cyan-900/30 dark:file:text-cyan-300`}
                  />
                  {createForm.images.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{createForm.images.length} image(s) selected</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Videos (optional)</label>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleCreateFieldChange('videos', Array.from(e.target.files || []))}
                    className={`${CREATE_INPUT_STYLE} file:mr-3 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300`}
                  />
                  {createForm.videos.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{createForm.videos.length} video(s) selected</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isCreatingService}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
                >
                  {isCreatingService ? 'Publishing...' : 'Publish Service'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetCreateForm();
                    setShowCreatePanel(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {errorMessage && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
            {errorMessage}
          </p>
        )}

        {status === 'loading' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Loading services...
          </section>
        )}

        {status === 'succeeded' && (
          filteredServices.length > 0 ? (
            <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
              <h2 className="mcm-display mb-4 text-2xl font-bold text-slate-900 dark:text-white">Available Services</h2>
              <div className="grid auto-rows-fr grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} onSelect={() => onNavigate?.('AssignmentHelp', { service })} />
              ))}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">No Services Found</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Try adjusting your filters or check back later.</p>
            </section>
          )
        )}
        {status === 'failed' && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            Reconnecting to the server. Services will appear automatically in a moment.
          </section>
        )}
        </main>
      </div>
    </div>
  );
};

export default SkillMarketplace;
