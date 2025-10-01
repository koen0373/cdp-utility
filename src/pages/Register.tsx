import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import COINDEPO_FULL_LOGO from '../assets/Manager logo.png';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Attempting to sign up...');
      const { error } = await signUp(email, password);
      
      if (error) {
        console.error('❌ Sign up error:', error);
        setError(`${error.message} (${error.status || 'unknown'})`);
        setLoading(false);
      } else {
        console.log('✅ Sign up successful!');
        setSuccess(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Unexpected error during sign up:', err);
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center">
            <img 
              src={COINDEPO_FULL_LOGO} 
              alt="COINDEPO Portfolio Manager" 
              className="h-8 w-auto mx-auto mb-4"
            />
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-blue-600 mb-2">Check Your Email</h2>
            <p className="text-slate-600 text-sm mb-4">
              We've sent a verification link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Please click the link in the email to verify your account and complete registration.
            </p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 text-sm rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl p-6">
        {/* Logo */}
        <div className="text-center mb-6">
          <img 
            src={COINDEPO_FULL_LOGO} 
            alt="COINDEPO Portfolio Manager" 
            className="h-8 w-auto mx-auto mb-3"
          />
          <h1 className="text-lg font-bold text-blue-600 mb-1">Create Account</h1>
          <p className="text-slate-600 text-xs">Start managing your COINDEPO portfolio</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-slate-500">Minimum 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign in
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link to="/guest" className="text-slate-500 hover:text-slate-700 text-xs">
            Continue as guest →
          </Link>
        </div>
      </div>
    </div>
  );
};
