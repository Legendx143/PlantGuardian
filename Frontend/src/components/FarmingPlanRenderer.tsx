import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles,
  Sprout,
  Droplets,
  FlaskConical,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PointItem {
  label: string;
  value: string;
  subItems?: string[];
}

interface ParsedSection {
  title: string;
  icon: string;
  intro?: string;
  points: PointItem[];
}

interface ParsedPlan {
  intro: string;
  sections: ParsedSection[];
  outro: string;
}

function parseFarmingGuideText(rawText: string): ParsedPlan {
  if (!rawText) return { intro: '', sections: [], outro: '' };

  const text = rawText.replace(/\r\n/g, '\n');
  const rawSections = text.split(/(?:^|\n)(?=#{1,4}\s+|(?:\d+\.\s*)?[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}])/u);

  let intro = '';
  let outro = '';
  const sections: ParsedSection[] = [];

  for (let i = 0; i < rawSections.length; i++) {
    const chunk = rawSections[i].trim();
    if (!chunk) continue;

    const isSection = /^(?:#{1,4}\s+|(?:\d+\.\s*)?[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}])/u.test(chunk);

    if (!isSection && sections.length === 0) {
      intro += (intro ? ' ' : '') + chunk.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      continue;
    }

    if (!isSection && sections.length > 0) {
      outro += (outro ? ' ' : '') + chunk.replace(/\*\*/g, '');
      continue;
    }

    const firstNewline = chunk.indexOf('\n');
    const headerLine = firstNewline !== -1 ? chunk.substring(0, firstNewline).trim() : chunk.trim();
    let body = firstNewline !== -1 ? chunk.substring(firstNewline).trim() : '';

    const outroMatch = body.match(/\n\s*(With the proper adherence[\s\S]*|Good luck[\s\S]*|In conclusion[\s\S]*|Happy farming[\s\S]*)$/i);
    if (outroMatch) {
      outro = outroMatch[1].trim().replace(/\*\*/g, '');
      body = body.substring(0, body.length - outroMatch[0].length).trim();
    }

    const emojiMatch = headerLine.match(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}])/u);
    const icon = emojiMatch ? emojiMatch[1] : '🌱';
    const cleanTitle = headerLine
      .replace(/^#{1,4}\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '')
      .replace(/\*\*/g, '')
      .trim();

    const points: PointItem[] = [];
    let sectionIntro = '';

    const normalizedBody = body.replace(/([^\n])\s+(\d+\.\s+\*\*)/g, '$1\n$2');
    const lines = normalizedBody.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const l of lines) {
      const pointMatch = l.match(/^(?:(?:\d+\.|\-|\*)\s*)?\*\*([^*]+)\*\*[:\-]?\s*(.*)$/);
      if (pointMatch) {
        const label = pointMatch[1].replace(/[:\-]+$/, '').trim();
        const value = pointMatch[2].trim();

        const subItems = value
          .split(/\s+-\s+/)
          .map((s) => s.replace(/^\-\s*/, '').replace(/\*\*/g, '').trim())
          .filter(Boolean);

        points.push({
          label,
          value: value.replace(/\*\*/g, ''),
          subItems: subItems.length > 1 ? subItems : undefined
        });
      } else if (/^[\-\*]\s+/.test(l)) {
        points.push({
          label: '',
          value: l.replace(/^[\-\*]\s+/, '').replace(/\*\*/g, '').trim()
        });
      } else if (/^\d+\.\s+/.test(l)) {
        points.push({
          label: '',
          value: l.replace(/^\d+\.\s+/, '').replace(/\*\*/g, '').trim()
        });
      } else {
        if (points.length === 0) {
          sectionIntro += (sectionIntro ? ' ' : '') + l.replace(/\*\*/g, '');
        } else {
          points[points.length - 1].value += ' ' + l.replace(/\*\*/g, '');
        }
      }
    }

    sections.push({
      title: cleanTitle,
      icon,
      intro: sectionIntro,
      points
    });
  }

  return { intro, sections, outro };
}

