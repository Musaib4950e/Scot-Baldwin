
import React, { useState } from 'react';
import type { User } from '../types';
import { db_firebase as db } from './db';

interface GroupLockerProps {
  onLogin: (user: User) => Promise<void>;
}

const GroupLocker: React.FC<GroupLockerProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  
  // Signup state
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [createError, setCreateError] = useState('');

  // Forgot Password state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');


  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
        setLoginError("Please enter email and password.");
        return;
    }
    setIsSubmitting(true);
    setLoginError('');
    try {
      const authenticatedUser = await db.authenticate(loginEmail, loginPassword);
      if (authenticatedUser) {
        // onAuthStateChanged in App.tsx will handle the login state.
      } else {
        setLoginError("Invalid credentials. Please try again.");
      }
    } catch (error) {
      setLoginError("Invalid credentials. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newUsername.trim() || !newPassword.trim()) {
      setCreateError("Email, username, and password cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    setCreateError('');
    try {
      const newUser = await db.createUser({ 
          email: newEmail,
          username: newUsername, 
          password: newPassword,
          instagramUsername: newInstagram
      });
      // onAuthStateChanged in App.tsx will handle the login state.
    } catch (error: any) {
      setCreateError(error.message || "Could not create user.");
    }
    setIsSubmitting(false);
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMessage('');
    if (!recoveryEmail) {
      setRecoveryError('Please enter an email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      await db.resetUserPassword(recoveryEmail);
      setRecoveryMessage('Password reset email sent. Check your inbox (and spam folder) to continue.');
    } catch (error: any) {
      setRecoveryError(error.message || 'Failed to send password reset email.');
    }
    setIsSubmitting(false);
  };

  const switchMode = (newMode: 'login' | 'signup' | 'forgot') => {
    setLoginError('');
    setLoginMessage('');
    setCreateError('');
    setRecoveryError('');
    setRecoveryMessage('');
    setMode(newMode);
  };
  
  const renderContent = () => {
    const inputClasses = "w-full bg-white/5 border border-white/10 rounded-full px-5 py-3 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition";
    const buttonClasses = "w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full transition-all duration-300 font-bold text-lg disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-70 flex items-center justify-center transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20";

    switch(mode) {
      case 'signup':
        return (
            <>
              <h2 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">Create Account</h2>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className={inputClasses}/>
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className={inputClasses}/>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className={inputClasses}/>
                <input type="text" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} placeholder="Instagram (optional)" className={inputClasses}/>
                {createError && <p className="text-red-400 text-sm text-center !mt-4">{createError}</p>}
                <button type="submit" className={buttonClasses} disabled={!newEmail.trim() || !newUsername.trim() || !newPassword.trim() || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Sign Up'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-300 mt-6">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="font-semibold text-cyan-300 hover:underline">
                  Log In
                </button>
              </p>
            </>
        );
      case 'forgot':
        return (
          <>
            <h2 className="text-4xl font-bold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">Forgot Password</h2>
             <p className="text-center text-sm text-slate-300 mb-6">Enter your email to receive a recovery link.</p>
            <form onSubmit={handleRequestRecovery} className="space-y-6">
               <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Your email address" className={inputClasses}/>
              {recoveryError && <p className="text-red-400 text-sm text-center !mt-4">{recoveryError}</p>}
              {recoveryMessage && <p className="text-green-400 text-sm text-center !mt-4">{recoveryMessage}</p>}
              <button type="submit" className={buttonClasses} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Recovery Email'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-300 mt-6">
              Remember your password?{' '}
              <button onClick={() => switchMode('login')} className="font-semibold text-cyan-300 hover:underline">
                Back to Login
              </button>
            </p>
          </>
        );
      case 'login':
      default:
        return (
          <>
            <h2 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">Login</h2>
            {loginMessage && <p className="text-green-400 text-sm text-center mb-4">{loginMessage}</p>}
            <form onSubmit={handleLoginAttempt} className="space-y-6">
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email" className={inputClasses}/>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className={inputClasses}/>
                {loginError && <p className="text-red-400 text-sm text-center !mt-4">{loginError}</p>}
                <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={() => switchMode('forgot')} className="font-semibold text-cyan-300 hover:underline">
                        Forgot Password?
                    </button>
                </div>
                <button type="submit" className={buttonClasses} disabled={!loginEmail || !loginPassword || isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p className="text-center text-sm text-slate-300 mt-6">
              Don't have an account?{' '}
              <button onClick={() => switchMode('signup')} className="font-semibold text-cyan-300 hover:underline">
                Sign Up
              </button>
            </p>
          </>
        );
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">BAK -Ko</h1>
      <div className="w-full max-w-md bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/30 text-white">
        {renderContent()}
      </div>
    </div>
  );
};

export default GroupLocker;
