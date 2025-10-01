import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LogoutButton: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-600"
      title="Logout"
    >
      Logout
    </button>
  );
};