// Fallback icon selector if needed
function getSectionLucideIcon(title: string, defaultEmoji: string) {
  const t = title.toLowerCase();
  if (t.includes('soil') || t.includes('land')) return <Layers className="w-5 h-5 text-[#c7ea6b]" />;
  if (t.includes('sowing') || t.includes('plant')) return <Sprout className="w-5 h-5 text-[#c7ea6b]" />;
  if (t.includes('water') || t.includes('irrigat')) return <Droplets className="w-5 h-5 text-[#38bdf8]" />;
  if (t.includes('fertil') || t.includes('nutri')) return <FlaskConical className="w-5 h-5 text-[#c7ea6b]" />;
  if (t.includes('pest') || t.includes('prevent') || t.includes('disease')) return <ShieldCheck className="w-5 h-5 text-[#34d399]" />;
  if (t.includes('milestone') || t.includes('harvest') || t.includes('timeline')) return <Calendar className="w-5 h-5 text-[#facc15]" />;
  return <span className="text-lg">{defaultEmoji}</span>;
}

interface FarmingPlanRendererProps {
  guideText: string;
  cropName?: string;
  soilType?: string;
  season?: string;
}

export const CROP_IMAGES: Record<string, { src: string; title: string }> = {
  // Existing crops
  tomato: { src: '/images/tomato.jpg', title: 'Tomato (Solanum lycopersicum)' },
  potato: { src: '/images/potato.jpg', title: 'Potato (Solanum tuberosum)' },
  apple: { src: '/images/apple.jpg', title: 'Apple (Malus domestica)' },
  grape: { src: '/images/grape.jpg', title: 'Grape (Vitis vinifera)' },
  corn: { src: '/images/corn.jpg', title: 'Corn / Maize (Zea mays)' },
  maize: { src: '/images/corn.jpg', title: 'Corn / Maize (Zea mays)' },
  rice: { src: '/images/rice.jpg', title: 'Rice / Paddy (Oryza sativa)' },
  paddy: { src: '/images/rice.jpg', title: 'Rice / Paddy (Oryza sativa)' },
  wheat: { src: '/images/wheat.jpg', title: 'Wheat (Triticum aestivum)' },
  cotton: { src: '/images/cotton.jpg', title: 'Cotton (Gossypium)' },
  mango: { src: '/images/mango.jpg', title: 'Mango (Mangifera indica)' },
  banana: { src: '/images/banana.jpg', title: 'Banana (Musa)' },
  chilli: { src: '/images/chilli.jpg', title: 'Chilli / Pepper (Capsicum annuum)' },
  pepper: { src: '/images/pepper.jpg', title: 'Chilli / Pepper (Capsicum annuum)' },
  capsicum: { src: '/images/chilli.jpg', title: 'Chilli / Pepper (Capsicum annuum)' },

  // 10 Newly Added Crops
  brinjal: { src: '/images/brinjal.jpg', title: 'Brinjal / Eggplant (Solanum melongena)' },
  eggplant: { src: '/images/eggplant.jpg', title: 'Brinjal / Eggplant (Solanum melongena)' },
  melongena: { src: '/images/eggplant.jpg', title: 'Brinjal / Eggplant (Solanum melongena)' },
  aubergine: { src: '/images/eggplant.jpg', title: 'Brinjal / Eggplant (Solanum melongena)' },

  cabbage: { src: '/images/cabbage.jpg', title: 'Cabbage (Brassica oleracea)' },
  oleracea: { src: '/images/cabbage.jpg', title: 'Cabbage (Brassica oleracea)' },

  cauliflower: { src: '/images/cauliflower.jpg', title: 'Cauliflower (Brassica oleracea var. botrytis)' },
  botrytis: { src: '/images/cauliflower.jpg', title: 'Cauliflower (Brassica oleracea var. botrytis)' },

  strawberry: { src: '/images/strawberry.jpg', title: 'Strawberry (Fragaria × ananassa)' },
  fragaria: { src: '/images/strawberry.jpg', title: 'Strawberry (Fragaria × ananassa)' },
  ananassa: { src: '/images/strawberry.jpg', title: 'Strawberry (Fragaria × ananassa)' },

  soybean: { src: '/images/soybean.jpg', title: 'Soybean (Glycine max)' },
  soya: { src: '/images/soybean.jpg', title: 'Soybean (Glycine max)' },
  glycine: { src: '/images/soybean.jpg', title: 'Soybean (Glycine max)' },

  sugarcane: { src: '/images/sugarcane.jpg', title: 'Sugarcane (Saccharum officinarum)' },
  'sugar cane': { src: '/images/sugarcane.jpg', title: 'Sugarcane (Saccharum officinarum)' },
  saccharum: { src: '/images/sugarcane.jpg', title: 'Sugarcane (Saccharum officinarum)' },

  onion: { src: '/images/onion.jpg', title: 'Onion (Allium cepa)' },
  cepa: { src: '/images/onion.jpg', title: 'Onion (Allium cepa)' },

  garlic: { src: '/images/garlic.jpg', title: 'Garlic (Allium sativum)' },
  sativum: { src: '/images/garlic.jpg', title: 'Garlic (Allium sativum)' },

  cucumber: { src: '/images/cucumber.jpg', title: 'Cucumber (Cucumis sativus)' },
  cucumis: { src: '/images/cucumber.jpg', title: 'Cucumber (Cucumis sativus)' },

  papaya: { src: '/images/papaya.jpg', title: 'Papaya (Carica papaya)' },
  carica: { src: '/images/papaya.jpg', title: 'Papaya (Carica papaya)' },

  // Final 5 Crops
  'lemon / citrus': { src: '/images/lemon.jpg', title: 'Lemon / Citrus (Citrus limon)' },
  lemon: { src: '/images/lemon.jpg', title: 'Lemon / Citrus (Citrus limon)' },
  citrus: { src: '/images/citrus.jpg', title: 'Lemon / Citrus (Citrus limon)' },
  limon: { src: '/images/lemon.jpg', title: 'Lemon / Citrus (Citrus limon)' },

  guava: { src: '/images/guava.jpg', title: 'Guava (Psidium guajava)' },
  psidium: { src: '/images/guava.jpg', title: 'Guava (Psidium guajava)' },

  spinach: { src: '/images/spinach.jpg', title: 'Spinach (Spinacia oleracea)' },
  spinacia: { src: '/images/spinach.jpg', title: 'Spinach (Spinacia oleracea)' },

  rose: { src: '/images/rose.jpg', title: 'Rose (Rosa)' },
  rosa: { src: '/images/rose.jpg', title: 'Rose (Rosa)' },

  marigold: { src: '/images/marigold.jpg', title: 'Marigold (Tagetes)' },
  tagetes: { src: '/images/marigold.jpg', title: 'Marigold (Tagetes)' },
};

