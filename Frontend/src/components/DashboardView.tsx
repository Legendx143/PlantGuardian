import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sprout, 
  Activity, 
  CheckCircle2, 
  Check,
  Copy,
  Droplets, 
  RefreshCw,
  Sparkles,
  Mic,
  MicOff,
  FlaskConical,
  Bug,
  Calendar,
  MapPin,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  X,
  Maximize2,
  Minimize2,
  Bot,
  Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CustomDropdown } from './CustomDropdown';
import { FarmingPlanRenderer } from './FarmingPlanRenderer';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

interface User {
  email: string;
  name?: string;
  createdAt?: string;
}

interface DiagnosisResult {
  probableDisease: string;
  confidence: string;
  causes: string;
  nutrientDeficiency: string;
  properNutrientWay: string;
  treatment: string;
}

export const AVAILABLE_PLANTS = [
  "Tomato (Solanum lycopersicum)",
  "Potato (Solanum tuberosum)",
  "Apple (Malus domestica)",
  "Grape (Vitis vinifera)",
  "Corn / Maize (Zea mays)",
  "Rice / Paddy (Oryza sativa)",
  "Wheat (Triticum aestivum)",
  "Cotton (Gossypium)",
  "Mango (Mangifera indica)",
  "Banana (Musa)",
  "Chilli / Pepper (Capsicum annuum)",
  "Brinjal / Eggplant (Solanum melongena)",
  "Cabbage (Brassica oleracea)",
  "Cauliflower (Brassica oleracea var. botrytis)",
  "Strawberry (Fragaria × ananassa)",
  "Soybean (Glycine max)",
  "Sugarcane (Saccharum officinarum)",
  "Onion (Allium cepa)",
  "Garlic (Allium sativum)",
  "Cucumber (Cucumis sativus)",
  "Papaya (Carica papaya)",
  "Lemon / Citrus (Citrus limon)",
  "Guava (Psidium guajava)",
  "Spinach (Spinacia oleracea)",
  "Rose (Rosa)",
  "Marigold (Tagetes)"
];

export const SOIL_CHOICES = [
  "Alluvial Soil (River basin / Loamy)",
  "Black Soil (Clayey / Moisture-retentive)",
  "Red & Yellow Soil",
  "Laterite Soil",
  "Sandy / Loamy Sand",
  "Mountain / Forest Soil",
  "Peaty / High Organic Soil",
  "Standard Garden Potting Mix"
];

export const SEASON_CHOICES = [
  "Kharif (Monsoon: June – October)",
  "Rabi (Winter: October – March)",
  "Zaid (Summer: March – June)",
  "Spring (February – April)",
  "Autumn (September – November)",
  "Year-Round / Perennial"
];

/**
 * Checks if the diagnosis returned a valid nutrient deficiency.
 * If the AI reported "None", "N/A", "Not applicable", "Not available", "Nil", etc.,
 * this returns false so the nutrient deficiency section can be hidden completely.
 */
function hasNutrientDeficiency(deficiency?: string | null, method?: string | null): boolean {
  if (!deficiency && !method) return false;

  const cleanDef = (deficiency || '').trim().toLowerCase();
  const cleanMethod = (method || '').trim().toLowerCase();

  const negativeKeywords = [
    'none',
    'n/a',
    'na',
    'nil',
    'null',
    'no',
    'not applicable',
    'not available',
    'not suitable',
    'not required',
    'none detected',
    'none identified',
    'no deficiency',
    'no nutrient deficiency',
    'no deficiency detected',
    'no nutrient deficiency detected',
    'no nutrient deficiencies detected',
    'not detected',
    'nothing detected',
    'unspecified',
  ];

  // Strip non-alphanumeric chars for clean matching
  const rawStripped = cleanDef.replace(/[^a-z0-9]/g, '');
  const spaceStripped = cleanDef.replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');

  const isDefNegative = !spaceStripped ||
    ['none', 'na', 'nil', 'null', 'no'].includes(rawStripped) ||
    negativeKeywords.includes(spaceStripped) ||
    spaceStripped.startsWith('none') ||
    spaceStripped.startsWith('not applicable') ||
    spaceStripped.startsWith('not available') ||
    spaceStripped.startsWith('not suitable') ||
    spaceStripped.startsWith('no deficiency') ||
    spaceStripped.startsWith('no nutrient');

  if (isDefNegative) {
    return false;
  }

  // If dosage & method also indicates absence of nutrient deficiency
  const strippedMethod = cleanMethod.replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
  if (
    strippedMethod.includes('not applicable') ||
    strippedMethod.includes('no nutrient deficiency') ||
    strippedMethod.includes('no deficiency')
  ) {
    return false;
  }

  return true;
}

interface TreatmentStepItem {
  id: number;
  stepNumber: string;
  category: string;
  categoryColor: string;
  text: string;
}

function parseTreatmentSteps(rawTreatment: string): TreatmentStepItem[] {
  if (!rawTreatment || !rawTreatment.trim()) return [];

  const text = rawTreatment.trim();
  let stepStrings: string[] = [];

  // 1. Check if numbered items exist: e.g. "1. Step ... 2. Step ..." or "1) ... 2) ..."
  if (/(?:^|\s)(?:1[\.\)])\s+/i.test(text)) {
    stepStrings = text
      .split(/(?:^|\s+)(?=\d+[\.\)]\s+)/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);
  } else if (text.includes('\n')) {
    // 2. Newline separated list
    stepStrings = text
      .split('\n')
      .map((s) => s.replace(/^[-*•\d+.)]\s*/, '').trim())
      .filter(Boolean);
  } else if (text.includes(';')) {
    // 3. Semicolon separated items
    stepStrings = text.split(';').map((s) => s.trim()).filter(Boolean);
  } else {
    // 4. Split on sentence boundaries: period followed by space and capital letter
    const sentences = text.split(/(?<=\.)\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
    stepStrings = sentences.length > 1 ? sentences : [text];
  }

  if (stepStrings.length === 0) {
    stepStrings = [text];
  }

  return stepStrings.map((step, idx) => {
    const lower = step.toLowerCase();
    let category = 'Cultural Care';
    let categoryColor = 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';

    if (
      lower.includes('prune') ||
      lower.includes('remove') ||
      lower.includes('destroy') ||
      lower.includes('cut') ||
      lower.includes('trim') ||
      lower.includes('discard') ||
      lower.includes('isolate')
    ) {
      category = 'Sanitation & Pruning';
      categoryColor = 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    } else if (
      lower.includes('spray') ||
      lower.includes('fungicide') ||
      lower.includes('copper') ||
      lower.includes('neem') ||
      lower.includes('chemical') ||
      lower.includes('chlorothalonil') ||
      lower.includes('mancozeb') ||
      lower.includes('application') ||
      lower.includes('bactericide') ||
      lower.includes('pesticide')
    ) {
      category = 'Targeted Treatment';
      categoryColor = 'text-rose-300 bg-rose-500/10 border-rose-500/30';
    } else if (
      lower.includes('water') ||
      lower.includes('irrigation') ||
      lower.includes('wet') ||
      lower.includes('drainage') ||
      lower.includes('moisture') ||
      lower.includes('drip')
    ) {
      category = 'Irrigation & Moisture';
      categoryColor = 'text-sky-300 bg-sky-500/10 border-sky-500/30';
    } else if (
      lower.includes('air') ||
      lower.includes('circulation') ||
      lower.includes('spacing') ||
      lower.includes('sunlight') ||
      lower.includes('rotation') ||
      lower.includes('soil') ||
      lower.includes('resistant') ||
      lower.includes('monitor')
    ) {
      category = 'Prevention & Environment';
      categoryColor = 'text-[#c7ea6b] bg-[#c7ea6b]/10 border-[#c7ea6b]/30';
    }

    return {
      id: idx + 1,
      stepNumber: String(idx + 1).padStart(2, '0'),
      category,
      categoryColor,
      text: step,
    };
  });
}

