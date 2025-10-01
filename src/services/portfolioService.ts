import { supabase } from '../lib/supabase';

export interface PortfolioData {
  assets: any[];
  coindepo_holdings: any[];
  loans: any[];
  settings: {
    selected_currency: string;
    extra_payout_enabled: boolean;
  };
}

export const portfolioService = {
  // Load portfolio from Supabase
  async loadPortfolio(userId: string): Promise<PortfolioData | null> {
    try {
      console.log('📥 Loading portfolio for user:', userId);
      
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No portfolio found - this is normal for new users
          console.log('ℹ️ No portfolio found for user');
          return null;
        }
        throw error;
      }

      console.log('✅ Portfolio loaded successfully');
      return {
        assets: data.assets || [],
        coindepo_holdings: data.coindepo_holdings || [],
        loans: data.loans || [],
        settings: data.settings || { selected_currency: 'USD', extra_payout_enabled: false }
      };
    } catch (error) {
      console.error('❌ Error loading portfolio:', error);
      throw error;
    }
  },

  // Save portfolio to Supabase
  async savePortfolio(userId: string, portfolio: PortfolioData): Promise<void> {
    try {
      console.log('💾 Saving portfolio for user:', userId);
      
      const { error } = await supabase
        .from('portfolios')
        .upsert({
          user_id: userId,
          assets: portfolio.assets,
          coindepo_holdings: portfolio.coindepo_holdings,
          loans: portfolio.loans,
          settings: portfolio.settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      console.log('✅ Portfolio saved successfully');
    } catch (error) {
      console.error('❌ Error saving portfolio:', error);
      throw error;
    }
  },

  // Migrate data from localStorage to Supabase
  async migrateFromLocalStorage(userId: string): Promise<boolean> {
    try {
      console.log('🔄 Checking for localStorage data to migrate...');
      
      // Check if user already has a portfolio in Supabase
      const existingPortfolio = await this.loadPortfolio(userId);
      if (existingPortfolio && (
        existingPortfolio.assets.length > 0 || 
        existingPortfolio.coindepo_holdings.length > 0 || 
        existingPortfolio.loans.length > 0
      )) {
        console.log('ℹ️ User already has portfolio data in Supabase, skipping migration');
        return false;
      }

      // Try to load from localStorage
      const localAssets = localStorage.getItem('cdp-assets');
      const localCoindepo = localStorage.getItem('cdp-coindepo-holdings');
      const localLoans = localStorage.getItem('cdp-loans');
      const localCurrency = localStorage.getItem('cdp-selected-currency');
      const localPayout = localStorage.getItem('cdp-extra-payout-enabled');

      if (!localAssets && !localCoindepo && !localLoans) {
        console.log('ℹ️ No localStorage data found to migrate');
        return false;
      }

      // Migrate the data
      const portfolioData: PortfolioData = {
        assets: localAssets ? JSON.parse(localAssets) : [],
        coindepo_holdings: localCoindepo ? JSON.parse(localCoindepo) : [],
        loans: localLoans ? JSON.parse(localLoans) : [],
        settings: {
          selected_currency: localCurrency || 'USD',
          extra_payout_enabled: localPayout === 'true'
        }
      };

      await this.savePortfolio(userId, portfolioData);
      
      console.log('✅ Successfully migrated localStorage data to Supabase');
      return true;
    } catch (error) {
      console.error('❌ Error migrating from localStorage:', error);
      return false;
    }
  }
};

