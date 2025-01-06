import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react';

const DUMMY_STABLECOINS = [
  {
    mint: "usd1",
    name: "USD Stablecoin",
    symbol: "USDS",
    currency: "USD",
    icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    supply: 1000000,
    bondMint: "bond123",
    apy: "8.5",
    tokensAvailable: 800000,
    costPerToken: 1.0001,
    startDate: "1/2/2025, 10 PM",
    tvl: "$2,463,256"
  },
  {
    mint: "eur1",
    name: "Euro Stablecoin",
    symbol: "EURS",
    currency: "EUR",
    icon: "https://cryptologos.cc/logos/stasis-euro-eurs-logo.png",
    supply: 750000,
    bondMint: "bond456",
    apy: "7.2",
    tokensAvailable: 600000,
    costPerToken: 1.0002,
    startDate: "1/2/2025, 11 PM",
    tvl: "€1,222,401"
  },
  // Add more dummy stablecoins as needed...
];

export const StablecoinsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('All');

  const filteredStablecoins = DUMMY_STABLECOINS.filter(coin => {
    const matchesSearch = coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coin.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCurrency = selectedCurrency === 'All' || coin.currency === selectedCurrency;
    return matchesSearch && matchesCurrency;
  });

  const currencies = ['All', ...new Set(DUMMY_STABLECOINS.map(coin => coin.currency))];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-400 hover:text-[#CDFE00] transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-xl font-medium text-white">Explore Stablecoins</h1>
            </div>
            
            {/* Right side - Search and Filter */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search stablecoins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 bg-gray-800/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white 
                           border border-gray-700 focus:border-[#CDFE00] focus:ring-1 focus:ring-[#CDFE00] 
                           transition-all outline-none"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="appearance-none bg-gray-800/50 rounded-xl pl-4 pr-10 py-2 text-sm text-white
                           border border-gray-700 focus:border-[#CDFE00] focus:ring-1 focus:ring-[#CDFE00] 
                           transition-all outline-none cursor-pointer"
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStablecoins.map((coin) => (
            <div key={coin.mint} 
                 className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6 
                          hover:border-[#CDFE00]/50 transition-all duration-300">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-white">{coin.symbol}</h3>
                    <span className="px-2 py-0.5 bg-gray-800 rounded-md text-xs text-gray-400">
                      {coin.currency}
                    </span>
                  </div>
                  <div className="text-[#CDFE00] text-sm font-medium">
                    {coin.apy}% APY
                  </div>
                </div>
                <div className="bg-black/40 p-2 rounded-xl">
                  <img src={coin.icon} alt={coin.name} className="w-10 h-10" />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">TVL</div>
                  <div className="text-white font-medium">{coin.tvl}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Available</div>
                  <div className="text-white font-medium">{coin.tokensAvailable.toLocaleString()}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Cost/Token</div>
                  <div className="text-white font-medium">{coin.currency} {coin.costPerToken.toFixed(4)}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Start Date</div>
                  <div className="text-white font-medium text-sm">{coin.startDate}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 bg-gray-800 text-[#CDFE00] font-medium py-2.5 px-4 rounded-lg
                                 border border-[#CDFE00] hover:bg-[#CDFE00] hover:text-black transition-all">
                  BOND DETAILS
                </button>
                <button className="flex-1 bg-[#CDFE00] text-black font-medium py-2.5 px-4 rounded-lg
                                 hover:bg-[#b8e400] transition-all">
                  SELECT
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}; 