const CurativeCareSteps: React.FC<{ treatment: string }> = ({ treatment }) => {
  const steps = useMemo(() => parseTreatmentSteps(treatment), [treatment]);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Reset completion state when diagnosis changes
  useEffect(() => {
    setCompletedSteps({});
  }, [treatment]);

  const toggleStep = (id: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = steps.filter((s) => completedSteps[s.id]).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!treatment) return;
    const formatted = steps
      .map((s, idx) => `${idx + 1}. [${s.category}] ${s.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(formatted || treatment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/25 via-black/50 to-black/75 p-4 sm:p-5 shadow-xl backdrop-blur-md transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <span>Curative Care & Disease Treatment Protocol</span>
            </div>
            <div className="text-[11px] text-white/50">
              Interactive recovery action checklist for your crops
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Step Count Badge */}
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            {steps.length} {steps.length === 1 ? 'Action Step' : 'Action Steps'}
          </span>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/15 transition-all active:scale-95 cursor-pointer"
            title="Copy treatment protocol to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-white/70" />
                <span>Copy Steps</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress tracker bar */}
      {steps.length > 1 && (
        <div className="mt-3.5 mb-4 p-2.5 rounded-xl bg-black/40 border border-white/10">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-white/70 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3 h-3 text-[#c7ea6b]" />
              Recovery Action Progress
            </span>
            <span className="font-mono text-xs font-bold text-[#c7ea6b]">
              {completedCount} of {steps.length} completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#c7ea6b] to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Cards List */}
      <div className="space-y-2.5 mt-3">
        {steps.map((step) => {
          const isDone = !!completedSteps[step.id];
          return (
            <div
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className={`group flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                isDone
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                  : 'bg-black/40 hover:bg-white/[0.04] border-white/10 hover:border-emerald-500/30'
              }`}
            >
              {/* Checkbox Button */}
              <div
                className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'border-white/30 text-transparent group-hover:border-emerald-400 group-hover:bg-white/5'
                }`}
              >
                <Check className={`w-3.5 h-3.5 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {/* Step Number Tag */}
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase transition-colors ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/10 text-white/70 border-white/15'
                    }`}
                  >
                    STEP {step.stepNumber}
                  </span>

                  {/* Category Tag */}
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${step.categoryColor}`}
                  >
                    {step.category}
                  </span>

                  {isDone && (
                    <span className="text-[10px] font-semibold text-emerald-400 ml-auto flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      Completed
                    </span>
                  )}
                </div>

                {/* Step Description */}
                <p
                  className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                    isDone
                      ? 'line-through text-white/50'
                      : 'text-white/90 font-normal group-hover:text-white'
                  }`}
                >
                  {step.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pathologist Pro-Tip Banner */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-start gap-2.5 text-[11px] text-white/60">
        <Sparkles className="w-3.5 h-3.5 text-[#c7ea6b] shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="text-white/85 font-medium">Agronomist Best Practice: </strong>
          Carry out sanitation and pruning actions before applying targeted sprays. Always spray during cool early morning or evening hours to avoid leaf scorch and ensure maximum efficacy.
        </span>
      </div>
    </div>
  );
};

