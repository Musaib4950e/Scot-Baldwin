import React from 'react';

export const LockClosedIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm-3.75 5.25v3h7.5v-3a3.75 3.75 0 10-7.5 0z" clipRule="evenodd" />
  </svg>
);

export const LockOpenIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 01-1.5 0V6.75a3.75 3.75 0 10-7.5 0v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a.75.75 0 011.5 0v6.75a4.5 4.5 0 01-4.5-4.5H9a4.5 4.5 0 01-4.5-4.5v-6.75a4.5 4.5 0 014.5-4.5v-3A5.25 5.25 0 0118 1.5z" />
  </svg>
);


export const CodeBracketIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M8.25 3.75H6a2.25 2.25 0 00-2.25 2.25v12A2.25 2.25 0 006 20.25h2.25a.75.75 0 000-1.5H6a.75.75 0 01-.75-.75V6c0-.414.336-.75.75-.75h2.25a.75.75 0 000-1.5zM15.75 3.75h2.25a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25h-2.25a.75.75 0 010-1.5h2.25a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75h-2.25a.75.75 0 010-1.5z" clipRule="evenodd" />
    <path d="M10.703 19.232l-1.406-1.406a.75.75 0 011.06-1.06l1.044.992 4.28-5.024-4.28-5.023-1.044.992a.75.75 0 01-1.06-1.06l1.406-1.406a.75.75 0 011.044-.016l5.25 6.125a.75.75 0 010 1.082l-5.25 6.125a.75.75 0 01-1.044-.016z" />
  </svg>
);

export const UserCircleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
  </svg>
);

export const ArrowLeftOnRectangleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);

export const PaperAirplaneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

export const PlusCircleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
  </svg>
);

export const MagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
  </svg>
);

export const UsersIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63l-2.693 1.5a.75.75 0 01-.684 0l-2.693-1.5a.75.75 0 01-.363-.63V19.125zM15.75 19.125a5.625 5.625 0 0111.25 0v.003l-.001.119a.75.75 0 01-.363.63l-2.693 1.5a.75.75 0 01-.684 0l-2.693-1.5a.75.75 0 01-.363-.63V19.125z" />
  </svg>
);

export const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
  </svg>
);

export const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor" >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.012 3.584-.07 4.85c-.148 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.07-1.645-.07-4.85s.012-3.584.07-4.85c.148-3.225 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.324a4.162 4.162 0 110-8.324 4.162 4.162 0 010 8.324zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/>
    </svg>
);

export const XMarkIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

export const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm.027 12.923a.75.75 0 10-1.06-1.06l-3 3a.75.75 0 001.06 1.06l3-3z" clipRule="evenodd" />
        <path d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm-3.32 14.053a.75.75 0 001.06 1.06l5.25-5.25a.75.75 0 00-1.06-1.06l-5.25 5.25z" />
    </svg>
);

export const PencilIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
    </svg>
);

export const KeyIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M15.75 1.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V3a.75.75 0 00-.75-.75H9.375a3 3 0 00-5.94 1.554 4.5 4.5 0 107.311 4.31c.32-.592.515-1.247.515-1.933V7.5a.75.75 0 011.5 0v1.5a1.5 1.5 0 11-3 0V7.5a.75.75 0 00-.75-.75H9.375a1.5 1.5 0 01-1.42 1.054 3 3 0 114.197-4.197A1.5 1.5 0 0114.25 3h1.5z" clipRule="evenodd" />
        <path d="M5.25 12.375a.75.75 0 00-1.5 0v6.375a3 3 0 003 3h6.375a.75.75 0 000-1.5H6.75a1.5 1.5 0 01-1.5-1.5V12.375z" />
    </svg>
);

export const Cog6ToothIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.85a1.5 1.5 0 00-1.83 2.316l-1.897.823c-.784.34-1.205 1.23-1.044 2.032l.53 2.12c.11.443.435.83.848 1.034l1.897.823a1.5 1.5 0 001.83 2.316l.178 2.034c.15.904.933 1.567 1.85 1.567h1.844c.917 0 1.699-.663 1.85-1.567l.178-2.034a1.5 1.5 0 001.83-2.316l1.897-.823c.784-.34 1.205-1.23 1.044-2.032l-.53-2.12a1.5 1.5 0 00-.848-1.034l-1.897-.823a1.5 1.5 0 00-1.83-2.316l-.178-2.034A1.875 1.875 0 0012.922 2.25h-1.844zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
    </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.006a.75.75 0 01-.749.654H5.858a.75.75 0 01-.749-.654L4.109 6.67A.75.75 0 014.368 5.2l.209.035a48.816 48.816 0 013.878-.512V4.478c0-1.844 1.522-3.344 3.375-3.344h2.25c1.853 0 3.375 1.5 3.375 3.344zM13.5 6.75a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V7.5a.75.75 0 01.75-.75zm-4.5 0a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V7.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a.75.75 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
    </svg>
);

export const InformationCircleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.042.02c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.02zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

export const UserPlusIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63l-2.693 1.5a.75.75 0 01-.684 0l-2.693-1.5a.75.75 0 01-.363-.63V19.125z" />
    <path d="M16.5 12.75a.75.75 0 00-1.5 0v2.25H12.75a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25h2.25a.75.75 0 000-1.5h-2.25V12.75z" />
  </svg>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

export const CheckBadgeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12c0 1.357-.6 2.573-1.549 3.397a4.49 4.49 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.491 4.491 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
  </svg>
);

