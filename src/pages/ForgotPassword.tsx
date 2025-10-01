import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import COINDEPO_FULL_LOGO from '../assets/Manager logo.png';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const { error } = await resetPassword(email);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <img 
              src={COINDEPO_FULL_LOGO} 
              alt="COINDEPO Portfolio Manager" 
              className="h-16 w-auto mx-auto mb-6"
            />
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-blue-600 mb-2">Check Your Email</h2>
            <p className="text-slate-600 text-sm mb-4">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Please check your email and click the link to reset your password.
            </p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 text-sm rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={COINDEPO_FULL_LOGO} 
            alt="COINDEPO Portfolio Manager" 
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-blue-600 mb-2">Reset Password</h1>
          <p className="text-slate-600 text-sm">Enter your email to receive a reset link</p>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-600">
          Remember your password?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
