import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AcademicCapIcon } from '../components/UI/Icons';
import { ENGINEERING_BRANCHES } from '../utils/constants';
import { skills } from '../utils/api';

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

const TYPE_STYLES = {
  Assignment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Practical: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  Tutoring: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Project: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

const ServiceCard = ({ service, onSelect }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    onClick={() => onSelect(service)}
  >
    <div className="relative">
      {service.imageUrl ? (
        <img
          src={service.imageUrl}
          alt={service.title}
          className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-cyan-600 via-indigo-700 to-slate-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <span className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[11px] font-semibold ${TYPE_STYLES[service.type] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
        {service.type}
      </span>
    </div>

    <div className="p-5">
      <h3 className="line-clamp-2 text-xl font-bold text-slate-900 dark:text-white">{service.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{service.description}</p>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xl font-extrabold text-cyan-700 dark:text-cyan-400">₹{service.price}</span>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <AcademicCapIcon className="w-4 h-4" />
          <span>{service.branch} - Sem {service.semester}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(service);
        }}
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
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState({
    type: 'All',
    branch: 'All Branches',
    semester: 'All',
  });

  useEffect(() => {
    setStatus('loading');
    skills.getAll()
      .then((response) => {
        const items = Array.isArray(response.data) ? response.data : [];
        if (items.length > 0) {
          setServices(items);
        } else {
          setServices(SKILL_SERVICES);
        }
        setStatus('succeeded');
      })
      .catch(() => {
        setServices(SKILL_SERVICES);
        setErrorMessage('Showing fallback services because backend data could not be loaded.');
        setStatus('succeeded');
      });
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
            </div>
          </section>

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
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map(service => (
                <ServiceCard key={service.id} service={service} onSelect={() => onNavigate?.('AssignmentHelp', { service })} />
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
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm dark:border-rose-800/40 dark:bg-rose-900/10 dark:text-rose-300">
            Unable to load services right now.
          </section>
        )}
        </main>
      </div>
    </div>
  );
};

export default SkillMarketplace;
