import { Link, NavLink } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { useSession, hasRole } from '../context/SessionContext.jsx';
import ChainSwitcher from './ChainSwitcher.jsx';

export default function Navbar() {
  const { account, setModalOpen, disconnect } = useWallet();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const short = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null;

  const links = [
    ['/', 'Home'],
    ['/marketplace', 'Explore'],
    ['/launchpad', 'Launchpad'],
    ['/gallery', '3D Gallery'],
    ['/create', 'Create'],
  ];

  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu]);

  const onSignOut = async () => {
    setMenu(false);
    await session.signOut();
    disconnect();
  };

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
          <ChainSwitcher />
          {session.status === 'signed_in' && account ? (
            <div className="user-menu" ref={menuRef}>
              <button className="btn btn-ghost" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                {short}
              </button>
              {menu && (
                <div className="menu glass" role="menu">
                  <Link role="menuitem" to="/dashboard" onClick={() => setMenu(false)}>Dashboard</Link>
                  {hasRole(session.role, 'CREATOR') && (
                    <Link role="menuitem" to="/studio" onClick={() => setMenu(false)}>Creator studio</Link>
                  )}
                  {hasRole(session.role, 'MODERATOR') && (
                    <Link role="menuitem" to="/review" onClick={() => setMenu(false)}>Review queue</Link>
                  )}
                  <button role="menuitem" onClick={onSignOut} disabled={session.busy}>Sign out</button>
                </div>
              )}
            </div>
          ) : account ? (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)} title="Finish signing in">
              Sign in
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
