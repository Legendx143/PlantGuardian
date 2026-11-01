import React from 'react';
import { TreePine, Globe, Sprout, Heart, Leaf, Sun } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface AboutSectionProps {
  onOpenGetStarted?: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = () => {
  const missions = [
    {
      icon: TreePine,
      title: 'Save Trees, Save Lives',
      desc: 'Protect the green foundation of life.',
    },
    {
      icon: Globe,
      title: 'Fight Deforestation',
      desc: 'Turn environmental awareness into action.',
    },
    {
      icon: Sprout,
      title: 'Encourage Tree Planting',
      desc: 'Make every planting a step toward a greener planet.',
    },
    {
      icon: Heart,
      title: 'Nurture Every Plant',
      desc: 'Help plants grow healthier with intelligent care guidance.',
    },
    {
      icon: Leaf,
      title: 'Promote Sustainable Farming',
      desc: 'Encourage responsible cultivation and better resource management.',
    },
    {
      icon: Sun,
      title: 'Grow a Greener Tomorrow',
      desc: 'Inspire individuals and communities to protect our planet.',
    },
  ];

  return (
    <section 
      id="about" 
      className="pt-28 pb-24 sm:pt-36 sm:pb-32 relative bg-transparent min-h-screen flex flex-col justify-center scroll-mt-20"
    >
      <div className="section-wrapper w-full">
        
        {/* Section Header with smooth upward reveal */}
        <RevealOnScroll distance={45} delay={50}>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
            <span className="section-badge font-semibold shadow-md">About PlantGuardian</span>
            <h2 
              className="section-title"
              style={{ textShadow: '0 3px 6px rgba(0, 0, 0, 0.95), 0 8px 24px rgba(0, 0, 0, 0.9)' }}
            >
              Save Trees. Save Lives. <span>Grow a Greener Future.</span>
            </h2>
            <p 
              className="section-desc mx-auto text-base sm:text-lg text-[#edf5eb] font-medium"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}
            >
              Deforestation is a growing environmental challenge. Our mission is to inspire people to plant more trees, care for nature, and build a greener, healthier world for future generations.
            </p>
          </div>
        </RevealOnScroll>

        {/* 6 Mission Pillars Grid with satisfying staggered upward slide */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto">
          {missions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <RevealOnScroll
                key={idx}
                distance={55}
                delay={100 + idx * 75}
                className="h-full"
              >
                <div
                  className="botanical-glass-card h-full p-6 sm:p-7 rounded-2xl flex flex-col justify-start gap-4 hover:-translate-y-1.5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#c7ea6b]/20 border border-[#c7ea6b]/40 flex items-center justify-center text-[#c7ea6b] shrink-0 shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 
                      className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight"
                      style={{ 
                        textShadow: '0 2px 5px rgba(0,0,0,0.95)'
                      }}
                    >
                      {item.title}
                    </h3>
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
    </section>
  );
};
