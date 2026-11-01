import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Heart } from 'lucide-react';

interface HeroSectionProps {
  onOpenGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenGetStarted }) => {
  const [loaded, setLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Trigger smooth satisfying entry animations
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Ensure robust cross-browser autoplay compliance (Brave/Chrome/Safari/iOS)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Explicitly enforce muted on the DOM node for browser autoplay policy compliance
    video.defaultMuted = true;
    video.muted = true;

    const playVideo = () => {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay policy prevented immediate playback until interaction
          });
        }
      }
    };

    playVideo();
    video.addEventListener('loadeddata', playVideo);
    video.addEventListener('canplay', playVideo);

    // Interaction fallback for strict privacy browsers (Brave Shields, low-power mode)
    const handleFirstInteraction = () => {
      playVideo();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('scroll', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('scroll', handleFirstInteraction, { passive: true });

    return () => {
      video.removeEventListener('loadeddata', playVideo);
      video.removeEventListener('canplay', playVideo);
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('scroll', handleFirstInteraction);
    };
  }, []);

  // Performance: Auto-pause offscreen video to preserve GPU rendering power
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.paused) {
            video.play().catch(() => {});
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-28 sm:pt-36 pb-10 sm:pb-14 select-none bg-transparent"
    >
      {/* Background Video for Home Section */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover scale-105"
          poster="/images/hero_terrace_view.jpg"
        >
          <source src="/images/gemini_generated_video_a9242cf8.webm" type="video/webm" />
          <source src="/images/gemini_generated_video_a9242cf8.mp4" type="video/mp4" />
        </video>

        {/* Ambient Dark Botanical Overlay - Light and vivid with no black bands */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(7, 16, 9, 0.10) 0%, rgba(7, 16, 9, 0.05) 40%, rgba(7, 16, 9, 0.20) 80%, rgba(7, 16, 9, 0.35) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 75% at 50% 45%, transparent 0%, rgba(5, 12, 6, 0.15) 100%)',
          }}
        />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 text-center flex flex-col items-center pt-8 sm:pt-14">
        
        {/* 1. Headline: Happier Plants, Greener Tomorrows */}
        <div className="mt-2 sm:mt-4">
          {/* First line: Happier Plants, */}
          <h1
            className="font-serif text-white font-medium text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] tracking-[-0.015em] leading-[1.08] transition-all duration-1000 ease-out"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(28px)',
              filter: loaded ? 'blur(0px)' : 'blur(8px)',
              transitionDelay: '250ms',
              textShadow: '0 3px 6px rgba(0, 0, 0, 0.95), 0 8px 24px rgba(0, 0, 0, 0.9), 0 16px 45px rgba(0, 0, 0, 0.85)',
            }}
          >
            Happier Plants,
          </h1>

          {/* Second line: Greener Tomorrows */}
          <h2
            className="font-serif font-medium text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] tracking-[-0.015em] leading-[1.08] mt-2 sm:mt-2.5 transition-all duration-1000 ease-out"
            style={{
              color: '#d6f578',
              textShadow: '0 3px 6px rgba(0, 0, 0, 0.95), 0 8px 24px rgba(0, 0, 0, 0.9), 0 16px 45px rgba(0, 0, 0, 0.85), 0 0 35px rgba(214, 245, 120, 0.35)',
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(32px)',
              filter: loaded ? 'blur(0px)' : 'blur(8px)',
              transitionDelay: '450ms',
            }}
          >
            Greener Tomorrows
          </h2>
        </div>

        {/* 2. Subtitle description (Increased breathing room below Greener Tomorrows) */}
        <p
          className="mt-7 sm:mt-9 text-base sm:text-lg md:text-xl text-white max-w-2xl font-medium leading-relaxed tracking-normal transition-all duration-1000 ease-out"
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(24px)',
            filter: loaded ? 'blur(0px)' : 'blur(6px)',
            transitionDelay: '650ms',
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.95), 0 4px 16px rgba(0, 0, 0, 0.9)',
          }}
        >
          Get personalized plant care guidance, disease detection, and smart recommendations powered by AI.
        </p>

        {/* 3. Primary Call To Action Button (Get Started ->) */}
        <div
          className="mt-7 sm:mt-8 transition-all duration-1000 ease-out"
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            filter: loaded ? 'blur(0px)' : 'blur(4px)',
            transitionDelay: '850ms',
          }}
        >
          <button
            onClick={onOpenGetStarted}
            className="btn-lime text-base sm:text-lg !py-3.5 !px-8 rounded-full flex items-center gap-2 group cursor-pointer"
            style={{
              boxShadow: '0 10px 30px rgba(199, 234, 107, 0.4), 0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            <span className="font-semibold text-[#183615]">Get Started</span>
            <ArrowRight className="w-5 h-5 text-[#183615] group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>

        {/* 4. Three Feature Badges Floating Below (Enlarged) */}
        <div
          className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-3.5 sm:gap-5 transition-all duration-1000 ease-out"
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '1050ms',
          }}
        >
          {[
            { icon: Sparkles, text: 'Multimodal AI Vision & Voice' },
            { icon: ShieldCheck, text: 'Personal Plant Assistant' },
            { icon: Heart, text: '100% Organic Cures First' },
          ].map((pill, i) => {
            const Icon = pill.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 sm:gap-3 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full hover:scale-105 transition-all duration-300 shadow-lg cursor-default"
                style={{
                  background: 'rgba(10, 24, 13, 0.45)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.95)',
                }}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#c7ea6b] shrink-0" />
                <span className="text-sm sm:text-base font-medium text-white tracking-wide">
                  {pill.text}
                </span>
              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
};
