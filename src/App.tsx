import { Header } from "./components/Header";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">
            Create Your Own Stablecoin
          </h1>
          <p className="text-gray-400 text-center mb-12">
            Launch your custom stablecoin backed by yield-bearing Stablebonds.
            Earn passive income while maintaining stability.
          </p>
          
          <h2 className="text-2xl font-bold mb-6">Your Stablecoins</h2>
        </div>
      </main>
    </div>
  )
}

export default App;
