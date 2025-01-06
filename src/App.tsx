import { CreateStablecoin } from "./components/CreateStablecoin";
import { Features } from "./components/Features";
import { Header } from "./components/Header";
import { StablecoinList } from "./components/StablecoinList";

function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-3xl font-medium mb-2">
                Create Your Own Stablecoin
              </h1>
              <p className="text-gray-400">
                Launch your custom stablecoin backed by yield-bearing Stablebonds
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Total Value Locked</div>
              <div className="text-2xl font-medium text-[#CDFE00]">$34,798,793</div>
            </div>
          </div>

          <Features />
          
          <div className="space-y-12">
            <CreateStablecoin />
            <StablecoinList />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
