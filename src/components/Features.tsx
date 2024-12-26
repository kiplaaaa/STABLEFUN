import { Shield, TrendingUp, Coins } from 'lucide-react';

export const Features = () => {
  return (
    <div className="grid md:grid-cols-3 gap-8 mb-16">
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <Shield className="w-12 h-12 text-blue-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Secure Backing</h3>
        <p className="text-gray-400">
          Every stablecoin is fully backed by yield-bearing Stablebonds, ensuring
          stability and transparency.
        </p>
      </div>
      
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <TrendingUp className="w-12 h-12 text-emerald-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Earn Yield</h3>
        <p className="text-gray-400">
          Generate passive income from the yield on the underlying Stablebonds
          while maintaining stability.
        </p>
      </div>
      
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <Coins className="w-12 h-12 text-purple-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Custom Stablecoins</h3>
        <p className="text-gray-400">
          Create and manage your own stablecoins with custom branding, backed by
          government bonds.
        </p>
      </div>
    </div>
  );
};