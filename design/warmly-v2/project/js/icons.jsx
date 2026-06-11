// Minimal lucide-style icon set. 1.5px stroke. All take size + className.
const _icon = (paths, opts = {}) => ({ size = 18, className = '', strokeWidth = 1.5, fill = 'none', ...rest } = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={opts.fill || fill}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    {paths}
  </svg>
);

const Icon = {
  Home: _icon(<>
    <path d="M3 9.5 12 3l9 6.5" />
    <path d="M5 9v11h14V9" />
    <path d="M10 20v-6h4v6" />
  </>),
  Compass: _icon(<>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-3 6-6 3 3-6 6-3z" />
  </>),
  Users: _icon(<>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>),
  Settings: _icon(<>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.36.16.7.43.95.78" />
  </>),
  Upload: _icon(<>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8 12 3 7 8" />
    <path d="M12 3v12" />
  </>),
  FileText: _icon(<>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </>),
  Heart: _icon(<>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </>),
  HeartFill: _icon(<>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </>, { fill: 'currentColor' }),
  Edit: _icon(<>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>),
  Coffee: _icon(<>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
    <path d="M6 2v3" />
    <path d="M10 2v3" />
    <path d="M14 2v3" />
  </>),
  X: _icon(<>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>),
  ChevronRight: _icon(<>
    <path d="m9 18 6-6-6-6" />
  </>),
  ChevronLeft: _icon(<>
    <path d="m15 18-6-6 6-6" />
  </>),
  ChevronDown: _icon(<>
    <path d="m6 9 6 6 6-6" />
  </>),
  ArrowRight: _icon(<>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>),
  ArrowLeft: _icon(<>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>),
  Search: _icon(<>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-3.5-3.5" />
  </>),
  Plus: _icon(<>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>),
  Sparkles: _icon(<>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <path d="M12 8.5a3.5 3.5 0 0 0 3.5 3.5A3.5 3.5 0 0 0 12 15.5 3.5 3.5 0 0 0 8.5 12 3.5 3.5 0 0 0 12 8.5z" />
  </>),
  Copy: _icon(<>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>),
  Send: _icon(<>
    <path d="m22 2-11 11" />
    <path d="M22 2 15 22l-4-9-9-4z" />
  </>),
  Revert: _icon(<>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </>),
  Mail: _icon(<>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </>),
  Lock: _icon(<>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>),
  Check: _icon(<>
    <path d="M20 6 9 17l-5-5" />
  </>),
  Alert: _icon(<>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>),
  MoreH: _icon(<>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </>),
  Book: _icon(<>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M9 7h7" />
    <path d="M9 11h5" />
  </>),
  Network: _icon(<>
    <circle cx="12" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
    <path d="M12 7v3" />
    <path d="m11 11-5 6" />
    <path d="m13 11 5 6" />
  </>),
  Link: _icon(<>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>),
  Briefcase: _icon(<>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </>),
  MapPin: _icon(<>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </>),
  Calendar: _icon(<>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </>),
  Clock: _icon(<>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>),
  LogOut: _icon(<>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </>),
  Google: ({ size = 16, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={size} height={size} className={className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 1 1-3.3-13l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  ),
};

window.Icon = Icon;
