import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext.jsx';
import { SessionProvider } from './context/SessionContext.jsx';
import Navbar from './components/Navbar.jsx';
import WalletModal from './components/WalletModal.jsx';
import Home from './pages/Home.jsx';
import Marketplace from './pages/Marketplace.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import Create from './pages/Create.jsx';
import Creator from './pages/Creator.jsx';
import Gallery from './pages/Gallery.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Launchpad from './pages/Launchpad.jsx';
import LaunchpadDetail from './pages/LaunchpadDetail.jsx';
import Studio from './pages/Studio.jsx';
import Review from './pages/Review.jsx';
import CreateToken from './pages/CreateToken.jsx';
import TokenPage from './pages/Token.jsx';

function NotFound() {
  return (
    <main className="section">
      <div className="empty glass">
        <h1>Page not found</h1>
        <Link to="/" className="btn btn-primary">Go home</Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <SessionProvider>
        <BrowserRouter>
          <a className="skip" href="#main">Skip to content</a>
          <Navbar />
          <div id="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/create" element={<Create />} />
              <Route path="/creator/:handle" element={<Creator />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/launchpad" element={<Launchpad />} />
              <Route path="/launchpad/:slug" element={<LaunchpadDetail />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/review" element={<Review />} />
              <Route path="/create-token" element={<CreateToken />} />
              <Route path="/token/:address" element={<TokenPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <footer className="footer">
            <span>ORBIX · testnet preview</span>
            <span className="muted small">Sample data only. Not financial advice.</span>
          </footer>
          <WalletModal />
        </BrowserRouter>
      </SessionProvider>
    </WalletProvider>
  );
}