export function getCropImage(name?: string): { src: string; title: string } {
  if (!name) return CROP_IMAGES.tomato;
  const clean = name.toLowerCase().trim();
  // Sort keys by descending length so more specific matches (e.g. 'cauliflower') take precedence over shorter substrings
  const sortedKeys = Object.keys(CROP_IMAGES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean.includes(key)) {
      return CROP_IMAGES[key];
    }
  }
  return CROP_IMAGES.tomato;
}

export const FarmingPlanRenderer: React.FC<FarmingPlanRendererProps> = ({
  guideText,
  cropName,
  soilType,
  season
}) => {
  const [copied, setCopied] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  const { intro, sections, outro } = parseFarmingGuideText(guideText);
  const cropImageInfo = getCropImage(cropName);

  const toggleSection = (index: number) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(guideText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (sections.length === 0) {
    // Graceful fallback if unstructured
    return (
      <div className="p-5 rounded-2xl bg-black/40 border border-white/15 max-h-[540px] overflow-y-auto text-xs sm:text-sm text-white/90 leading-relaxed whitespace-pre-line space-y-3">
        {guideText}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1 text-left custom-scrollbar">
      {/* Top Advisory Summary Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#142817] to-[#0c1c11] border border-[#c7ea6b]/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c7ea6b]/20 border border-[#c7ea6b]/40 flex items-center justify-center text-[#c7ea6b] shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-[#c7ea6b]" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#c7ea6b] mb-0.5">
              Personalized Agronomic Advisory
            </div>
            <p className="text-xs text-white/80 leading-snug">
              {intro || `Comprehensive guide tailored for ${cropName || 'your crop'} in ${soilType || 'selected soil'} (${season || 'current season'}).`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="self-end sm:self-auto px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-xs text-white/90 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Copy full advisory plan"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#c7ea6b]" />
              <span className="text-[#c7ea6b] font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-white/70" />
              <span>Copy Plan</span>
            </>
          )}
        </button>
      </div>

      {/* Structured Section Cards */}
      <div className="space-y-3.5">
        {/* Phase 1 Visual Image placed directly above the Phase 1 text box with 13px vertical gap */}
        <div className="flex justify-center" style={{ marginBottom: '13px' }}>
          <div 
            className="relative rounded-2xl overflow-hidden border border-[#c7ea6b]/35 shadow-lg group"
            style={{ maxWidth: '540px', width: '100%' }}
          >
            <img 
              src={cropImageInfo.src} 
              alt={`${cropImageInfo.title} - Phase 1: Suitability & Climate Feasibility`} 
              className="w-full h-auto block rounded-2xl group-hover:scale-[1.02] transition-transform duration-500" 
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {sections.map((sec, idx) => {
          const isCollapsed = collapsedSections[idx];

          return (
            <div 
              key={idx}
              className="rounded-2xl border border-white/15 bg-black/40 hover:border-[#c7ea6b]/40 transition-all shadow-md overflow-hidden"
              style={idx === 0 ? { marginTop: '0px' } : undefined}
            >
              {/* Card Header */}
              <div 
                onClick={() => toggleSection(idx)}
                className="px-4 py-3.5 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors border-b border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#0f2413] border border-[#c7ea6b]/30 flex items-center justify-center shrink-0">
                    {getSectionLucideIcon(sec.title, sec.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#c7ea6b]/15 text-[#c7ea6b] border border-[#c7ea6b]/30">
                        Phase {idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-serif font-bold text-white tracking-wide">
                        {sec.title}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/50">
                  <span className="text-[11px] hidden sm:inline">
                    {sec.points.length} {sec.points.length === 1 ? 'guideline' : 'guidelines'}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-[#c7ea6b]" />
                  )}
                </div>
              </div>

              {/* Card Content & Points */}
              {!isCollapsed && (
                <div className="p-4 space-y-3 animate-fade-in bg-black/20">
                  {/* Optional Section Intro Description */}
                  {sec.intro && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs sm:text-sm text-white/85 leading-relaxed">
                      {sec.intro}
                    </div>
                  )}

                  {/* Individual Points */}
                  <div className="space-y-2.5">
                    {sec.points.map((point, pIdx) => (
                      <div 
                        key={pIdx}
                        className="p-3 rounded-xl bg-[#0c1a0f]/90 border border-white/10 hover:border-[#c7ea6b]/30 transition-all"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-[#c7ea6b] mt-1.5 shrink-0 shadow-[0_0_8px_#c7ea6b]" />
                          <div className="flex-1 text-xs sm:text-sm">
                            {point.label && (
                              <span className="font-semibold text-[#c7ea6b] block sm:inline sm:mr-2">
                                {point.label}:
                              </span>
                            )}
                            <span className="text-white/90 leading-relaxed">
                              {point.subItems ? point.value.split(/\s+-\s+/)[0] : point.value}
                            </span>

                            {/* Sub-items list if present */}
                            {point.subItems && point.subItems.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-[#c7ea6b]/30 space-y-1.5">
                                {point.subItems.map((sub, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-2 text-xs text-white/80">
                                    <span className="text-[#c7ea6b] font-bold text-xs">›</span>
                                    <span>{sub}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Outro / Sign-off Footer */}
      {outro && (
        <div className="p-4 rounded-2xl bg-[#0a180d] border border-[#c7ea6b]/40 shadow-inner flex items-center gap-3 text-xs sm:text-sm text-[#e2ecd9]">
          <CheckCircle2 className="w-5 h-5 text-[#c7ea6b] shrink-0" />
          <p className="leading-relaxed">{outro}</p>
        </div>
      )}
    </div>
  );
};
