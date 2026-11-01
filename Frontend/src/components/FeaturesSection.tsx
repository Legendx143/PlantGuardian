import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { 
  ShieldCheck, 
  Sprout, 
  Search, 
  Activity, 
  Droplets, 
  HeartHandshake, 
  Mic, 
  MapPin, 
  Layers, 
  FlaskConical, 
  CloudRain, 
  Bug, 
  Compass
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const plantGuardianFeatures = [
    {
      icon: Search,
      title: 'Disease Detection',
      desc: 'Identify probable diseases from plant images and symptoms.',
    },
    {
      icon: Activity,
      title: 'Symptom Analysis',
      desc: 'Understand visible signs of plant stress.',
    },
    {
      icon: Droplets,
      title: 'Nutrient Insights',
      desc: 'Explore possible nutrient deficiencies and their causes.',
    },
    {
      icon: HeartHandshake,
      title: 'Treatment Guidance',
      desc: 'Get practical recovery and prevention recommendations.',
    },
    {
      icon: Mic,
      title: 'Voice Input',
      desc: 'Describe plant problems using speech.',
    },
  ];

  const farmingGuidanceFeatures = [
    {
      icon: Sprout,
      title: 'Crop-Specific Plans',
      desc: 'Get guidance tailored to your chosen crop.',
    },
    {
      icon: MapPin,
      title: 'Location & Season',
      desc: 'Adapt recommendations to regional and seasonal conditions.',
    },
    {
      icon: Layers,
      title: 'Soil Intelligence',
      desc: 'Receive soil-aware cultivation guidance.',
    },
    {
      icon: FlaskConical,
      title: 'Nutrient Management',
      desc: 'Plan manure and fertilizer applications.',
    },
    {
      icon: CloudRain,
      title: 'Irrigation Planning',
      desc: 'Understand crop water requirements.',
    },
    {
      icon: Bug,
      title: 'Pest Management',
      desc: 'Explore preventive and integrated pest management practices.',
    },
    {
      icon: Compass,
      title: 'Step-by-Step Roadmap',
      desc: 'Follow cultivation guidance from land preparation to harvest.',
    },
  ];

  return (
    <section id="features" className="pt-32 pb-24 sm:pt-40 sm:pb-32 relative bg-transparent min-h-screen flex items-center justify-center border-t border-white/10">
      <div className="section-wrapper w-full">
        
        {/* Section Header with smooth upward reveal */}
        <RevealOnScroll distance={45} delay={50}>
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <span className="section-badge font-semibold shadow-md">Features</span>
            <h2 className="section-title">
              Intelligent Tools for <span>Plants & Farming</span>
            </h2>
            <p className="section-desc mx-auto font-medium" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
              Comprehensive artificial intelligence designed to diagnose individual plants and guide regional crop cultivation.
            </p>
          </div>
        </RevealOnScroll>

        {/* Stacked Compact Transparent Glass Panels with upward reveal */}
        <div className="space-y-10 max-w-5xl mx-auto">
          
          {/* Module 1: Plant Guardian */}
          <RevealOnScroll distance={55} delay={120}>
            <div className="botanical-glass-card p-6 sm:p-9 rounded-3xl">
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-white/15">
              <div className="w-12 h-12 rounded-2xl bg-[#c7ea6b]/20 border border-[#c7ea6b]/40 flex items-center justify-center text-[#c7ea6b] shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 
                  className="font-serif text-2xl sm:text-3xl font-semibold text-white"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95)' }}
                >
                  Plant Guardian
                </h3>
                <p 
                  className="text-sm sm:text-base font-semibold text-[#c7ea6b] mt-0.5"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                >
                  AI-powered plant health analysis
                </p>
              </div>
            </div>

            {/* Compact 2-Column Grid to reduce horizontal length */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plantGuardianFeatures.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="botanical-glass-item p-4 sm:p-5 rounded-2xl flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#c7ea6b]/20 border border-[#c7ea6b]/40 flex items-center justify-center text-[#c7ea6b] shrink-0 mt-0.5 shadow-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 
                        className="text-base sm:text-lg font-bold text-white mb-1 tracking-normal"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95)' }}
                      >
                        {item.title}
                      </h4>
                      <p 
                        className="text-sm sm:text-[0.95rem] text-[#e8f3e6] leading-relaxed font-normal"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </RevealOnScroll>

          {/* Module 2: Farming Guidance */}
          <RevealOnScroll distance={55} delay={180}>
            <div className="botanical-glass-card p-6 sm:p-9 rounded-3xl">
              <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-white/15">
                <div className="w-12 h-12 rounded-2xl bg-[#34d399]/20 border border-[#34d399]/40 flex items-center justify-center text-[#34d399] shadow-md">
                  <Sprout className="w-6 h-6" />
                </div>
                <div>
                  <h3 
                    className="font-serif text-2xl sm:text-3xl font-semibold text-white"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95)' }}
                  >
                    Farming Guidance
                  </h3>
                  <p 
                    className="text-sm sm:text-base font-semibold text-[#34d399] mt-0.5"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    Personalized crop cultivation planning
                  </p>
                </div>
              </div>

              {/* Compact 2-Column Grid to reduce horizontal length */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {farmingGuidanceFeatures.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="botanical-glass-item p-4 sm:p-5 rounded-2xl flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#34d399]/20 border border-[#34d399]/40 flex items-center justify-center text-[#34d399] shrink-0 mt-0.5 shadow-sm">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 
                          className="text-base sm:text-lg font-bold text-white mb-1 tracking-normal"
                          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95)' }}
                        >
                          {item.title}
                        </h4>
                        <p 
                          className="text-sm sm:text-[0.95rem] text-[#e8f3e6] leading-relaxed font-normal"
                          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </RevealOnScroll>

        </div>

      </div>
    </section>
  );
};
