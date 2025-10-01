import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { portfolioService, type PortfolioData } from '../services/portfolioService';

export const usePortfolioSync = () => {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Load portfolio from Supabase when user logs in
  const loadFromSupabase = async (): Promise<PortfolioData | null> => {
    if (!user) return null;
    
    try {
      setSyncing(true);
      const data = await portfolioService.loadPortfolio(user.id);
      setLastSync(new Date());
      return data;
    } catch (error) {
      console.error('Error loading portfolio:', error);
      return null;
    } finally {
      setSyncing(false);
    }
  };

  // Save portfolio to Supabase
  const saveToSupabase = async (portfolio: PortfolioData): Promise<void> => {
    if (!user) return;
    
    try {
      setSyncing(true);
      await portfolioService.savePortfolio(user.id, portfolio);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error saving portfolio:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  // Migrate from localStorage on first login
  const migrateFromLocalStorage = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      return await portfolioService.migrateFromLocalStorage(user.id);
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
      return false;
    }
  };

  return {
    user,
    syncing,
    lastSync,
    loadFromSupabase,
    saveToSupabase,
    migrateFromLocalStorage
  };
};

