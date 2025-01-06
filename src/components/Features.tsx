import { Shield, TrendingUp, Coins } from 'lucide-react';

export const Features = () => {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-16">
      {[
        {
          icon: <Shield className="w-8 h-8 text-[#CDFE00]" />,
          title: "Secure Backing",
          description: "Every stablecoin is fully backed by yield-bearing Stablebonds",
          stats: "100% Collateralized"
        },
        {
          icon: <TrendingUp className="w-8 h-8 text-[#CDFE00]" />,
          title: "Earn Yield",
          description: "Generate passive income from underlying Stablebonds",
          stats: "Up to 13% APY"
        },
        {
          icon: <Coins className="w-8 h-8 text-[#CDFE00]" />,
          title: "Custom Stablecoins",
          description: "Create and manage your own stablecoins",
          stats: "Multiple currencies"
        }
      ].map((feature, i) => (
        <div 
          key={i}
          className="bg-[#1C1C1C] rounded-lg border border-[#2A2A2A] p-6 hover:border-[#3A3A3A] transition-all"
        >
          <div className="bg-black/40 w-fit p-3 rounded-lg mb-4">
            {feature.icon}
          </div>
          <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
          <p className="text-gray-400 text-sm mb-4">
            {feature.description}
          </p>
          <div className="text-[#CDFE00] text-sm font-medium">
            {feature.stats}
          </div>
        </div>
      ))}
    </div>
  );
};