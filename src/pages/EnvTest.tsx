import React from 'react';

export const EnvTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">VITE_SUPABASE_URL:</h3>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded">
              {import.meta.env.VITE_SUPABASE_URL || '❌ NOT SET'}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">VITE_SUPABASE_ANON_KEY:</h3>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
                `✓ SET (${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 30)}...)` : 
                '❌ NOT SET'
              }
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">All import.meta.env:</h3>
            <pre className="font-mono text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(import.meta.env, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

