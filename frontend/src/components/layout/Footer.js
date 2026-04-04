import React from 'react';

const FOOTER_LINK_GROUPS = [
  {
    title: 'Solutions',
    links: [
      { label: 'Textbooks', page: 'Marketplace', params: { category: 'Textbooks' } },
      { label: 'Notes', page: 'Marketplace', params: { category: 'Notes' } },
      { label: 'Lab Equipment', page: 'Marketplace', params: { category: 'Lab Equipment' } },
      { label: 'Technical Devices', page: 'Marketplace', params: { category: 'Technical Devices' } },
      { label: 'Stationery', page: 'Marketplace', params: { category: 'Stationery' } },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Pricing', page: 'Pricing' },
      { label: 'FAQ', page: 'FAQ' },
      { label: 'Contact Us', page: 'Contact' },
      { label: 'Track Order', page: 'OrderTracking' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', page: 'About' },
      { label: 'Careers', page: 'Careers' },
      { label: 'Study Corner', page: 'StudyCorner' },
    ],
  },
  {
    title: 'For Sellers',
    links: [
      { label: 'Sell Item', page: 'Sell' },
      { label: 'Dashboard', page: 'SellerDashboard' },
      { label: 'Book Exchange', page: 'BookExchange' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', page: 'Privacy' },
      { label: 'Terms', page: 'Terms' },
    ],
  },
];

const FOOTER_VARIANTS = {
  premium: {
    shell: 'border-t border-cyan-300/20 bg-gradient-to-r from-[#061633] via-[#0a1f46] to-[#051634] text-slate-100',
    panel: 'rounded-3xl border border-cyan-300/20 bg-white/[0.03] p-6 shadow-[0_24px_70px_-35px_rgba(6,182,212,0.6)] backdrop-blur-sm sm:p-8',
    brandTag: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200',
    title: 'text-2xl font-extrabold text-white sm:text-3xl',
    subtitle: 'mt-2 max-w-md text-sm leading-relaxed text-slate-200/80',
    chip: 'rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-100',
    heading: 'text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-200/80',
    link: 'text-sm text-slate-100/90 transition hover:text-cyan-200',
    divider: 'mt-7 border-t border-cyan-300/20 pt-4',
    metaText: 'text-xs text-slate-300/85',
    ghostButton: 'rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20',
    primaryButton: 'rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700',
  },
  minimal: {
    shell: 'border-t border-slate-200/80 bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
    panel: 'rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_20px_56px_-36px_rgba(15,23,42,0.45)] sm:p-8 dark:border-slate-700 dark:bg-slate-800',
    brandTag: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-slate-400',
    title: 'text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white',
    subtitle: 'mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300',
    chip: 'rounded-full border border-cyan-200 bg-cyan-50/70 px-3 py-1 text-[11px] font-semibold text-cyan-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200',
    heading: 'text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400',
    link: 'text-sm text-slate-700 transition hover:text-cyan-700 dark:text-slate-200 dark:hover:text-white',
    divider: 'mt-7 border-t border-slate-200/90 pt-4 dark:border-slate-700',
    metaText: 'text-xs text-slate-500 dark:text-slate-400',
    ghostButton: 'rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    primaryButton: 'rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  },
};

const Footer = ({ onNavigate, variant = 'premium' }) => {
  const styles = FOOTER_VARIANTS[variant] || FOOTER_VARIANTS.premium;
  const year = new Date().getFullYear();

  return (
    <footer className={`w-full py-10 sm:py-12 ${styles.shell}`}>
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className={styles.panel}>
          <div className="grid gap-8 lg:grid-cols-[1.15fr_2fr]">
            <div>
              <p className={styles.brandTag}>MyCollegeMart</p>
              <h2 className={styles.title}>Campus Marketplace Built for Fast Student Discovery</h2>
              <p className={styles.subtitle}>
                Buy, sell, and exchange essentials with trusted college peers through one marketplace experience designed for speed and clarity.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={styles.chip}>Student-first listings</span>
                <span className={styles.chip}>Secure checkout</span>
                <span className={styles.chip}>Merchant tools</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate?.('Marketplace')}
                  className={styles.primaryButton}
                >
                  Explore Marketplace
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('Sell')}
                  className={styles.ghostButton}
                >
                  Start Selling
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {FOOTER_LINK_GROUPS.map((group) => (
                <div key={group.title}>
                  <h4 className={`mb-3 ${styles.heading}`}>{group.title}</h4>
                  <ul className="space-y-2">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <button
                          type="button"
                          onClick={() => onNavigate?.(link.page, link.params || {})}
                          className={`${styles.link} text-left`}
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.divider} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
            <p className={styles.metaText}>Copyright {year} MyCollegeMart. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <button type="button" onClick={() => onNavigate?.('Privacy')} className={styles.metaText}>Privacy</button>
              <button type="button" onClick={() => onNavigate?.('Terms')} className={styles.metaText}>Terms</button>
              <button type="button" onClick={() => onNavigate?.('Contact')} className={styles.metaText}>Contact</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
