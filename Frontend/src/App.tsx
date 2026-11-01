import React, { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { Footer } from './components/Footer';
import { ModalGetStarted } from './components/ModalGetStarted';
import { DashboardView } from './components/DashboardView';
import { supabase } from './lib/supabase';

interface User {
  email: string;
  name?: string;
}

export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'signup' | 'signin'>('signup');
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');
  const [activeDashboardTab, setActiveDashboardTab] = useState<'detector' | 'farming'>('detector');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const heroCardRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll-driven card scale & parallax animation:
  // Satisfying & optimal 120 FPS scroll-driven card scale animation:
  // As user scrolls down from Home, the Hero section scales down and recedes with 3D depth,
  // while the About section slides smoothly UP AND OVER it with its rounded sheet curvature and drop shadow.
  // The positive parallax resistance guarantees About continuously overlaps Hero so no black gap can ever appear.
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || window.pageYOffset;
          const vh = window.innerHeight || 800;
          const range = vh * 0.85;
          const progress = Math.min(1, Math.max(0, scrollY / range));

          if (heroCardRef.current) {
            // Smooth quadratic ease-out curve
            const ease = 1 - Math.pow(1 - progress, 2);
            // Scale smoothly from 1.0 down to 0.88
            const scale = 1 - ease * 0.12;
            // Parallax resistance translation (moves up slower than 1x scroll, letting About overlap)
            const clampedScroll = Math.min(range, scrollY);
            const translateY = clampedScroll * 0.42;
            // Smoothly round corners up to 36px as it recedes into a card
            const borderRadius = ease * 36;

            heroCardRef.current.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
            heroCardRef.current.style.borderRadius = `${borderRadius.toFixed(1)}px`;
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);


  // Restore session from localStorage or Supabase Auth
  useEffect(() => {
    // 1. Check local session cache from backend auth
    const cachedUser = localStorage.getItem('plantguardian_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed?.email) {
          setUser({ email: parsed.email, name: parsed.name || parsed.email.split('@')[0] });
          setCurrentView('dashboard');
        }
      } catch {}
    }

    if (!supabase) return;

    const applySession = (session: Session | null) => {
      const email = session?.user.email;
      if (email) {
        setUser({ email, name: typeof session.user.user_metadata.full_name === 'string' ? session.user.user_metadata.full_name : undefined });
        setCurrentView('dashboard');
      } else if (!localStorage.getItem('plantguardian_user')) {
        setUser(null);
        setCurrentView('landing');
      }
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  // The profile record is published to Supabase Realtime. This keeps the
  // app's primary user output (email) synchronized with database changes.
  useEffect(() => {
    if (!supabase || !user?.email) return;
    const client = supabase;

    const channel = client
      .channel(`user-profile:${user.email}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `email=eq.${user.email}`,
        },
        (payload) => {
          const updatedEmail = payload.new.email;
          if (typeof updatedEmail === 'string') {
            setUser((current) => (current ? { ...current, email: updatedEmail } : current));
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user?.email]);

  // When a past diagnosis is selected from History drawer, ensure dashboard view & detector tab are active
  useEffect(() => {
    const handleLoadDiagnosis = () => {
      setCurrentView('dashboard');
      setActiveDashboardTab('detector');
    };
    window.addEventListener('load_diagnosis', handleLoadDiagnosis);
    return () => window.removeEventListener('load_diagnosis', handleLoadDiagnosis);
  }, []);

  // When a past farming plan is selected from History drawer, ensure dashboard view & farming tab are active
  useEffect(() => {
    const handleLoadFarmingPlan = () => {
      setCurrentView('dashboard');
      setActiveDashboardTab('farming');
    };
    window.addEventListener('load_farming_plan', handleLoadFarmingPlan);
    return () => window.removeEventListener('load_farming_plan', handleLoadFarmingPlan);
  }, []);

  // Mouse position tracking for particle interaction
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Floating leaves & spores particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Leaves
    const leaves = Array.from({ length: 22 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.2 + Math.random() * 0.8,
      vx: 0.7 + Math.random() * 0.9,
      vy: 0.25 + Math.random() * 0.5,
      size: 11 + Math.random() * 12,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: 0.015 + Math.random() * 0.025,
      rotSpeedY: 0.02 + Math.random() * 0.03,
      rotSpeedZ: 0.01 + Math.random() * 0.015,
      flutterPhase: Math.random() * Math.PI * 2,
      type: Math.floor(Math.random() * 4),
      opacity: 0.6 + Math.random() * 0.35,
    }));

    // Spores / glowing motes
    const spores = Array.from({ length: 42 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 1.2 + Math.random() * 2.2,
      vx: 0.2 + Math.random() * 0.4,
      vy: -0.15 + (Math.random() - 0.5) * 0.3,
      baseAlpha: 0.2 + Math.random() * 0.5,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03,
    }));

    // Wind streaks
    const windStreaks = [
      { x: -200, y: height * 0.25, length: 280, speed: 2.2, curve: 35, alpha: 0.18 },
      { x: -400, y: height * 0.52, length: 340, speed: 2.8, curve: -45, alpha: 0.15 },
      { x: -600, y: height * 0.78, length: 260, speed: 2.4, curve: 25, alpha: 0.12 },
    ];

    let windGust = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const render = (time: number) => {
      windGust = Math.sin(time * 0.0007) * 0.45 + Math.sin(time * 0.0017) * 0.2;
      const mouse = mousePosRef.current;
      const mouseDx = mouse.x - prevMouseX;
      const mouseDy = mouse.y - prevMouseY;
      prevMouseX = mouse.x;
      prevMouseY = mouse.y;

      ctx.clearRect(0, 0, width, height);

      // Render wind streaks
      ctx.lineWidth = 1.5;
      for (const streak of windStreaks) {
        streak.x += streak.speed + Math.max(0, windGust);
        if (streak.x > width + 300) {
          streak.x = -streak.length - Math.random() * 300;
          streak.y = height * (0.15 + Math.random() * 0.75);
        }
        const grad = ctx.createLinearGradient(streak.x, streak.y, streak.x + streak.length, streak.y);
        grad.addColorStop(0, 'rgba(254, 240, 138, 0)');
        grad.addColorStop(0.5, `rgba(214, 245, 120, ${streak.alpha})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(streak.x, streak.y);
        ctx.quadraticCurveTo(streak.x + streak.length * 0.5, streak.y + streak.curve, streak.x + streak.length, streak.y);
        ctx.stroke();
      }

      // Render spores
      const sunCenterX = width * 0.22;
      const sunCenterY = height * 0.15;
      for (const s of spores) {
        s.x += s.vx + Math.max(0, windGust * 0.5);
        s.y += s.vy + Math.sin(time * 0.001 + s.pulsePhase) * 0.2;
        s.pulsePhase += s.pulseSpeed;
        if (s.x > width + 20) s.x = -20;
        if (s.y < -20) s.y = height + 10;
        if (s.y > height + 20) s.y = -10;

        const dx = s.x - sunCenterX;
        const dy = s.y - sunCenterY;
        const inBeam = dx > -50 && dy > -50 && Math.abs(dx - dy * 1.3) < width * 0.45;
        const boost = inBeam ? 1.8 : 1.0;
        const alpha = Math.min(1, (s.baseAlpha + Math.sin(s.pulsePhase) * 0.25) * boost);

        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * (inBeam ? 1.25 : 1), 0, Math.PI * 2);
        if (inBeam) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#fef08a';
          ctx.fillStyle = `rgba(255, 255, 220, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(214, 245, 120, ${alpha * 0.6})`;
        }
        ctx.fill();
        ctx.restore();
      }

      // Render floating leaves
      for (const l of leaves) {
        const drift = l.vx * (0.8 + l.z * 0.5);
        l.x += drift + windGust;
        l.flutterPhase += 0.035;
        l.y += l.vy + Math.sin(l.flutterPhase) * 0.75;
        l.rotX += l.rotSpeedX;
        l.rotY += l.rotSpeedY;
        l.rotZ += l.rotSpeedZ;

        // Mouse repelling interaction
        const mdx = l.x - mouse.x;
        const mdy = l.y - mouse.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (dist < 150) {
          const force = (1 - dist / 150) * 1.8;
          l.x += (mouseDx * 0.08 + (mdx / dist) * 1.2) * force;
          l.y += (mouseDy * 0.08 + (mdy / dist) * 1.2) * force;
          l.rotSpeedX += force * 0.005;
          l.rotSpeedY += force * 0.005;
        }

        if (l.x > width + 60) {
          l.x = -50 - Math.random() * 40;
          l.y = Math.random() * height * 0.9;
        }
        if (l.y > height + 50) {
          l.y = -40;
          l.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.rotZ);
        const scaleX = Math.cos(l.rotY);
        const scaleY = Math.cos(l.rotX);
        const s = l.size * (0.7 + l.z * 0.5);
        ctx.scale(scaleX, scaleY);

        const isBack = scaleX * scaleY < 0;
        ctx.globalAlpha = l.opacity * (0.55 + l.z * 0.45);

        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.65, -s * 0.5, s * 0.75, s * 0.4, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.4, -s * 0.65, -s * 0.5, 0, -s);
        ctx.closePath();

        if (isBack) {
          ctx.fillStyle = l.type === 1 ? '#d6ce93' : '#b7dcad';
        } else {
          ctx.fillStyle =
            l.type === 0
              ? '#a3e635'
              : l.type === 1
              ? '#facc15'
              : l.type === 2
              ? '#84cc16'
              : '#4ade80';
        }
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -s * 0.85);
        ctx.lineTo(0, s * 0.85);
        ctx.strokeStyle = isBack ? 'rgba(255,255,255,0.4)' : 'rgba(254, 240, 138, 0.65)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleOpenGetStarted = (mode: 'signup' | 'signin' = 'signup') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    localStorage.removeItem('plantguardian_token');
    localStorage.removeItem('plantguardian_user');
    await supabase?.auth.signOut().catch(() => {});
    setUser(null);
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-[#071008] text-white selection:bg-[#c7ea6b] selection:text-[#142816]">
      {/* Dynamic Floating Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-[15]"
      />

      {/* Top Floating Glass Navigation Bar */}
      <Navbar
        onOpenGetStarted={handleOpenGetStarted}
        user={user}
        onLogout={handleLogout}
        onGoToDashboard={() => setCurrentView('dashboard')}
        currentView={currentView}
        activeDashboardTab={activeDashboardTab}
        onSelectDashboardTab={(tab) => {
          setActiveDashboardTab(tab);
          setCurrentView('dashboard');
        }}
      />

      {/* Main View Router */}
      {user && currentView === 'dashboard' ? (
        <main className="relative z-10 min-h-[85vh]">
          <DashboardView
            user={user}
            onLogout={handleLogout}
            activeTab={activeDashboardTab}
            onTabChange={setActiveDashboardTab}
          />
        </main>
      ) : (
        <main className="relative z-10">
          {/* 1. Home Section: Shrinking 3D Parallax Card */}
          <div className="relative w-full overflow-hidden bg-[#071008]">
            <div
              ref={heroCardRef}
              className="w-full relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
              style={{
                transformOrigin: 'center 40%',
                willChange: 'transform, border-radius',
                transform: 'translate3d(0, 0px, 0) scale(1)',
              }}
            >
              <HeroSection onOpenGetStarted={() => handleOpenGetStarted('signup')} />
            </div>
          </div>

          {/* 2. The Three Landing Sections: Directly overlaps & glides UP over the shrinking Hero */}
          <div className="relative z-20 w-full overflow-hidden -mt-16 sm:-mt-24 rounded-t-[3rem] sm:rounded-t-[4.5rem] border-t border-[#c7ea6b]/35 shadow-[0_-35px_100px_rgba(0,0,0,0.98),0_-10px_40px_rgba(199,234,107,0.12)]">
            {/* Luminous accent glow along the rounded top edge */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-[2px] pointer-events-none z-30"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(199, 234, 107, 0.7) 0%, rgba(199, 234, 107, 0) 75%)',
                boxShadow: '0 0 20px rgba(199, 234, 107, 0.5)',
              }}
            />

            {/* Static Terrace View Background for About, Features, and How It Works */}
            <div
              className="absolute inset-0 z-0 pointer-events-none terrace-bg-fixed"
              style={{
                backgroundImage: "url('/images/hero_terrace_view.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center 35%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Rich botanical dark glass overlay - Further lightened so the terrace view is more vivid */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(7, 16, 9, 0.50) 0%, rgba(9, 20, 11, 0.30) 18%, rgba(9, 20, 11, 0.30) 82%, rgba(7, 16, 9, 0.58) 100%)',
                }}
              />
            </div>

            {/* The Three Sections Content */}
            <div className="relative z-10">
              <AboutSection onOpenGetStarted={() => handleOpenGetStarted('signup')} />
              <FeaturesSection />
              <HowItWorksSection />
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>

      {/* Authentication Modal */}
      <ModalGetStarted
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={modalMode}
      />
    </div>
  );
};

export default App;
