import React, { useState, useEffect, useRef } from 'react';
import { Sprout, Menu, X, ArrowRight, LogOut, Activity, Mail, History } from 'lucide-react';
import { HistoryDrawer } from './HistoryDrawer';

interface NavbarProps {
  onOpenGetStarted: (mode?: 'signup' | 'signin') => void;
  user?: { email: string; name?: string } | null;
  onLogout?: () => void;
  onGoToDashboard?: () => void;
  currentView?: 'landing' | 'dashboard';
  activeDashboardTab?: 'detector' | 'farming';
  onSelectDashboardTab?: (tab: 'detector' | 'farming') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenGetStarted,
  user,
  onLogout,
  onGoToDashboard,
  currentView = 'landing',
  activeDashboardTab = 'detector',
  onSelectDashboardTab
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);

      const sections = ['home', 'about', 'features', 'how-it-works'];
      const current = sections.find((sec) => {
        const el = document.getElementById(sec);
        if (el) {
          const rect = el.getBoundingClientRect();
          return rect.top <= 200 && rect.bottom >= 200;
        }
        return false;
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleSelectTab = (tab: 'detector' | 'farming') => {
    setMobileMenuOpen(false);
    if (onSelectDashboardTab) {
      onSelectDashboardTab(tab);
    }
    if (onGoToDashboard) {
      onGoToDashboard();
    }
  };

  // Get the first letter of the email for the avatar circle
  const avatarLetter = user?.email ? user.email.charAt(0).toUpperCase() : '?';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-2.5 sm:py-3.5 transition-all duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Floating Frosted Pill Nav */}
        <div
          className={`w-full flex items-center justify-between px-4 sm:px-7 py-2.5 sm:py-3 rounded-full transition-all duration-500 ${
            scrolled
              ? 'border border-white/20 shadow-2xl shadow-black/50'
              : 'border border-white/30 shadow-xl'
          }`}
          style={{
            backgroundColor: scrolled ? 'rgba(12, 22, 14, 0.92)' : 'rgba(15, 27, 17, 0.78)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          {/* Brand Logo on Left */}
          <a
            href="#home"
            onClick={(e) => {
              if (user && onGoToDashboard) {
                e.preventDefault();
                onGoToDashboard();
              } else {
                scrollToSection(e, 'home');
              }
            }}
            className="flex items-center gap-2.5 text-white font-medium group cursor-pointer no-underline"
            style={{ textDecoration: 'none' }}
          >
            <img 
              src="/logo.png" 
              alt="PlantGuardian Logo" 
              className="w-8 h-8 rounded-full object-cover shadow-[0_0_12px_rgba(199,234,107,0.4)] group-hover:scale-105 transition-transform duration-300"
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                minHeight: '32px',
                maxWidth: '32px',
                maxHeight: '32px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <span className="text-lg font-semibold tracking-tight text-white/95" style={{ textDecoration: 'none' }}>
              PlantGuardian
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {user ? (
              /* When logged in: Show the 2 requested options in the Navbar */
              <div className="flex items-center gap-2 p-1 rounded-full bg-black/40 border border-white/15">
                <button
                  type="button"
                  onClick={() => handleSelectTab('detector')}
                  className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeDashboardTab === 'detector' && currentView === 'dashboard'
                      ? 'bg-[#c7ea6b] text-[#142816] shadow-md font-bold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Disease Detector</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTab('farming')}
                  className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeDashboardTab === 'farming' && currentView === 'dashboard'
                      ? 'bg-[#c7ea6b] text-[#142816] shadow-md font-bold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5" />
                  <span>Farming Guidance</span>
                </button>
              </div>
            ) : (
              /* When logged out: Landing page links */
              [
                { id: 'home', label: 'Home' },
                { id: 'about', label: 'About' },
                { id: 'features', label: 'Features' },
                { id: 'how-it-works', label: 'How It Works' },
              ].map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => scrollToSection(e, link.id)}
                  className={`text-sm font-medium transition-all duration-200 relative py-1 no-underline ${
                    activeSection === link.id
                      ? 'text-[#c7ea6b] font-semibold'
                      : 'text-white/80 hover:text-white'
                  }`}
                  style={{ textDecoration: 'none', borderBottom: 'none' }}
                >
                  {link.label}
                </a>
              ))
            )}
          </nav>

          {/* Action / User State Area & History on the Right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                {/* History Section Button (Right side of Navbar) */}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/85 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#c7ea6b]/40 transition-all cursor-pointer shadow-sm active:scale-95 group"
                  title="View your past analysis records"
                >
                  <History className="w-3.5 h-3.5 text-[#c7ea6b] group-hover:rotate-[-20deg] transition-transform" />
                  <span>History</span>
                </button>

                <div className="relative" ref={profileMenuRef}>
                  {/* User Avatar Circle — shows first letter of email */}
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((open) => !open)}
                    aria-expanded={profileMenuOpen}
                    aria-label="Open account menu"
                    className="w-9 h-9 rounded-full bg-[#c7ea6b] text-[#183615] font-bold text-sm border-2 border-white/20 shadow-md hover:scale-105 transition-transform cursor-pointer flex items-center justify-center"
                    title={`Signed in as ${user.email}`}
                  >
                    {avatarLetter}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileMenuOpen && (
                    <div 
                      className="absolute right-0 top-12 w-72 overflow-hidden rounded-2xl border border-white/15 shadow-2xl animate-fade-in"
                      style={{
                        backgroundColor: '#09160b',
                        opacity: 1,
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {/* User Info Section */}
                      <div className="px-4 py-3.5 border-b border-white/10">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#c7ea6b] mb-2">
                          Signed in as
                        </div>
                        <div className="flex items-center gap-2.5">
                          {/* Mini avatar */}
                          <div className="w-8 h-8 rounded-full bg-[#c7ea6b]/20 border border-[#c7ea6b]/40 flex items-center justify-center text-[#c7ea6b] font-bold text-xs shrink-0">
                            {avatarLetter}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-white/90 font-medium truncate flex items-center gap-1.5">
                              <Mail className="w-3 h-3 shrink-0 text-[#c7ea6b]/70" />
                              {user.email}
                            </span>
                            <span className="text-[10px] text-white/40 mt-0.5">PlantGuardian Member</span>
                          </div>
                        </div>
                      </div>

                      {/* Sign Out Button */}
                      <button
                        type="button"
                        onClick={() => { 
                          setProfileMenuOpen(false); 
                          onLogout?.(); 
                        }}
                        className="w-full px-4 py-3 text-left text-xs font-semibold text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenGetStarted('signin')}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenGetStarted('signup')}
                  className="btn-lime text-xs sm:text-sm font-semibold !py-2 !px-5 rounded-full flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white/90 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden mt-3 max-w-sm mx-auto rounded-2xl p-5 border border-white/20 shadow-2xl animate-fade-in text-center"
          style={{
            backgroundColor: 'rgba(18, 34, 21, 0.95)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div className="flex flex-col gap-4">
            {user ? (
              <div className="flex flex-col gap-3">
                {/* Mobile user info */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="w-9 h-9 rounded-full bg-[#c7ea6b] text-[#183615] font-bold text-sm flex items-center justify-center shrink-0">
                    {avatarLetter}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs text-[#c7ea6b] font-semibold">Signed in as</span>
                    <span className="text-xs text-white/80 font-mono truncate">{user.email}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTab('detector')}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                    activeDashboardTab === 'detector'
                      ? 'bg-[#c7ea6b] text-[#142816]'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Disease Detector</span>
                </button>

                <button
                  onClick={() => handleSelectTab('farming')}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                    activeDashboardTab === 'farming'
                      ? 'bg-[#c7ea6b] text-[#142816]'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <Sprout className="w-4 h-4" />
                  <span>Farming Guidance</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsHistoryOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10"
                >
                  <History className="w-4 h-4 text-[#c7ea6b]" />
                  <span>Analysis History</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full py-2 rounded-xl text-red-300 text-sm hover:bg-red-500/10 transition-colors mt-2 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'about', label: 'About' },
                  { id: 'features', label: 'Features' },
                  { id: 'how-it-works', label: 'How It Works' },
                ].map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={(e) => scrollToSection(e, link.id)}
                    className={`text-base font-medium py-2 rounded-lg transition-colors no-underline ${
                      activeSection === link.id
                        ? 'bg-white/15 text-[#c7ea6b]'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                    style={{ textDecoration: 'none' }}
                  >
                    {link.label}
                  </a>
                ))}

                <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenGetStarted('signin');
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white/90 bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenGetStarted('signup');
                    }}
                    className="btn-lime w-full justify-center !py-2.5 text-sm"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* History Drawer Modal */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        userEmail={user?.email}
        activeTab={activeDashboardTab}
      />
    </header>
  );
};