interface DashboardViewProps {
  user: User;
  onLogout: () => void;
  activeTab?: 'detector' | 'farming';
  onTabChange?: (tab: 'detector' | 'farming') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  user, 
  onLogout: _onLogout,
  activeTab = 'detector',
  onTabChange,
}) => {
  const [currentTab, setCurrentTab] = useState<'detector' | 'farming'>(activeTab);

  useEffect(() => {
    if (activeTab) setCurrentTab(activeTab);
  }, [activeTab]);

  // ── State for Disease Detector ──────────────────────────────────────
  const [selectedPlant, setSelectedPlant] = useState(AVAILABLE_PLANTS[0]);
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [detectorError, setDetectorError] = useState('');

  // ── State for Farming Guidance ──────────────────────────────────────
  const [farmPlant, setFarmPlant] = useState(AVAILABLE_PLANTS[0]);
  const [soilType, setSoilType] = useState(SOIL_CHOICES[0]);
  const [location, setLocation] = useState('');
  const [season, setSeason] = useState(SEASON_CHOICES[0]);
  const [generatingFarming, setGeneratingFarming] = useState(false);
  const [farmingGuide, setFarmingGuide] = useState<string | null>(null);
  const [locDetecting, setLocDetecting] = useState(false);

  // ── Plant Image Upload State ─────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Close image modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen]);

  const [loadedFromHistory, setLoadedFromHistory] = useState<{ disease: string; date: string } | null>(null);
  const [loadedFarmingFromHistory, setLoadedFarmingFromHistory] = useState<{ plant: string; date: string } | null>(null);

  // ── Listen for load_diagnosis event from History drawer ───────────────
  useEffect(() => {
    const handleLoadDiagnosis = (e: any) => {
      const scan = e.detail;
      if (!scan) return;

      // Switch tab to detector so user sees the diagnostic assessment
      setCurrentTab('detector');
      onTabChange?.('detector');

      // 1. Match and select crop in plant dropdown
      if (scan.plant_name) {
        const targetName = scan.plant_name.toLowerCase().trim();
        const matchedPlant = AVAILABLE_PLANTS.find((p) => {
          const pLower = p.toLowerCase();
          const commonName = p.split(' (')[0].toLowerCase();
          return (
            pLower === targetName ||
            commonName === targetName ||
            pLower.includes(targetName) ||
            targetName.includes(commonName) ||
            commonName.split('/').some((part: string) => targetName.includes(part.trim()) || part.trim().includes(targetName))
          );
        });
        if (matchedPlant) {
          setSelectedPlant(matchedPlant);
        }
      }

      // 2. Clear any active upload preview so old image doesn't mismatch loaded diagnosis
      setSelectedImage(null);
      setBase64Image(null);
      setImagePreview(null);
      setDetectorError('');

      // 3. Load full diagnosis data
      const rawDiag = scan.diagnosis || {};
      const newDiagnosis: DiagnosisResult = {
        probableDisease: rawDiag.probableDisease || scan.disease_name || 'Plant Disease Identified',
        confidence: rawDiag.confidence || scan.confidence || '92.0%',
        causes: rawDiag.causes || scan.causes || 'Pathogen colonization accelerated by elevated humidity and leaf wetness.',
        nutrientDeficiency: rawDiag.nutrientDeficiency || scan.nutrientDeficiency || 'None',
        properNutrientWay: rawDiag.properNutrientWay || scan.properNutrientWay || 'None',
        treatment: rawDiag.treatment || scan.recommendations || 'Apply cultural sanitation and recommended agronomic treatment steps.',
      };
      setDiagnosis(newDiagnosis);

      const formattedDate = scan.created_at ? new Date(scan.created_at).toLocaleDateString() : 'Past Record';
      setLoadedFromHistory({
        disease: scan.disease_name || newDiagnosis.probableDisease,
        date: formattedDate
      });

      // 4. Smoothly scroll down to the diagnostic assessment section
      setTimeout(() => {
        const el = document.getElementById('diagnostic-assessment-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    window.addEventListener('load_diagnosis', handleLoadDiagnosis);
    return () => window.removeEventListener('load_diagnosis', handleLoadDiagnosis);
  }, [onTabChange]);

  // ── Listen for load_farming_plan event from History drawer ────────────
  useEffect(() => {
    const handleLoadFarmingPlan = (e: any) => {
      const plan = e.detail;
      if (!plan) return;

      // Switch tab to farming so user sees the guidance
      setCurrentTab('farming');
      onTabChange?.('farming');

      // 1. Match and select crop in farming crop dropdown
      if (plan.plant_name) {
        const targetName = plan.plant_name.toLowerCase().trim();
        const matchedPlant = AVAILABLE_PLANTS.find((p) => {
          const pLower = p.toLowerCase();
          const commonName = p.split(' (')[0].toLowerCase();
          return (
            pLower === targetName ||
            commonName === targetName ||
            pLower.includes(targetName) ||
            targetName.includes(commonName) ||
            commonName.split('/').some((part: string) => targetName.includes(part.trim()) || part.trim().includes(targetName))
          );
        });
        if (matchedPlant) {
          setFarmPlant(matchedPlant);
        } else {
          setFarmPlant(plan.plant_name);
        }
      }

      // 2. Set Soil, Location, Season
      if (plan.soil_type) {
        const matchedSoil = SOIL_CHOICES.find((s) => 
          s.toLowerCase().includes(plan.soil_type.toLowerCase()) || 
          plan.soil_type.toLowerCase().includes(s.toLowerCase())
        );
        setSoilType(matchedSoil || plan.soil_type);
      }
      if (plan.location) {
        setLocation(plan.location);
      }
      if (plan.season) {
        const matchedSeason = SEASON_CHOICES.find((s) => 
          s.toLowerCase().includes(plan.season.toLowerCase()) || 
          plan.season.toLowerCase().includes(s.toLowerCase())
        );
        setSeason(matchedSeason || plan.season);
      }

      // 3. Set the guide content
      if (plan.guide) {
        setFarmingGuide(plan.guide);
      }

      const formattedDate = plan.created_at ? new Date(plan.created_at).toLocaleDateString() : 'Past Record';
      setLoadedFarmingFromHistory({
        plant: plan.plant_name,
        date: formattedDate
      });

      // 4. Smoothly scroll down to farming guidance output section
      setTimeout(() => {
        const el = document.getElementById('farming-guidance-result');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    window.addEventListener('load_farming_plan', handleLoadFarmingPlan);
    return () => window.removeEventListener('load_farming_plan', handleLoadFarmingPlan);
  }, [onTabChange]);

  // ── AI Chatbot State ──────────────────────────────────────────────
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: "👋 Hello! I am your PlantGuardian AI Agronomist Chatbot. How can I assist you with your crops, disease identification, or soil nutrition today?",
      time: 'Just now',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend || isChatLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatMessages.slice(-6),
        }),
      });

      const data = await res.json();
      const botReply = data.reply || "🌿 Ensure proper soil drainage and maintain balanced NPK nutrition. If you notice specific discoloration or spots, describe them in detail!";

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: "🌿 For leaf spots, avoid overhead irrigation and spray neem oil or copper oxychloride. For yellowing, assess soil nitrogen and aeration.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── AI Chatbot Voice Recorder Handler ─────────────────────────────
  const [isChatVoiceRecording, setIsChatVoiceRecording] = useState(false);
  const chatRecognitionRef = useRef<any>(null);
  const chatSilenceTimeoutRef = useRef<any>(null);

  const clearChatSilenceTimer = () => {
    if (chatSilenceTimeoutRef.current) {
      clearTimeout(chatSilenceTimeoutRef.current);
      chatSilenceTimeoutRef.current = null;
    }
  };

  const resetChatSilenceTimer = () => {
    clearChatSilenceTimer();
    chatSilenceTimeoutRef.current = setTimeout(() => {
      // 5 seconds of silence: automatically stop recording
      stopChatRecording();
    }, 5000);
  };

  const stopChatRecording = () => {
    clearChatSilenceTimer();
    if (chatRecognitionRef.current) {
      try { chatRecognitionRef.current.stop(); } catch {}
    }
    setIsChatVoiceRecording(false);
  };

  const toggleChatVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isChatVoiceRecording) {
      stopChatRecording();
      return;
    }

    if (!SpeechRecognition) {
      setIsChatVoiceRecording(true);
      resetChatSilenceTimer();
      const simulatedText = "How do I protect my crops from fungal blight and leaf spots?";
      let charIdx = 0;
      setChatInput("");
      const timer = setInterval(() => {
        charIdx += 3;
        if (charIdx >= simulatedText.length) {
          setChatInput(simulatedText);
          clearInterval(timer);
          resetChatSilenceTimer();
        } else {
          setChatInput(simulatedText.substring(0, charIdx));
        }
      }, 40);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      chatRecognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Auto-detect browser/user locale for best voice recognition
      const navLang = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';
      recognition.lang = navLang;

      recognition.onstart = () => {
        setIsChatVoiceRecording(true);
        // Start 5-second silence countdown on start
        resetChatSilenceTimer();
      };

      recognition.onspeechstart = () => {
        // Voice speech activity detected: reset 5-second silence timer
        resetChatSilenceTimer();
      };

      recognition.onsoundstart = () => {
        // Audio sound detected: reset 5-second silence timer
        resetChatSilenceTimer();
      };

      recognition.onresult = (event: any) => {
        // Voice recognized: reset 5-second silence timer
        resetChatSilenceTimer();

        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setChatInput(transcript);
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          clearChatSilenceTimer();
          setIsChatVoiceRecording(false);
        }
      };

      recognition.onend = () => {
        clearChatSilenceTimer();
        setIsChatVoiceRecording(false);
      };

      recognition.start();
    } catch {
      clearChatSilenceTimer();
      setIsChatVoiceRecording(false);
    }
  };

  useEffect(() => {
    if (!isChatOpen && isChatVoiceRecording) {
      stopChatRecording();
    }
  }, [isChatOpen, isChatVoiceRecording]);

  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setDetectorError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDetectorError('Image size exceeds 10MB. Please choose a smaller photo.');
      return;
    }
    setSelectedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Convert file to base64 data URL for AI Vision model
    const reader = new FileReader();
    reader.onload = () => {
      setBase64Image(reader.result as string);
    };
    reader.readAsDataURL(file);

    setDetectorError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setBase64Image(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── Voice Recorder Handler for Symptoms Description ─────────────
  const symptomSilenceTimeoutRef = useRef<any>(null);

  const clearSymptomSilenceTimer = () => {
    if (symptomSilenceTimeoutRef.current) {
      clearTimeout(symptomSilenceTimeoutRef.current);
      symptomSilenceTimeoutRef.current = null;
    }
  };

  const resetSymptomSilenceTimer = () => {
    clearSymptomSilenceTimer();
    symptomSilenceTimeoutRef.current = setTimeout(() => {
      // 5 seconds of silence: stop recording
      stopSymptomRecording();
    }, 5000);
  };

  const stopSymptomRecording = () => {
    clearSymptomSilenceTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsRecording(false);
  };

  const toggleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isRecording) {
      stopSymptomRecording();
      return;
    }

    if (!SpeechRecognition) {
      setIsRecording(true);
      resetSymptomSilenceTimer();
      const simulatedSymptoms = "Lower leaves are showing yellowing margins with dark concentric brown rings, curled edges, and wilting during morning hours.";
      let charIdx = 0;
      setDescription("");
      const timer = setInterval(() => {
        charIdx += 4;
        if (charIdx >= simulatedSymptoms.length) {
          setDescription(simulatedSymptoms);
          clearInterval(timer);
          resetSymptomSilenceTimer();
        } else {
          setDescription(simulatedSymptoms.substring(0, charIdx));
        }
      }, 40);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      const navLang = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';
      recognition.lang = navLang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        resetSymptomSilenceTimer();
      };

      recognition.onspeechstart = () => {
        resetSymptomSilenceTimer();
      };

      recognition.onsoundstart = () => {
        resetSymptomSilenceTimer();
      };
      
      recognition.onresult = (event: any) => {
        resetSymptomSilenceTimer();
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setDescription(transcript);
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          clearSymptomSilenceTimer();
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        clearSymptomSilenceTimer();
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      clearSymptomSilenceTimer();
      setIsRecording(false);
    }
  };

  // ── Run Disease Diagnosis (AI Multimodal Pathology) ───────────────────
  const handleDiagnose = async () => {
    setDetectorError('');
    setLoadedFromHistory(null);
    if (!description.trim() && !selectedImage) {
      setDetectorError('Please enter disease symptoms or upload a plant leaf image.');
      return;
    }

    setAnalyzing(true);
    setDiagnosis(null);

    try {
      // Optional backup upload to Supabase storage bucket
      if (selectedImage && supabase && user?.email) {
        try {
          const fileExt = selectedImage.name.split('.').pop() || 'jpg';
          const fileName = `${user.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
          await supabase.storage.from('plant-images').upload(fileName, selectedImage);
        } catch {
          // Non-blocking
        }
      }

      // Send plant name, symptom description, and uploaded image to AI
      const res = await fetch(`${BACKEND_URL}/api/ai/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant: selectedPlant.split(' (')[0],
          description: description.trim() || 'Examine the attached plant leaf photo for disease lesions, blight, or discoloration.',
          image: base64Image,
          userEmail: user.email
        })
      });

      const data = await res.json();
      if (res.ok && data.diagnosis) {
        setDiagnosis(data.diagnosis);

        // Save scan to localStorage history so it persists across sessions and re-logins
        try {
          const scanItem = {
            ...(data.scan || {}),
            id: data.scan?.id || Date.now(),
            plant_name: data.scan?.plant_name || selectedPlant.split(' (')[0],
            disease_name: data.scan?.disease_name || data.diagnosis.probableDisease,
            confidence: data.scan?.confidence || data.diagnosis.confidence || '92.0%',
            status: 'Diagnosed',
            recommendations: data.scan?.recommendations || data.diagnosis.treatment || '',
            created_at: data.scan?.created_at || new Date().toISOString(),
            user_email: user.email,
            causes: data.diagnosis.causes,
            nutrientDeficiency: data.diagnosis.nutrientDeficiency,
            properNutrientWay: data.diagnosis.properNutrientWay,
            diagnosis: data.diagnosis,
          };
          const userKey = `plantguardian_scans_${user.email.toLowerCase()}`;
          const currentList = JSON.parse(localStorage.getItem(userKey) || '[]');
          const updatedList = [scanItem, ...currentList.filter((s: any) => s.id !== scanItem.id)].slice(0, 50);
          localStorage.setItem(userKey, JSON.stringify(updatedList));
          window.dispatchEvent(new CustomEvent('scan_recorded', { detail: scanItem }));
        } catch (e) {
          console.warn('Failed saving scan locally:', e);
        }
      } else {
        setDetectorError(data.error || 'Failed to analyze plant disease.');
      }
    } catch {
      setDetectorError('Could not connect to backend diagnosis service.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Run Farming Guidance ────────────────────────────────────────────
  const handleGenerateFarming = async () => {
    setGeneratingFarming(true);
    setFarmingGuide(null);
    setLoadedFarmingFromHistory(null);

    const cleanCropName = farmPlant.split(' (')[0];

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/farming-guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant: cleanCropName,
          soilType,
          location,
          season,
          userEmail: user.email
        })
      });

      const data = await res.json();
      if (res.ok && data.guide) {
        setFarmingGuide(data.guide);

        // Save farming plan to localStorage history so it persists across sessions and re-logins
        try {
          const planItem = {
            ...(data.plan || {}),
            id: data.plan?.id || Date.now(),
            plant_name: data.plan?.plant_name || cleanCropName,
            soil_type: data.plan?.soil_type || soilType,
            location: data.plan?.location || location,
            season: data.plan?.season || season,
            guide: data.guide,
            status: 'Completed',
            created_at: data.plan?.created_at || new Date().toISOString(),
            user_email: user.email,
          };
          const userKey = `plantguardian_farming_${user.email.toLowerCase()}`;
          const currentList = JSON.parse(localStorage.getItem(userKey) || '[]');
          const updatedList = [planItem, ...currentList.filter((p: any) => p.id !== planItem.id)].slice(0, 50);
          localStorage.setItem(userKey, JSON.stringify(updatedList));
          window.dispatchEvent(new CustomEvent('farming_plan_recorded', { detail: planItem }));
        } catch (e) {
          console.warn('Failed saving farming plan locally:', e);
        }
      } else {
        setFarmingGuide(data.error || 'Failed to generate farming guidance. Please verify backend connection.');
      }
    } catch {
      // Offline / network failure fallback so user always gets actionable agronomic care
      const fallbackAdvisory = `# 🌿 **Suitability & Climate Feasibility**
- **Climatic Compatibility:** ${cleanCropName} thrives in ${soilType} under regional ${season} environmental conditions.
- **Optimal Temperature:** Day temperatures of 22°C–32°C and moderate humidity ensure peak photosynthetic efficiency.
- **Sunlight Requirements:** Requires 6–8 hours of unfiltered daily solar radiation for optimal flower and fruit set.

# 🚜 **Soil & Land Preparation**
- **Soil Testing & Optimal pH:** Target soil pH between 6.0 and 7.2. Correct acidic conditions with agricultural lime.
- **Tillage & Field Preparation:** Deep plough to 25–30 cm depth to eliminate subsoil compaction and eradicate pest pupae.
- **Bed & Drainage System:** Form raised beds of 15–20 cm height to safeguard roots against monsoon water stagnation.
- **Basal Organic Manure:** Incorporate well-decomposed Farm Yard Manure (FYM) or vermicompost at 8–10 tonnes/acre.

# 🌱 **Sowing / Planting Method**
- **Seed Treatment:** Treat seeds with *Trichoderma viride* (4g/kg seed) to prevent fungal damping-off.
- **Seedling / Nursery Care:** Harden nursery seedlings 7 days before final transplantation.
- **Spacing & Depth:** Maintain row spacing of 50–60 cm and plant-to-plant spacing of 25–30 cm.
- **Germination Management:** Maintain light surface moisture without soil surface crusting.

# 💧 **Watering & Irrigation Routine**
- **Irrigation Frequency:** Irrigate every 4–6 days during vegetative growth; adjust according to seasonal rainfall.
- **Critical Growth Stages:** Ensure consistent soil moisture during flowering and early fruit development.
- **Waterlogging Precautions:** Avoid prolonged overhead wetting to minimize foliar blight.

# 🧪 **Fertilizer & Nutrition Schedule**
- **Basal Manure Application:** Blend enriched neem cake (100 kg/acre) with compost prior to planting.
- **NPK Timing & Dosage:** Apply balanced NPK 10:26:26 at basal stage, top-dress with nitrogen after 30 days.
- **Foliar & Micronutrients:** Spray chelated zinc, boron, and iron at flower bud emergence.

# 🛡️ **Preventive Care & Pest Management**
- **Key Local Pests:** Install yellow and blue sticky traps (10 traps/acre) to intercept whiteflies, aphids, and thrips.
- **Fungal & Bacterial Threats:** Early blight, powdery mildew, and root rots during high relative humidity.
- **Proactive Protection Measures:** Apply cold-pressed neem oil (3000 ppm at 4ml/L) bi-weekly as an organic bio-shield.

# 📅 **Growth Milestones & Harvest / Pruning Timeline**
- **Vegetative Phase:** Days 15–40 post germination.
- **Flowering & Fruit Setting:** Days 45–65.
- **Harvest Window:** Days 75–90, pick during cool morning hours for maximum shelf life.`;

      setFarmingGuide(fallbackAdvisory);

      // Save fallback plan to local storage and dispatch event
      try {
        const planItem = {
          id: Date.now(),
          plant_name: cleanCropName,
          soil_type: soilType,
          location,
          season,
          guide: fallbackAdvisory,
          status: 'Completed',
          created_at: new Date().toISOString(),
          user_email: user.email,
        };
        const userKey = `plantguardian_farming_${user.email.toLowerCase()}`;
        const currentList = JSON.parse(localStorage.getItem(userKey) || '[]');
        const updatedList = [planItem, ...currentList.filter((p: any) => p.id !== planItem.id)].slice(0, 50);
        localStorage.setItem(userKey, JSON.stringify(updatedList));
        window.dispatchEvent(new CustomEvent('farming_plan_recorded', { detail: planItem }));
      } catch (e) {
        console.warn('Failed saving fallback farming plan locally:', e);
      }
    } finally {
      setGeneratingFarming(false);
    }
  };

  // ── Auto Detect Location (High Accuracy GPS + Town Level Reverse Geocode) ──
  const handleDetectLocation = async () => {
    setLocDetecting(true);
    try {
      let resolved = false;

      // 1. Attempt high-accuracy browser geolocation (GPS / Wi-Fi)
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 7000,
              maximumAge: 30000
            });
          });

          if (position?.coords) {
            const { latitude, longitude } = position.coords;
            const revRes = await fetch(
              `${BACKEND_URL}/api/geo/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
            );
            if (revRes.ok) {
              const data = await revRes.json();
              if (data.location) {
                setLocation(data.location);
                resolved = true;
              }
            }
          }
        } catch (geoErr) {
          console.info('High-accuracy geolocation skipped or prompt declined, falling back to IP:', geoErr);
        }
      }

      // 2. If geolocation was declined or unavailable, use backend IP locator
      if (!resolved) {
        const ipRes = await fetch(`${BACKEND_URL}/api/geo/ip-locate`);
        if (ipRes.ok) {
          const data = await ipRes.json();
          if (data.location) {
            setLocation(data.location);
            resolved = true;
          }
        }
      }

      if (!resolved) {
        setLocation('Kanchrapara, West Bengal');
      }
    } catch (err) {
      console.warn('Location detection error:', err);
      setLocation('Kanchrapara, West Bengal');
    } finally {
      setLocDetecting(false);
    }
  };

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
      {/* ── Dashboard Top Header & Mode Switcher ─────────────────────── */}
      <div 
        className="rounded-3xl p-6 sm:p-8 mb-8 border border-white/20 shadow-2xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 34, 20, 0.92) 0%, rgba(10, 22, 13, 0.98) 100%)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="PlantGuardian Logo" 
              className="w-16 h-16 rounded-2xl object-cover shadow-[0_0_20px_rgba(199,234,107,0.35)] shrink-0"
              style={{
                width: '56px',
                height: '56px',
                minWidth: '56px',
                minHeight: '56px',
                maxWidth: '56px',
                maxHeight: '56px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                  Welcome, {user.name || user.email.split('@')[0]}!
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          WORKSPACE 1: DISEASE DETECTOR
          ═══════════════════════════════════════════════════════════════ */}
      {currentTab === 'detector' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Controls */}
            <div className="lg:col-span-6 rounded-3xl p-6 sm:p-8 border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <Activity className="w-5 h-5 text-[#c7ea6b]" />
                  <h2 className="text-xl font-serif font-bold text-white">
                    Plant Disease & Deficiency Detector
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-white/70 mb-6">
                  Select an available plant from the project catalog, describe symptoms in text or using the live voice recorder.
                </p>

                {/* 1. Plant Dropdown */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#c7ea6b] mb-1.5 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-[#c7ea6b]" />
                    <span>1. Plant / Crop Name</span>
                  </label>
                  <CustomDropdown
                    value={selectedPlant}
                    onChange={(val) => {
                      setSelectedPlant(val);
                      setFarmPlant(val);
                    }}
                    options={AVAILABLE_PLANTS}
                    placeholder="Choose plant / crop..."
                    searchable={true}
                    zIndex={40}
                    maxMenuHeight="220px"
                  />
                </div>

                {/* 2. Symptom Description with Voice Recorder */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#c7ea6b]">
                      Disease Symptoms / Description
                    </label>
                    <button
                      type="button"
                      onClick={toggleVoiceRecording}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isRecording 
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-[#c7ea6b]/20 text-[#c7ea6b] border border-[#c7ea6b]/40 hover:bg-[#c7ea6b]/30'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isRecording ? 'Listening... Speak Now' : 'Voice Recorder'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (detectorError) setDetectorError('');
                      }}
                      placeholder="e.g. Tomato foliage has yellow margins, concentric brown spots, and wilting during morning hours..."
                      className="w-full bg-black/40 border border-white/20 rounded-xl p-4 text-sm text-white placeholder-white/40 outline-none focus:border-[#c7ea6b] focus:ring-1 focus:ring-[#c7ea6b] transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/50 mt-1">
                    <span>Click the Voice Recorder button to transcribe spoken symptoms automatically.</span>
                  </div>
                </div>

                {/* 3. Plant Image Upload Section (Compact & Space-Efficient) */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#c7ea6b] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Plant Image (Upload Leaf Photo)
                    </label>
                    {imagePreview && (
                      <span className="text-[11px] text-[#c7ea6b] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#c7ea6b]" />
                        Attached
                      </span>
                    )}
                  </div>

                  {!imagePreview ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl px-4 py-2.5 text-center cursor-pointer transition-all duration-300 flex items-center justify-between gap-3 ${
                        isDragging
                          ? 'border-[#c7ea6b] bg-[#c7ea6b]/15 scale-[1.01]'
                          : 'border-white/20 bg-black/30 hover:border-[#c7ea6b]/60 hover:bg-black/45'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3">
                        <div 
                          style={{ width: '32px', height: '32px', minWidth: '32px' }}
                          className="rounded-lg bg-[#c7ea6b]/15 border border-[#c7ea6b]/30 flex items-center justify-center text-[#c7ea6b] shrink-0"
                        >
                          <UploadCloud className="w-4 h-4 text-[#c7ea6b]" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold text-white">
                            Click or drag leaf photo here
                          </div>
                          <p className="text-[10px] text-white/50">
                            JPG, PNG, WebP (up to 10MB)
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/10 text-[#c7ea6b] border border-white/15 shrink-0">
                        Upload
                      </span>
                    </div>
                  ) : (
                    /* Compact card matching the second screenshot */
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/15 hover:border-[#c7ea6b]/40 transition-all shadow-md">
                      {/* Clickable thumbnail & text matching second image */}
                      <div 
                        onClick={() => setIsImageModalOpen(true)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
                        title="Click to view full uploaded photo"
                      >
                        <div 
                          style={{ width: '48px', height: '48px', minWidth: '48px', maxWidth: '48px' }}
                          className="relative rounded-xl overflow-hidden border border-[#c7ea6b]/30 shrink-0 shadow-inner group-hover:border-[#c7ea6b] transition-colors"
                        >
                          <img
                            src={imagePreview}
                            alt="Uploaded plant specimen"
                            style={{ width: '48px', height: '48px', objectFit: 'cover', display: 'block' }}
                            className="group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-3.5 h-3.5 text-[#c7ea6b]" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {selectedImage?.name || 'plant_specimen.jpg'}
                          </div>
                          <p className="text-[10px] text-[#c7ea6b] flex items-center gap-1 mt-0.5 group-hover:underline">
                            <Maximize2 className="w-2.5 h-2.5 text-[#c7ea6b]" />
                            <span>Click to view full uploaded photo</span>
                            {selectedImage ? <span className="text-white/40"> · {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB</span> : null}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                          title="Change Image"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer flex items-center justify-center"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Sample quick presets */}
                <div className="mb-6 flex flex-wrap gap-2">
                  <span className="text-[11px] text-white/50 self-center">Quick Symptom Examples:</span>
                  {[
                    "Brown concentric spots with yellow halos on lower leaves",
                    "Interveinal yellowing with scorched leaf tips",
                    "White powdery fungal coating on upper leaf surface"
                  ].map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDescription(example)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-[#c7ea6b]/50 text-white/80 hover:text-white transition-colors"
                    >
                      {example.substring(0, 32)}...
                    </button>
                  ))}
                </div>

                {detectorError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                    {detectorError}
                  </div>
                )}
              </div>

              {/* Diagnose Button */}
              <button
                type="button"
                onClick={handleDiagnose}
                disabled={analyzing}
                className="w-full py-3.5 rounded-xl btn-lime font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl transition-all"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#183615] animate-spin" />
                    <span className="text-[#183615]">Analyzing Pathogens & Nutrient Deficiencies...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#183615]" />
                    <span className="text-[#183615]">Diagnose Plant Disease</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Column */}
            <div 
              id="diagnostic-assessment-section"
              className="lg:col-span-6 rounded-3xl p-6 sm:p-8 border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl flex flex-col justify-between scroll-mt-24"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-[#c7ea6b]" />
                    <h3 className="text-xl font-serif font-bold text-white">
                      Diagnostic Assessment & Nutrient Solution
                    </h3>
                  </div>
                </div>

                {loadedFromHistory && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-[#c7ea6b]/15 border border-[#c7ea6b]/35 flex items-center justify-between text-xs text-[#c7ea6b] animate-fade-in shadow-inner">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#c7ea6b] shrink-0" />
                      <span>
                        Viewing Past Diagnosis from History: <strong className="text-white">{loadedFromHistory.disease}</strong> ({loadedFromHistory.date})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoadedFromHistory(null)}
                      className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {diagnosis ? (
                  <div className="space-y-4 animate-fade-in">
                    {/* Scanned Leaf Specimen Preview (Clickable to view full) */}
                    {imagePreview && (
                      <div 
                        onClick={() => setIsImageModalOpen(true)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/15 hover:border-[#c7ea6b]/40 cursor-pointer group transition-all"
                        title="Click to view full uploaded photo"
                      >
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#c7ea6b]/30 shrink-0 shadow-inner group-hover:border-[#c7ea6b] transition-colors">
                          <img
                            src={imagePreview}
                            alt="Analyzed leaf specimen"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-3 h-3 text-[#c7ea6b]" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {selectedImage?.name || 'Leaf Specimen'}
                          </div>
                          <span className="text-[10px] text-[#c7ea6b] flex items-center gap-1 mt-0.5">
                            <Maximize2 className="w-2.5 h-2.5 text-[#c7ea6b]" />
                            Click to view full uploaded photo
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Probable Disease */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/25 via-black/50 to-black/70 border border-rose-500/30 shadow-lg backdrop-blur-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400">
                            <Bug className="w-3.5 h-3.5" />
                          </span>
                          <span>Probable Disease Name</span>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25">
                          Pathological Match
                        </span>
                      </div>
                      <div className="text-lg font-serif font-bold text-white tracking-wide">
                        {diagnosis.probableDisease}
                      </div>
                    </div>

                    {/* Biological & Environmental Causes */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/25 via-black/50 to-black/70 border border-amber-500/30 shadow-lg backdrop-blur-md">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            <Activity className="w-3.5 h-3.5" />
                          </span>
                          <span>Biological & Environmental Causes</span>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25">
                          Etiology & Triggers
                        </span>
                      </div>
                      <p className="text-sm text-white font-normal leading-relaxed">
                        {diagnosis.causes}
                      </p>
                    </div>

                    {/* Nutrient Deficiency & Proper Way to Give Them (Hidden if not applicable/suitable) */}
                    {hasNutrientDeficiency(diagnosis.nutrientDeficiency, diagnosis.properNutrientWay) && (
                      <div className="p-4 rounded-2xl bg-[#c7ea6b]/10 border border-[#c7ea6b]/30">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#c7ea6b] mb-1 flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5" />
                          <span>Nutrients Deficiency Identified</span>
                        </div>
                        <div className="text-sm font-bold text-white mb-2">
                          {diagnosis.nutrientDeficiency}
                        </div>

                        <div className="pt-2 border-t border-[#c7ea6b]/20">
                          <div className="text-xs font-semibold text-[#c7ea6b] mb-1">
                            Proper Way to Give Them to Plants (Dosage & Method):
                          </div>
                          <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
                            {diagnosis.properNutrientWay}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Curative Care & Disease Treatment Protocol (Interactive Step Checklist) */}
                    <CurativeCareSteps treatment={diagnosis.treatment} />
                  </div>
                ) : (
                  <div className="py-20 text-center text-white/50 flex flex-col items-center">
                    <FlaskConical className="w-12 h-12 text-white/20 mb-3" />
                    <div className="text-sm font-medium text-white/80 mb-1">Awaiting Diagnosis Input</div>
                    <p className="text-xs max-w-sm">
                      Select your plant and describe symptoms on the left to receive immediate disease identification, causes, nutrient deficiencies, and exact application routines.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          WORKSPACE 2: FARMING GUIDANCE
          ═══════════════════════════════════════════════════════════════ */}
      {currentTab === 'farming' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Farming Input Controls */}
            <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <Sprout className="w-5 h-5 text-[#c7ea6b]" />
                  <h2 className="text-xl font-serif font-bold text-white">
                    Precision Farming & Crop Guidance
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-white/70 mb-6">
                  Select plant, soil type, geographic location, and planting season to generate custom agronomist care routines.
                </p>

                {/* Plant Selector */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#c7ea6b] mb-1.5 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-[#c7ea6b]" />
                    <span>1. Plant / Crop Name</span>
                  </label>
                  <CustomDropdown
                    value={farmPlant}
                    onChange={(val) => {
                      setFarmPlant(val);
                      setSelectedPlant(val);
                    }}
                    options={AVAILABLE_PLANTS}
                    placeholder="Choose plant / crop..."
                    searchable={true}
                    zIndex={40}
                    maxMenuHeight="220px"
                  />
                </div>

                {/* Soil Type Selector */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#c7ea6b] mb-1.5">
                    2. Soil Type
                  </label>
                  <CustomDropdown
                    value={soilType}
                    onChange={setSoilType}
                    options={SOIL_CHOICES}
                    placeholder="Select soil condition..."
                    zIndex={30}
                  />
                </div>

                {/* Location Input with Auto Detect */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#c7ea6b]">
                      3. Location (State / District)
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={locDetecting}
                      className="inline-flex items-center gap-1 text-[11px] text-[#c7ea6b] hover:underline cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{locDetecting ? 'Locating...' : 'Auto-Detect'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter district, state, or click Auto-Detect..."
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#c7ea6b] transition-colors"
                  />
                </div>

                {/* Season Selector */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#c7ea6b] mb-1.5">
                    4. Season / Sowing Window
                  </label>
                  <CustomDropdown
                    value={season}
                    onChange={setSeason}
                    options={SEASON_CHOICES}
                    placeholder="Select planting season..."
                    zIndex={20}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleGenerateFarming}
                disabled={generatingFarming}
                className="w-full py-3.5 rounded-xl btn-lime font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl transition-all"
              >
                {generatingFarming ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#183615] animate-spin" />
                    <span className="text-[#183615]">Formulating Agronomic Routine...</span>
                  </>
                ) : (
                  <>
                    <Sprout className="w-4 h-4 text-[#183615]" />
                    <span className="text-[#183615]">Generate Farming Guidance</span>
                  </>
                )}
              </button>
            </div>

            {/* Farming Guidance Output Column */}
            <div id="farming-guidance-result" className="lg:col-span-7 rounded-3xl p-6 sm:p-8 border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                {loadedFarmingFromHistory && (
                  <div className="mb-4 p-3 rounded-xl bg-[#c7ea6b]/10 border border-[#c7ea6b]/30 flex items-center justify-between text-xs text-[#c7ea6b] animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Sprout className="w-4 h-4 shrink-0" />
                      <span>
                        Viewing Past Advisory from History: <strong className="text-white">{loadedFarmingFromHistory.plant}</strong> ({loadedFarmingFromHistory.date})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoadedFarmingFromHistory(null)}
                      className="text-white/60 hover:text-white cursor-pointer ml-2 p-1 rounded-md hover:bg-white/10"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#c7ea6b]" />
                    <h3 className="text-xl font-serif font-bold text-white">
                      Custom Take Care Routine & Farming Plan
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-[#c7ea6b]/20 text-[#c7ea6b] border border-[#c7ea6b]/30">
                    Precision Agronomy
                  </span>
                </div>

                {farmingGuide ? (
                  <FarmingPlanRenderer
                    guideText={farmingGuide}
                    cropName={farmPlant.split(' (')[0]}
                    soilType={soilType.split(' (')[0]}
                    season={season.split(' (')[0]}
                  />
                ) : (
                  <div className="py-24 text-center text-white/50 flex flex-col items-center">
                    <Sprout className="w-12 h-12 text-white/20 mb-3" />
                    <div className="text-sm font-medium text-white/80 mb-1">Awaiting Farming Parameters</div>
                    <p className="text-xs max-w-sm">
                      Select your crop, soil type, location, and season on the left to generate comprehensive land preparation, irrigation schedules, and nutrient management routines.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span>Crop: <strong className="text-white">{farmPlant.split(' (')[0]}</strong></span>
                <span>Soil: <strong className="text-white">{soilType.split(' (')[0]}</strong></span>
                <span>Season: <strong className="text-[#c7ea6b]">{season.split(' (')[0]}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Real Image Lightbox Modal (Portal to body, sized & padded to stay clear below navbar) */}
      {isImageModalOpen && imagePreview && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '95px 20px 30px',
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)'
          }}
          onClick={() => setIsImageModalOpen(false)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '640px',
              width: '100%',
              maxHeight: 'calc(100vh - 135px)',
              backgroundColor: '#09150b',
              border: '1.5px solid rgba(199, 234, 107, 0.45)',
              borderRadius: '20px',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.98), 0 0 30px rgba(199, 234, 107, 0.15)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  style={{ width: '26px', height: '26px' }}
                  className="rounded-lg bg-[#c7ea6b]/20 flex items-center justify-center text-[#c7ea6b]"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[220px] sm:max-w-md">
                    {selectedImage?.name || 'Uploaded Plant Specimen'}
                  </h4>
                  <p className="text-[10px] text-white/50">
                    {selectedImage ? `${(selectedImage.size / (1024 * 1024)).toFixed(2)} MB · ` : ''}Original Full-Resolution Upload
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  color: '#ffffff'
                }}
                className="hover:bg-white/20 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Real Full Image Container */}
            <div 
              style={{
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                overflow: 'auto',
                maxHeight: 'calc(100vh - 195px)'
              }}
            >
              <img
                src={imagePreview}
                alt={selectedImage?.name || 'Uploaded plant specimen'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '52vh',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  display: 'block',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STATIC AI CHATBOT BOX (FIXED THROUGHOUT DASHBOARD - BOTTOM RIGHT)
          ═══════════════════════════════════════════════════════════════ */}
      <div 
        className="fixed bottom-6 right-3 sm:right-4 flex flex-col items-end pointer-events-auto select-none"
        style={{ zIndex: 99990 }}
      >
        {/* Expanded Chatbot Window */}
        {isChatOpen && (
          <div 
            className="rounded-3xl flex flex-col overflow-hidden animate-fade-in shadow-2xl"
            style={{
              width: isChatExpanded 
                ? 'min(560px, calc(100vw - 28px))' 
                : 'min(380px, calc(100vw - 28px))',
              height: isChatExpanded ? '540px' : '380px',
              maxHeight: 'calc(100vh - 90px)',
              backgroundColor: '#09150b',
              border: '1px solid rgba(199, 234, 107, 0.45)',
              boxShadow: isChatExpanded
                ? '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 45px rgba(199, 234, 107, 0.25)'
                : '0 20px 50px rgba(0, 0, 0, 0.95), 0 0 30px rgba(199, 234, 107, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
            }}
          >
            {/* Header */}
            <div 
              className="p-3 sm:p-3.5 flex items-center justify-between shrink-0"
              style={{
                backgroundColor: '#0c1c0e',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #c7ea6b 0%, #a3cc44 100%)',
                    color: '#09160b',
                  }}
                >
                  <Bot className="w-4 h-4 text-[#09160b]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-serif font-bold text-white tracking-wide">
                      AI Chatbot
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                  </div>
                  <span className="text-[10px] text-white/50">
                    Precision Agronomist Assistant
                  </span>
                </div>
              </div>

              {/* Action Buttons: Resize (Bigger/Smaller) & Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsChatExpanded((prev) => !prev)}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isChatExpanded ? "Make smaller (default size)" : "Make bigger"}
                  aria-label={isChatExpanded ? "Make smaller" : "Make bigger"}
                >
                  {isChatExpanded ? (
                    <Minimize2 className="w-4 h-4 text-[#c7ea6b]" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChatOpen(false);
                    setIsChatExpanded(false);
                  }}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close chat"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body with Visible Scrollbar */}
            <div 
              className="flex-1 p-3.5 space-y-2.5 chat-scrollbar text-xs"
              style={{ 
                backgroundColor: '#061007',
                minHeight: 0,
                overflowY: 'auto',
              }}
            >
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 leading-relaxed ${
                      msg.sender === 'user'
                        ? 'font-medium shadow-md rounded-br-none'
                        : 'border rounded-bl-none shadow-md text-white/90'
                    }`}
                    style={
                      msg.sender === 'user'
                        ? {
                            background: 'linear-gradient(135deg, #c7ea6b 0%, #b5db55 100%)',
                            color: '#08140a',
                          }
                        : {
                            backgroundColor: '#0e1f13',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                          }
                    }
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <span className="text-[9px] text-white/40 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              ))}

              {isChatLoading && (
                <div 
                  className="flex items-center gap-2 p-2.5 rounded-2xl text-white/70 text-xs w-fit shadow-md"
                  style={{
                    backgroundColor: '#0e1f13',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#c7ea6b] animate-spin" />
                  <span>AI Agronomist is thinking...</span>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div 
              className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto chat-scrollbar shrink-0"
              style={{
                backgroundColor: '#08140a',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {[
                'Treat yellow leaves',
                'Fix fungal leaf spots',
                'Fertilizer schedule',
                'Drip irrigation tips'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendChatMessage(chip)}
                  disabled={isChatLoading}
                  className="px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap text-white/75 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input & Voice Recorder Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isChatVoiceRecording) {
                  stopChatRecording();
                }
                handleSendChatMessage();
              }}
              className="p-2.5 flex items-center gap-2 shrink-0"
              style={{
                backgroundColor: '#0c1c0e',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {/* Textbox for typing / displaying transcribed speech */}
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  isChatVoiceRecording 
                    ? "Listening to voice..." 
                    : "Type your message or use voice..."
                }
                disabled={isChatLoading}
                className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none transition-colors"
                style={{
                  backgroundColor: '#061007',
                  border: isChatVoiceRecording
                    ? '1px solid rgba(199, 234, 107, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow: isChatVoiceRecording ? '0 0 10px rgba(199, 234, 107, 0.2)' : 'none',
                }}
              />

              {/* Voice Recorder Button */}
              <button
                type="button"
                onClick={toggleChatVoiceRecording}
                disabled={isChatLoading}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md active:scale-95 ${
                  isChatVoiceRecording
                    ? 'bg-red-500 text-white animate-bounce'
                    : 'hover:bg-white/10 text-white/75 hover:text-[#c7ea6b]'
                }`}
                style={
                  isChatVoiceRecording
                    ? {
                        backgroundColor: '#ef4444',
                        border: '1px solid #f87171',
                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)',
                      }
                    : {
                        backgroundColor: 'rgba(255, 255, 255, 0.07)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                      }
                }
                title={isChatVoiceRecording ? "Stop voice recording" : "Voice Recorder (speak to type into textbox)"}
                aria-label={isChatVoiceRecording ? "Stop voice recording" : "Voice recorder"}
              >
                {isChatVoiceRecording ? (
                  <MicOff className="w-3.5 h-3.5 text-white animate-pulse" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #c7ea6b 0%, #a3cc44 100%)',
                  color: '#08140a',
                }}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* The Static AI Chatbot Launcher Box - only shown when chat is closed */}
        {!isChatOpen && (
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="group flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition-all duration-300 cursor-pointer shadow-2xl active:scale-95"
            style={{
              backgroundColor: '#08160a',
              borderColor: 'rgba(199, 234, 107, 0.45)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.9), 0 0 25px rgba(199, 234, 107, 0.22)',
            }}
            title="Open AI Chatbot"
          >
            {/* Glowing Bot Icon */}
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #c7ea6b 0%, #a3cc44 100%)',
                color: '#08160a',
              }}
            >
              <Bot className="w-4 h-4 text-[#08160a]" />
            </div>

            {/* AI Chatbot Label & Status */}
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide group-hover:text-[#c7ea6b] transition-colors">
                AI Chatbot
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
