
import React, { useState } from 'react';
import type { User } from '../types';
import { db } from '../utils/db';
import { KeyIcon, InformationCircleIcon } from './icons';

interface GroupLockerProps {
  users: User[];
  onLogin: (user: User) => Promise<void>;
}

const EmailDisplay: React.FC<{ content: string }> = ({ content }) => {
    const subjectMatch = content.match(/Subject: (.*)/);
    const fromMatch = content.match(/From: (.*)/);
    const bodyParts = content.split(/---/);
    const body = (bodyParts.length > 1 ? bodyParts[1] : content).trim();

    return (
        <div className="text-left text-sm bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-4 space-y-3">
            {fromMatch && (
                <div>
                    <span className="text-slate-400">From: </span>
                    <span className="text-slate-200">{fromMatch[1]}</span>
                </div>
            )}
            {subjectMatch && (
                <div>
                    <span className="text-slate-400">Subject: </span>
                    <span className="text-slate-200 font-semibold">{subjectMatch[1]}</span>
                </div>
            )}
            
            <div className="border-t border-slate-700 !mt-2 !mb-2"></div>
            <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed">
                {body}
            </pre>
        </div>
    );
}

const GroupLocker: React.FC<GroupLockerProps> = ({ users, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('signup');
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
  const [generatedEmailContent, setGeneratedEmailContent] = useState<string | null>(null);


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
    setGeneratedEmailContent(null);
    if (!recoveryEmail) {
      setRecoveryError('Please enter an email address.');
      return;
    }
    setIsSubmitting(true);
    
    const user = await db.generatePasswordRecoveryToken(recoveryEmail);
    if (user && user.recoveryToken) {
        setGeneratedToken(user.recoveryToken);
        setMode('reset');

        const emailSubject = "Password Recovery for BAK -Ko";
        const emailFrom = "BAK -Ko Security <noreply@bakko.app>";
        const emailBody = `Hello ${user.username},\n\nA password reset was requested for your account.\n\nUse the following 6-digit recovery code to reset your password:\n\n${user.recoveryToken}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, you can safely ignore this email.\n\nThanks,\nThe BAK -Ko Team`;
        const emailContent = `Subject: ${emailSubject}\nFrom: ${emailFrom}\n---\n${emailBody}`;
        
        setGeneratedEmailContent(emailContent);

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
        setGeneratedEmailContent(null);
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
    setGeneratedEmailContent(null);
    setMode(newMode);
  };
  
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.online).length;

  const renderContent = () => {
    switch(mode) {
      case 'signup':
        return (
            <>
              <h2 className="text-2xl font-bold text-white text-center mb-6">Create Account</h2>
              <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter your username" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Create a password" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
                <input type="text" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} placeholder="Instagram username (optional)" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
                {createError && <p className="text-red-400 text-sm text-center">{createError}</p>}
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70 flex items-center justify-center" disabled={!newUsername.trim() || !newPassword.trim() || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Sign Up & Join'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-400 mt-6">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="font-semibold text-blue-400 hover:text-blue-300">
                  Log In
                </button>
              </p>
            </>
        );
      case 'forgot':
        return (
          <>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Forgot Password</h2>
             <p className="text-center text-sm text-slate-400 mb-4">Enter the email associated with your account to receive a recovery code.</p>
            <form onSubmit={handleRequestRecovery} className="flex flex-col gap-4">
               <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Your email address" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
              {recoveryError && <p className="text-red-400 text-sm text-center">{recoveryError}</p>}
              <button type="submit" className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70 flex items-center justify-center" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Recovery Code'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-6">
              Remember your password?{' '}
              <button onClick={() => switchMode('login')} className="font-semibold text-blue-400 hover:text-blue-300">
                Back to Login
              </button>
            </p>
          </>
        );
      case 'reset':
        return (
          <>
            <h2 className="text-2xl font-bold text-white text-center mb-4">Reset Password</h2>
                       
            {generatedEmailContent ? <EmailDisplay content={generatedEmailContent} /> : (
                 <div className="text-center text-sm bg-slate-700/50 p-3 rounded-lg border border-slate-600 mb-4">
                    <p className="text-red-300">{recoveryError || "An error occurred."}</p>
                    <p className="text-slate-200 mt-1">Your code is: <strong className="text-lg text-cyan-300 font-mono tracking-widest">{generatedToken}</strong></p>
                </div>
            )}
            
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
               <input type="text" value={inputToken} onChange={(e) => setInputToken(e.target.value)} placeholder="Enter recovery code from email" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
               <input type="password" value={newPasswordForReset} onChange={(e) => setNewPasswordForReset(e.target.value)} placeholder="Enter new password" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
              {resetError && <p className="text-red-400 text-sm text-center">{resetError}</p>}
              <button type="submit" className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70 flex items-center justify-center" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
             <p className="text-center text-sm text-slate-400 mt-6">
              <button onClick={() => switchMode('forgot')} className="font-semibold text-blue-400 hover:text-blue-300">
                Request a new code
              </button>
            </p>
          </>
        );
      case 'login':
      default:
        return (
          <>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Welcome Back</h2>
            {loginMessage && <p className="text-green-400 text-sm text-center mb-4">{loginMessage}</p>}
            <form onSubmit={handleLoginAttempt} className="flex flex-col gap-4">
               <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Username" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"/>
              {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
               <div className="text-right text-sm">
                <button type="button" onClick={() => switchMode('forgot')} className="font-semibold text-blue-400 hover:text-blue-300">
                  Forgot your password?
                </button>
              </div>
              <button type="submit" className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70 flex items-center justify-center" disabled={!loginUsername || !loginPassword || isSubmitting}>
                {isSubmitting ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-6">
              Don't have an account?{' '}
              <button onClick={() => switchMode('signup')} className="font-semibold text-blue-400 hover:text-blue-300">
                Sign Up
              </button>
            </p>
          </>
        );
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">BAK -Ko</h1>
        <p className="text-lg text-slate-400">The definitive real-time chat experience.</p>
      </div>

      <div className="flex justify-center gap-8 mb-8 text-center">
        <div>
          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">{totalUsers}</p>
          <p className="text-sm text-slate-400">Total Users</p>
        </div>
        <div>
          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-400">{activeUsers}</p>
          <p className="text-sm text-slate-400">Online Now</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-center mb-6 flex items-center gap-3">
        <InformationCircleIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
        <p className="text-slate-400 text-sm text-left">
          <strong>Please Note:</strong> This is a single-device experience. All data is stored locally in your browser and will not sync across other devices.
        </p>
      </div>

      <div className="w-full max-w-sm bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
        {renderContent()}
      </div>
    </div>
  );
};

export default GroupLocker;