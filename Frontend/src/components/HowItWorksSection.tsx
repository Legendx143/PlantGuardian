import React from 'react';
import { UploadCloud, Cpu, Sparkles, Sliders, FileText, CheckCircle2 } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const HowItWorksSection: React.FC = () => {
  const plantGuardianSteps = [
    {
      step: '01',
      icon: UploadCloud,
      title: 'Describe & Upload',
      desc: 'Enter symptoms and upload an image of your plant.',
    },
    {
      icon: Cpu,
      step: '02',
      title: 'AI Analysis',
      desc: 'Analyze visual symptoms and reported information to identify probable issues.',
    },
    {
      step: '03',
      icon: Sparkles,
      title: 'Get Guidance',
      desc: 'Explore possible causes, nutrient deficiencies, and recommended next steps.',
    },
  ];

  const farmingGuidanceSteps = [
    {
      step: '01',
      icon: Sliders,
      title: 'Enter Details',
      desc: 'Select your crop, location, season, and soil type.',
    },
    {
      step: '02',
      icon: FileText,
      title: 'Generate Your Plan',
      desc: 'AI combines your inputs with relevant agricultural knowledge.',
    },
    {
      step: '03',
      icon: CheckCircle2,
      title: 'Grow Smarter',
      desc: 'Follow a structured cultivation plan covering soil preparation, nutrients, irrigation, and crop care.',
    },
  ];

  return (
    <section 
      id="how-it-works" 
      className="pt-36 pb-24 sm:pt-44 sm:pb-32 relative bg-transparent min-h-screen flex flex-col justify-center border-t border-white/10 scroll-mt-20"
    >
      <div className="section-wrapper w-full">
        
        {/* Section Header with smooth upward reveal */}
        <RevealOnScroll distance={45} delay={50}>
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <span className="section-badge font-semibold shadow-md">How It Works</span>
            <h2 
              className="section-title"
              style={{ textShadow: '0 3px 6px rgba(0, 0, 0, 0.95), 0 8px 24px rgba(0, 0, 0, 0.9)' }}
            >
              Simple <span>Step-by-Step</span> Workflows
            </h2>
            <p 
              className="section-desc mx-auto text-base sm:text-lg text-[#edf5eb] font-medium"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}
            >
              Whether diagnosing a single struggling leaf or planning a seasonal crop, get structured guidance in three easy steps.
            </p>
          </div>
        </RevealOnScroll>

        <div className="max-w-6xl mx-auto">
          
          {/* Workflow 1: Plant Guardian */}
          <div className="mb-16 sm:mb-20">
            <RevealOnScroll distance={30} delay={80}>
              <div 
                className="inline-flex items-center px-4 py-2 rounded-xl mb-5 border border-white/20 shadow-lg"
                style={{
                  background: 'rgba(9, 22, 12, 0.90)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                }}
              >
                <h3 
                  className="font-serif text-lg sm:text-xl font-bold text-white tracking-tight"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95)' }}
                >
                  Plant Guardian Workflow
                </h3>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {plantGuardianSteps.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <RevealOnScroll
                    key={idx}
                    distance={55}
                    delay={120 + idx * 80}
                    className="h-full"
                  >
                    <div
                      className="botanical-glass-card h-full p-6 sm:p-7 rounded-2xl flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <div className="w-12 h-12 rounded-xl bg-[#c7ea6b]/20 border border-[#c7ea6b]/40 flex items-center justify-center text-[#c7ea6b] shrink-0 shadow-sm">
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="font-mono text-lg sm:text-xl font-bold text-[#c7ea6b] bg-[#c7ea6b]/15 border border-[#c7ea6b]/30 px-3 py-1 rounded-lg shadow-inner">
                            {item.step}
                          </span>
                        </div>
                        <h4 
                          className="text-lg sm:text-xl font-bold text-white mb-2 tracking-normal"
                          style={{ 
                            textShadow: '0 2px 4px rgba(0,0,0,0.95)',
                          }}
                        >
                          {item.title}
                        </h4>
                        <p 
                          className="text-sm sm:text-base text-[#e5f2e3] leading-relaxed font-normal"
                          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>

          {/* Workflow 2: Farming Guidance */}
          <div className="pt-12 sm:pt-16 border-t border-white/15">
            <RevealOnScroll distance={30} delay={80}>
              <div 
                className="inline-flex items-center px-4 py-2 rounded-xl mb-5 border border-white/20 shadow-lg"
                style={{
                  background: 'rgba(9, 22, 12, 0.90)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                }}
              >
                <h3 
                  className="font-serif text-lg sm:text-xl font-bold text-white tracking-tight"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95)' }}
                >
                  Farming Guidance Workflow
                </h3>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {farmingGuidanceSteps.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <RevealOnScroll
                    key={idx}
                    distance={55}
                    delay={120 + idx * 80}
                    className="h-full"
                  >
                    <div
                      className="botanical-glass-card h-full p-6 sm:p-7 rounded-2xl flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <div className="w-12 h-12 rounded-xl bg-[#34d399]/20 border border-[#34d399]/40 flex items-center justify-center text-[#34d399] shrink-0 shadow-sm">
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="font-mono text-lg sm:text-xl font-bold text-[#34d399] bg-[#34d399]/15 border border-[#34d399]/30 px-3 py-1 rounded-lg shadow-inner">
                            {item.step}
                          </span>
                        </div>
                        <h4 
                          className="text-lg sm:text-xl font-bold text-white mb-2 tracking-normal"
                          style={{ 
                            textShadow: '0 2px 4px rgba(0,0,0,0.95)',
                          }}
                        >
                          {item.title}
                        </h4>
                        <p 
                          className="text-sm sm:text-base text-[#e5f2e3] leading-relaxed font-normal"
                          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
