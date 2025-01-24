import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from "./components/Header";
import { Features } from "./components/Features";
import { CreateStablecoin } from "./components/CreateStablecoin";
import { StablecoinList } from "./components/StablecoinList";

function App() {
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([]);
  interface Stablecoin {
    name: string;
    symbol: string;
    value: number;
  }
  const addStablecoin = (newStablecoin: Stablecoin) => {
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
          </div>

          <Features />
          
          <div className="space-y-12">
            <CreateStablecoin addStablecoin={(newStablecoin: any) => addStablecoin(newStablecoin as any)} />
            <StablecoinList stablecoins={stablecoins as any} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
