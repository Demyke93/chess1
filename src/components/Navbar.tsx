
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { Menu, X } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-chess-dark border-b border-chess-brown py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl text-chess-accent font-bold">♔ ChessStake</span>
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-white"
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-white hover:text-chess-accent transition-colors">
            Home
          </Link>
          <Link to="/matches" className="text-white hover:text-chess-accent transition-colors">
            Matches
          </Link>
          <Link to="/leaderboard" className="text-white hover:text-chess-accent transition-colors">
            Leaderboard
          </Link>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/profile" className="flex items-center">
                <div className="bg-chess-brown rounded-full w-8 h-8 flex items-center justify-center mr-2">
                  <span className="text-white">{user.avatar || '♟'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white">{user.username}</span>
                  <span className="text-chess-accent">{user.balance} coins</span>
                </div>
              </Link>
              <Button variant="outline" onClick={() => logout()}>
                Logout
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="default">Login</Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-chess-dark mt-2 px-4 py-2 border-t border-chess-brown">
          <Link to="/" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Home
          </Link>
          <Link to="/matches" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Matches
          </Link>
          <Link to="/leaderboard" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Leaderboard
          </Link>
          
          {user ? (
            <div className="py-2">
              <Link to="/profile" className="flex items-center py-2" onClick={toggleMobileMenu}>
                <div className="bg-chess-brown rounded-full w-8 h-8 flex items-center justify-center mr-2">
                  <span className="text-white">{user.avatar || '♟'}</span>
                </div>
                <div>
                  <div className="text-white">{user.username}</div>
                  <div className="text-chess-accent">{user.balance} coins</div>
                </div>
              </Link>
              <Button variant="outline" onClick={() => { logout(); toggleMobileMenu(); }} className="w-full mt-2">
                Logout
              </Button>
            </div>
          ) : (
            <Link to="/login" onClick={toggleMobileMenu} className="block py-2">
              <Button variant="default" className="w-full">Login</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};
