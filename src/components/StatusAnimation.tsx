'use client';

import { motion } from 'framer-motion';

interface StatusAnimationProps {
  type: 'success' | 'error' | 'warning' | 'loading' | 'upload' | 'access_denied';
  message: string;
  subMessage?: string;
}

const IconSuccess = () => (
  <svg
    className="w-full h-full text-green-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M22 4L12 14.01l-3-3" />
  </svg>
);

const IconError = () => (
  <svg
    className="w-full h-full text-red-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconWarning = () => (
  <svg
    className="w-full h-full text-yellow-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconLoading = () => (
  <motion.svg
    className="w-full h-full text-primary"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </motion.svg>
);

const IconUpload = () => (
  <svg
    className="w-full h-full text-blue-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);

const IconAccessDenied = () => (
  <svg
    className="w-full h-full text-orange-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);


export default function StatusAnimation({ type, message, subMessage }: StatusAnimationProps) {
  
  const getIcon = () => {
    switch(type) {
      case 'success': return <IconSuccess />;
      case 'error': return <IconError />;
      case 'warning': return <IconWarning />;
      case 'loading': return <IconLoading />;
      case 'upload': return <IconUpload />;
      case 'access_denied': return <IconAccessDenied />;
      default: return <IconWarning />;
    }
  }

  const getThemeClass = () => {
    switch(type) {
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'access_denied': return 'border-orange-200 bg-orange-50 text-orange-800';
      default: return 'border-primary/20 bg-primary/5 text-primary';
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-8 rounded-3xl border shadow-lg flex flex-col items-center justify-center text-center max-w-md w-full mx-auto ${getThemeClass()}`}
    >
      <div className="w-24 h-24 mb-6 drop-shadow-sm">
        {getIcon()}
      </div>
      <h3 className="text-2xl font-bold mb-2">
        {message}
      </h3>
      {subMessage && (
        <p className="opacity-80 text-sm mt-1">
          {subMessage}
        </p>
      )}
    </motion.div>
  );
}
