import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const CreateStablecoin = () => {
  const { publicKey } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    currency: 'USD',
    icon: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // TODO: Implement stablecoin creation using Etherfuse SDK
      toast.success('Stablecoin created successfully!');
    } catch (error) {
      toast.error('Failed to create stablecoin');
      console.error(error);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">Create New Stablecoin</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
            placeholder="My Stablecoin"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
            placeholder="MYUSD"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Target Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="MXN">MXN</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Icon URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="flex-1 bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
              placeholder="https://example.com/icon"
            />
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2"
              onClick={() => {/* TODO: Implement icon upload */}}
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!publicKey}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Stablecoin
        </button>
      </form>
    </div>
  );
};