export const BellIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2.25c-2.429 0-4.66.93-6.342 2.503a.75.75 0 00-1.06 1.06c1.391 1.391 2.16 3.243 2.16 5.187v.198a8.232 8.232 0 01-3.262 6.348.75.75 0 101.06 1.06 9.732 9.732 0 003.442-4.985h.01a9.75 9.75 0 0011.964 0h.009a9.733 9.733 0 003.442 4.985.75.75 0 101.06-1.06 8.232 8.232 0 01-3.262-6.348v-.198c0-1.944.769-3.796 2.16-5.187a.75.75 0 00-1.06-1.06C16.66 3.18 14.43 2.25 12 2.25zM12.75 21a2.25 2.25 0 01-4.5 0h4.5z" clipRule="evenodd" />
    </svg>
);

export const BanIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zM4.755 16.365A7.751 7.751 0 0112 4.25a7.75 7.75 0 017.245 12.115l-14.49-14.49zM19.245 7.635A7.751 7.751 0 0112 19.75a7.75 7.75 0 01-7.245-12.115l14.49 14.49z" />
    </svg>
);

export const EnvelopeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
        <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
    </svg>
);

export const MegaphoneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.137 2.253A2.25 2.25 0 009 3.75v.568c-3.134.36-5.25 3.167-5.25 6.432 0 3.265 2.116 6.072 5.25 6.432v.568a2.25 2.25 0 002.137 1.497 25.43 25.43 0 004.821-.628 2.25 2.25 0 001.606-3.412c-.287-.503-.534-1.018-.74-1.545A2.25 2.25 0 0016.5 12c0-1.12.754-2.063 1.81-2.222.185-.028.37-.044.557-.048a2.25 2.25 0 001.907-2.31c-.13-.795-.45-1.549-.9-2.235a2.25 2.25 0 00-2.023-1.185 24.59 24.59 0 00-5.714-.495z" />
      <path fillRule="evenodd" d="M3 10.5a1.5 1.5 0 011.5-1.5h.75a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-.75a1.5 1.5 0 01-1.5-1.5v-3z" clipRule="evenodd" />
    </svg>
);

export const ChartBarIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-4h6v4zm0-6h-6V5h6v6z" />
    </svg>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
    </svg>
);

export const WalletIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18 9.75a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0v-6a.75.75 0 01.75-.75z" />
        <path fillRule="evenodd" d="M20.25 5.25A2.25 2.25 0 0018 3H6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h12a2.25 2.25 0 002.25-2.25V5.25zm-3.75 2.25a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6zM12 7.5a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0v-6a.75.75 0 01.75-.75zM8.25 7.5a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6z" clipRule="evenodd" />
    </svg>
);

export const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 2.14 1.73 3.87 3.87 3.87 2.14 0 3.87-1.73 3.87-3.87 0-.613-.143-1.19-.4-1.725h4.062c-.257.535-.4 1.112-.4 1.725 0 2.14 1.73 3.87 3.87 3.87 2.14 0 3.87-1.73 3.87-3.87 0-2.493-2.35-4.227-4.9-3.578l-1.622-6.08a2.25 2.25 0 00-2.16-1.622H6.484a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h8.188a.75.75 0 01.744.648l.243 1.022a4.5 4.5 0 01-4.43 5.176H6.182a.75.75 0 01-.744-.648l-2.43-9.113A.75.75 0 002.25 2.25z" />
    </svg>
);

// FIX: Added missing ChatBubbleLeftRightIcon component
export const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.75 6.75 0 006.75-6.75v-2.5a.75.75 0 011.5 0v2.5a8.25 8.25 0 01-8.25 8.25c-1.33 0-2.6-.31-3.75-.882V21a.75.75 0 01.75-.75h2.804z" clipRule="evenodd" />
        <path d="M15.75 2.25a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0v-6a.75.75 0 01.75-.75zM19.5 4.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V5.25a.75.75 0 01.75-.75z" />
        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 006 3v11.25a6.75 6.75 0 006.75 6.75c.586 0 1.156-.074 1.706-.212A.75.75 0 0115 20.25v-3.445a.75.75 0 01.568-.731A8.25 8.25 0 0018.75 9 8.25 8.25 0 006 3a.75.75 0 00.75-.75zM12 12.75a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5z" clipRule="evenodd" />
        <path d="M8.25 8.25a.75.75 0 010 1.5H6a.75.75 0 010-1.5h2.25z" />
    </svg>
);


// FIX: Corrected a corrupted SVG path data.
export const CurrencyDollarIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 7.5a.75.75 0 01.75.75v.5a2.25 2.25 0 004.5 0v-.5a.75.75 0 011.5 0v.5a3.75 3.75 0 11-7.5 0v-.5a.75.75 0 01.75-.75z" />
        <path fillRule="evenodd" d="M3 8.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 8.25zM6.75 12a.75.75 0 01.75-.75H12a.75.75 0 010 1.5H7.5a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3zM3 15.75a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
);

export const PaintBrushIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M14.063 2.126a2.625 2.625 0 00-3.713 0L3 9.375a2.625 2.625 0 000 3.712l9.375 9.375a2.625 2.625 0 003.712 0l7.25-7.25a2.625 2.625 0 000-3.712l-5.563-5.562zM5.42 11.232a.75.75 0 111.06-1.06l4.238 4.237a.75.75 0 11-1.06 1.06L5.42 11.232z" />
        <path d="M22.5 3.75a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z" />
    </svg>
);