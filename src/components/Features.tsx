import { Shield, TrendingUp, Coins } from 'lucide-react';

export const Features = () => {
  return (
    <div className="grid md:grid-cols-3 gap-8 mb-16">
      {[
        {
          icon: <Shield className="w-12 h-12 text-blue-400" />,
          title: "Secure Backing",
          description: "Every stablecoin is fully backed by yield-bearing Stablebonds, ensuring stability and transparency.",
          gradient: "from-blue-500/10 to-blue-500/5"
        },
        {
          icon: <TrendingUp className="w-12 h-12 text-emerald-400" />,
          title: "Earn Yield",
          description: "Generate passive income from the yield on the underlying Stablebonds while maintaining stability.",
          gradient: "from-emerald-500/10 to-emerald-500/5"
        },
        {
          icon: <Coins className="w-12 h-12 text-purple-400" />,
          title: "Custom Stablecoins",
          description: "Create and manage your own stablecoins with custom branding, backed by government bonds.",
          gradient: "from-purple-500/10 to-purple-500/5"
        }
      ].map((feature, i) => (
        <div 
          key={i}
          className={`bg-gradient-to-b ${feature.gradient} p-6 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:translate-y-[-2px]`}
        >
          <div className="bg-gray-900/50 w-fit p-3 rounded-xl mb-4">
            {feature.icon}
          </div>
          <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
          <p className="text-gray-400">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
};