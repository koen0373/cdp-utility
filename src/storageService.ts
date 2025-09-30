// Storage Service - Hybrid approach with IndexedDB and localStorage fallback
// Solves iPhone localStorage issues while maintaining compatibility

interface StorageData {
  'portfolio-rows': any[];
  'coindepo-holdings': any[];
  'portfolio-loans': any[];
  [key: string]: any;
}

class StorageService {
  private dbName = 'CDPUtilityDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isIndexedDBAvailable = false;

  constructor() {
    this.initIndexedDB();
  }

  private async initIndexedDB(): Promise<void> {
    try {
      if (!('indexedDB' in window)) {
        console.log('IndexedDB not available, using localStorage fallback');
        return;
      }

      this.db = await this.openDatabase();
      this.isIndexedDBAvailable = true;
      console.log('IndexedDB initialized successfully');
    } catch (error) {
      console.warn('IndexedDB initialization failed, using localStorage fallback:', error);
      this.isIndexedDBAvailable = false;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for each data type
        if (!db.objectStoreNames.contains('portfolio')) {
          const portfolioStore = db.createObjectStore('portfolio', { keyPath: 'key' });
          portfolioStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Unified save method
  async save(key: string, data: any): Promise<void> {
    try {
      if (this.isIndexedDBAvailable && this.db) {
        await this.saveToIndexedDB(key, data);
      } else {
        this.saveToLocalStorage(key, data);
      }
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      // Fallback to localStorage
      this.saveToLocalStorage(key, data);
    }
  }

  // Unified load method
  async load(key: string): Promise<any> {
    try {
      if (this.isIndexedDBAvailable && this.db) {
        return await this.loadFromIndexedDB(key);
      } else {
        return this.loadFromLocalStorage(key);
      }
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      // Fallback to localStorage
      return this.loadFromLocalStorage(key);
    }
  }

  // Unified remove method
  async remove(key: string): Promise<void> {
    try {
      if (this.isIndexedDBAvailable && this.db) {
        await this.removeFromIndexedDB(key);
      } else {
        this.removeFromLocalStorage(key);
      }
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      // Fallback to localStorage
      this.removeFromLocalStorage(key);
    }
  }

  // IndexedDB methods
  private async saveToIndexedDB(key: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['portfolio'], 'readwrite');
      const store = transaction.objectStore('portfolio');
      
      const item = {
        key,
        data,
        timestamp: Date.now()
      };

      const request = store.put(item);

      request.onsuccess = () => {
        console.log(`Saved ${key} to IndexedDB`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromIndexedDB(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['portfolio'], 'readonly');
      const store = transaction.objectStore('portfolio');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          console.log(`Loaded ${key} from IndexedDB`);
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['portfolio'], 'readwrite');
      const store = transaction.objectStore('portfolio');
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log(`Removed ${key} from IndexedDB`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // localStorage methods (fallback)
  private saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`Saved ${key} to localStorage`);
    } catch (error) {
      console.error(`localStorage save failed for ${key}:`, error);
      throw error;
    }
  }

  private loadFromLocalStorage(key: string): any {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        console.log(`Loaded ${key} from localStorage`);
        return JSON.parse(item);
      }
      return null;
    } catch (error) {
      console.error(`localStorage load failed for ${key}:`, error);
      return null;
    }
  }

  private removeFromLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
      console.log(`Removed ${key} from localStorage`);
    } catch (error) {
      console.error(`localStorage remove failed for ${key}:`, error);
    }
  }

  // Migration method to move data from localStorage to IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    if (!this.isIndexedDBAvailable) return;

    const keys = ['portfolio-rows', 'coindepo-holdings', 'portfolio-loans'];
    
    for (const key of keys) {
      try {
        const data = this.loadFromLocalStorage(key);
        if (data) {
          await this.saveToIndexedDB(key, data);
          console.log(`Migrated ${key} from localStorage to IndexedDB`);
        }
      } catch (error) {
        console.error(`Migration failed for ${key}:`, error);
      }
    }
  }

  // Get storage status
  getStorageStatus(): { indexedDB: boolean; localStorage: boolean } {
    return {
      indexedDB: this.isIndexedDBAvailable,
      localStorage: this.isLocalStorageAvailable()
    };
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
}

// Create singleton instance
export const storageService = new StorageService();

// Export types
export type { StorageData };
