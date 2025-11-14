

import React, { useState } from 'react';
import type { User } from '../types';
import { db } from './db';

interface GroupLockerProps {
  users: User[];
  onLogin: (user: User) => Promise<void>;
}

const GroupLocker: React.FC<GroupLockerProps> = ({ users, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  
  // Signup state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [createError, setCreateError] = useState('');

  // Forgot/Reset Password state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [resetError, setResetError] = useState('');


  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
        setLoginError("Please enter username and password.");
        return;
    }
    setIsSubmitting(true);
    setLoginError('');
    const authenticatedUser = await db.authenticate(loginUsername, loginPassword);
    if (authenticatedUser) {
      await onLogin(authenticatedUser);
    } else {
      setLoginError("Invalid credentials. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError("Username and password cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    setCreateError('');
    const newUser = await db.createUser({ 
        username: newUsername, 
        password: newPassword,
        instagramUsername: newInstagram
    });

    if (newUser) {
      await onLogin(newUser);
    } else {
      setCreateError("Username is already taken.");
    }
    setIsSubmitting(false);
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (!recoveryEmail) {
      setRecoveryError('Please enter an email address.');
      return;
    }
    setIsSubmitting(true);
    
    const user = await db.generatePasswordRecoveryToken(recoveryEmail);
    if (user && user.recoveryToken) {
        setGeneratedToken(user.recoveryToken);
        setMode('reset');
    } else {
        setRecoveryError('No account found with that email address. An email must be added to your profile by an admin.');
    }
    setIsSubmitting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!inputToken.trim() || !newPasswordForReset.trim()) {
      setResetError('Please fill in both the token and a new password.');
      return;
    }
    setIsSubmitting(true);
    const user = await db.resetPasswordWithToken(inputToken.trim(), newPasswordForReset.trim());
    if (user) {
        setLoginMessage('Password has been successfully reset. Please log in.');
        setMode('login');
        // Clear all recovery state
        setRecoveryEmail('');
        setGeneratedToken(null);
        setInputToken('');
        setNewPasswordForReset('');
    } else {
        setResetError('The provided recovery code is invalid or has expired. Please try again.');
    }
    setIsSubmitting(false);
  };

  const switchMode = (newMode: 'login' | 'signup' | 'forgot' | 'reset') => {
    // Clear all errors and messages when switching modes
    setLoginError('');
    setLoginMessage('');
    setCreateError('');
    setRecoveryError('');
    setResetError('');
    setMode(newMode);
  };
  
  const renderContent = () => {
    switch(mode) {
      case 'signup':
        return (
            <>
              <h2 className="text-4xl font-bold text-center mb-8">Create Account</h2>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
                <input type="text" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} placeholder="Instagram (optional)" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
                {createError && <p className="text-red-400 text-sm text-center !mt-4">{createError}</p>}
                <button type="submit" className="w-full px-5 py-3 bg-white text-slate-900 rounded-full transition-all duration-300 font-bold text-lg disabled:bg-slate-400 disabled:opacity-70 flex items-center justify-center transform hover:scale-105" disabled={!newUsername.trim() || !newPassword.trim() || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Sign Up'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-300 mt-6">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="font-semibold text-white hover:underline">
                  Log In
                </button>
              </p>
            </>
        );
      case 'forgot':
        return (
          <>
            <h2 className="text-4xl font-bold text-center mb-4">Forgot Password</h2>
             <p className="text-center text-sm text-slate-300 mb-6">Enter your email to receive a recovery code.</p>
            <form onSubmit={handleRequestRecovery} className="space-y-6">
               <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Your email address" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
              {recoveryError && <p className="text-red-400 text-sm text-center !mt-4">{recoveryError}</p>}
              <button type="submit" className="w-full px-5 py-3 bg-white text-slate-900 rounded-full transition-all duration-300 font-bold text-lg disabled:bg-slate-400 disabled:opacity-70 flex items-center justify-center transform hover:scale-105" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Recovery Code'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-300 mt-6">
              Remember your password?{' '}
              <button onClick={() => switchMode('login')} className="font-semibold text-white hover:underline">
                Back to Login
              </button>
            </p>
          </>
        );
      case 'reset':
        return (
          <>
            <h2 className="text-4xl font-bold text-center mb-4">Reset Password</h2>
            <p className="text-center text-sm text-slate-300 mb-6">A recovery code has been generated. For this demo, your code is <strong className="text-lg text-cyan-300 font-mono tracking-widest">{generatedToken}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-6">
               <input type="text" value={inputToken} onChange={(e) => setInputToken(e.target.value)} placeholder="Enter recovery code" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
               <input type="password" value={newPasswordForReset} onChange={(e) => setNewPasswordForReset(e.target.value)} placeholder="Enter new password" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
              {resetError && <p className="text-red-400 text-sm text-center !mt-4">{resetError}</p>}
              <button type="submit" className="w-full px-5 py-3 bg-white text-slate-900 rounded-full transition-all duration-300 font-bold text-lg disabled:bg-slate-400 disabled:opacity-70 flex items-center justify-center transform hover:scale-105" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
             <p className="text-center text-sm text-slate-300 mt-6">
              <button onClick={() => switchMode('forgot')} className="font-semibold text-white hover:underline">
                Request a new code
              </button>
            </p>
          </>
        );
      case 'login':
      default:
        return (
          <>
            <h2 className="text-4xl font-bold text-center mb-8">Login</h2>
            {loginMessage && <p className="text-green-400 text-sm text-center mb-4">{loginMessage}</p>}
            <form onSubmit={handleLoginAttempt} className="space-y-6">
                <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Username" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-5 py-3 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-white/50 focus:border-white/20 focus:outline-none transition"/>
                {loginError && <p className="text-red-400 text-sm text-center !mt-4">{loginError}</p>}
                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded bg-white/20 border-white/30 text-indigo-500 focus:ring-indigo-500" />
                        Remember me
                    </label>
                    <button type="button" onClick={() => switchMode('forgot')} className="font-semibold text-white hover:underline">
                        Forgot Password?
                    </button>
                </div>
                <button type="submit" className="w-full px-5 py-3 bg-white text-slate-900 rounded-full transition-all duration-300 font-bold text-lg disabled:bg-slate-400 disabled:opacity-70 flex items-center justify-center transform hover:scale-105" disabled={!loginUsername || !loginPassword || isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <div className="relative text-center text-slate-300 mt-8 text-sm">
                <div className="flex items-center my-4">
                    <hr className="flex-grow border-white/20"/>
                    <span className="px-4 text-slate-400">Or</span>
                    <hr className="flex-grow border-white/20"/>
                </div>
                <div className="flex justify-center items-center gap-4">
                    <button className="font-semibold hover:underline">Google</button>
                    <span>--</span>
                    <button className="font-semibold hover:underline">Facebook</button>
                </div>
            </div>
            <p className="text-center text-sm text-slate-300 mt-6">
              Don't have an account?{' '}
              <button onClick={() => switchMode('signup')} className="font-semibold text-white hover:underline">
                Sign Up
              </button>
            </p>
          </>
        );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl text-white">
        {renderContent()}
      </div>
    </div>
  );
};

export default GroupLocker;