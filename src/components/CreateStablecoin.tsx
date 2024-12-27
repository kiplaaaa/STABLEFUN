import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StablebondProgram } from '@etherfuse/stablebond-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
export const CreateStablecoin = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    currency: 'USD',
    icon: '',
    bondMint: ''
  });
  const [availableBonds, setAvailableBonds] = useState<any[]>([]);

  useEffect(() => {
    const fetchBonds = async () => {
      if (!connection) return;
      try {
        const bonds = await StablebondProgram.getBonds(connection.rpcEndpoint);
        setAvailableBonds(bonds);
      } catch (error) {
        console.error('Failed to fetch bonds:', error);
      }
    };
    
    fetchBonds();
  }, [connection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const program = new StablebondProgram(connection.rpcEndpoint, {
        publicKey,
        sendTransaction
      });

      // Check if user has access
      const hasAccess = await program.hasAccess();
      if (!hasAccess) {
        throw new Error('You need to have Stablebonds to create stablecoins');
      }

      // Create the stablecoin
      const tx = await program.createStablecoin({
        name: formData.name,
        symbol: formData.symbol,
        bondMint: formData.bondMint,
        iconUrl: formData.icon || undefined
      });

      // Wait for confirmation
      await tx.confirm();
      
      toast.success('Stablecoin created successfully!');
      setFormData({ name: '', symbol: '', currency: 'USD', icon: '', bondMint: '' });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create stablecoin');
    } finally {
      setLoading(false);
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
        
        <div>
          <label className="block text-sm font-medium mb-1">Bond</label>
          <select
            value={formData.bondMint}
            onChange={(e) => setFormData({ ...formData, bondMint: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
            required
          >
            <option value="">Select a bond</option>
            {availableBonds.map((bond, index) => (
              <option key={bond.mint.toString()} value={bond.mint.toString()}>
                {bond.name} ({bond.symbol})
              </option>
            ))}
          </select>
        </div>
        
        <button
          type="submit"
          disabled={!publicKey || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Stablecoin'}
        </button>
      </form>
    </div>
  );
};