import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from "./components/Header";
import { Features } from "./components/Features";
import { CreateStablecoin } from "./components/CreateStablecoin";
import { StablecoinList } from "./components/StablecoinList";

function App() {
  const [stablecoins, setStablecoins] = useState([]);

  const addStablecoin = (newStablecoin) => {
    setStablecoins((prevStablecoins) => [...prevStablecoins, newStablecoin]);
  };

  return (
    <div className="min-h-screen bg-[#111111]">
      <Header />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Create Your Own Stablecoin
              </h1>
              <p className="text-gray-400">
                Launch your custom stablecoin backed by yield-bearing Stablebonds
              </p>
            </div>
            <Link 
              to="/stablecoins"
              className="bg-[#1C1C1C] border border-[#CDFE00] text-[#CDFE00] px-6 py-3 rounded-lg 
                         hover:bg-[#CDFE00] hover:text-black transition-all flex items-center gap-2 whitespace-nowrap"
            >
              View All Stablecoins
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <Features />
          
          <div className="space-y-12">
            <CreateStablecoin addStablecoin={addStablecoin} />
            <StablecoinList stablecoins={stablecoins} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
