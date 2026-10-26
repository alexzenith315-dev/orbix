import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useWallet } from '../context/WalletContext.jsx';

export default function Navbar() {
  const { account, setModalOpen, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const short = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null;
  const links = [
    ['/', 'Home'],
    ['/marketplace', 'Explore'],
    ['/gallery', '3D Gallery'],
    ['/create', 'Create'],
    ['/creator/nova.eth', 'Profile'],
  ];
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true" />
          ORBIX
        </Link>
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          {account ? (
            <button className="btn btn-ghost" onClick={disconnect} title="Disconnect">
              {short}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              Connect wallet
            </button>
          )}
          <button
            className="burger"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
