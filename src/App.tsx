import { CreateStablecoin } from "./components/CreateStablecoin";
import { Features } from "./components/Features";
import { Header } from "./components/Header";
import { StablecoinList } from "./components/StablecoinList";

function App() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-900 to-black text-white">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Create Your Own Stablecoin
          </h1>
          <p className="text-gray-400 text-center text-lg mb-16 max-w-2xl mx-auto">
            Launch your custom stablecoin backed by yield-bearing Stablebonds.
            Earn passive income while maintaining stability.
          </p>

          <Features />
          
          <div className="space-y-12">
            <CreateStablecoin />
            
            <div>
              <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Your Stablecoins
              </h2>
              <StablecoinList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
