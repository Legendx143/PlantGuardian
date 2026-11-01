import React, { useState } from 'react';
import { Heart, Send, Check } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
      }, 3000);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-black/75 backdrop-blur-2xl border-t border-white/15 pt-16 pb-12 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          
          {/* Brand Info (2 cols on lg) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 text-white font-medium mb-4">
              <img 
                src="/logo.png" 
                alt="PlantGuardian Logo" 
                className="w-8 h-8 rounded-full object-cover shadow-[0_0_12px_rgba(199,234,107,0.35)]"
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
              <span className="text-xl font-serif font-bold tracking-tight text-white">
                PlantGuardian
              </span>
            </div>
            
            <p className="text-white/70 text-sm leading-relaxed max-w-sm mb-6">
              Happier plants, greener tomorrows. Harnessing deep learning and organic botany to protect home gardens, houseplants, and regenerative farms worldwide.
            </p>

            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>Crafted for plant lovers</span>
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>with organic-first principles</span>
            </div>
          </div>

          {/* Nav Links Column */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#c7ea6b] mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li>
                <button
                  onClick={() => scrollToSection('home')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('about')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  About PlantGuardian
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* Plant Resources Column */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#c7ea6b] mb-4">
              Botanical Resources
            </h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li className="hover:text-white transition-colors cursor-pointer">
                Pathogen Encyclopedia
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Nutrient Deficiency Index
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Organic Neem & Bio Cures
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Seasonal Agronomy Matrix
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#c7ea6b] mb-4">
              Garden Almanac
            </h4>
            <p className="text-xs text-white/70 leading-relaxed mb-3">
              Receive bi-weekly seasonal watering tips, pest warnings, and potting guides.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#c7ea6b] transition-colors"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#c7ea6b] text-[#132616] hover:bg-[#d9f782] transition-colors flex items-center justify-center cursor-pointer"
                >
                  {subscribed ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3 h-3" />}
                </button>
              </div>
              {subscribed && (
                <div className="text-[11px] text-[#c7ea6b] flex items-center gap-1 animate-fade-in">
                  <span>Subscribed! Welcome to the garden community.</span>
                </div>
              )}
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div>
            © {new Date().getFullYear()} PlantGuardian. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-white/80 transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-white/80 transition-colors cursor-pointer">
              Terms of Service
            </span>
            <span className="hover:text-white/80 transition-colors cursor-pointer">
              Ecological Pledge
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
