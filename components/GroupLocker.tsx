

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
    const inputClasses = "w-full bg-white/5 border border-white/10 rounded-full px-5 py-3 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition";
    const buttonClasses = "w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full transition-all duration-300 font-bold text-lg disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-70 flex items-center justify-center transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20";

    switch(mode) {
      case 'signup':
        return (
            <>
              <h2 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">Create Account</h2>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className={inputClasses}/>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className={inputClasses}/>
                <input type="text" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} placeholder="Instagram (optional)" className={inputClasses}/>
                {createError && <p className="text-red-400 text-sm text-center !mt-4">{createError}</p>}
                <button type="submit" className={buttonClasses} disabled={!newUsername.trim() || !newPassword.trim() || isSubmitting}>
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
             <p className="text-center text-sm text-slate-300 mb-6">Enter your email to receive a recovery code.</p>
            <form onSubmit={handleRequestRecovery} className="space-y-6">
               <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Your email address" className={inputClasses}/>
              {recoveryError && <p className="text-red-400 text-sm text-center !mt-4">{recoveryError}</p>}
              <button type="submit" className={buttonClasses} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Recovery Code'}
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
      case 'reset':
        return (
          <>
            <h2 className="text-4xl font-bold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">Reset Password</h2>
            <p className="text-center text-sm text-slate-300 mb-6">A recovery code has been generated. For this demo, your code is <strong className="text-lg text-cyan-300 font-mono tracking-widest bg-white/10 p-1 rounded-md">{generatedToken}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-6">
               <input type="text" value={inputToken} onChange={(e) => setInputToken(e.target.value)} placeholder="Enter recovery code" className={inputClasses}/>
               <input type="password" value={newPasswordForReset} onChange={(e) => setNewPasswordForReset(e.target.value)} placeholder="Enter new password" className={inputClasses}/>
              {resetError && <p className="text-red-400 text-sm text-center !mt-4">{resetError}</p>}
              <button type="submit" className={buttonClasses} disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
             <p className="text-center text-sm text-slate-300 mt-6">
              <button onClick={() => switchMode('forgot')} className="font-semibold text-cyan-300 hover:underline">
                Request a new code
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
                <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Username" className={inputClasses}/>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className={inputClasses}/>
                {loginError && <p className="text-red-400 text-sm text-center !mt-4">{loginError}</p>}
                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" className="w-4 h-4 rounded bg-white/20 border-white/30 text-cyan-500 focus:ring-cyan-500" />
                        Remember me
                    </label>
                    <button type="button" onClick={() => switchMode('forgot')} className="font-semibold text-cyan-300 hover:underline">
                        Forgot Password?
                    </button>
                </div>
                <button type="submit" className={buttonClasses} disabled={!loginUsername || !loginPassword || isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <div className="relative text-center text-slate-300 mt-8 text-sm">
                <div className="flex items-center my-4">
                    <hr className="flex-grow border-white/10"/>
                    <span className="px-4 text-slate-400">Or</span>
                    <hr className="flex-grow border-white/10"/>
                </div>
                <div className="flex justify-center items-center gap-4">
                    <button className="font-semibold hover:underline text-slate-400 hover:text-white">Google</button>
                    <span>-</span>
                    <button className="font-semibold hover:underline text-slate-400 hover:text-white">Facebook</button>
                </div>
            </div>
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
// Health check comment
