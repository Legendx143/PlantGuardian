import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  History, 
  Sprout, 
  X, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  ShieldCheck,
  Activity,
  MapPin,
  Layers,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { BACKEND_URL } from '../lib/apiConfig';
import { supabase } from '../lib/supabase';

export interface ScanRecord {
  id: number | string;
  plant_name: string;
  disease_name: string;
  confidence: string;
  status: string;
  recommendations?: string;
  created_at: string;
  user_email?: string;
  causes?: string;
  nutrientDeficiency?: string;
  properNutrientWay?: string;
  diagnosis?: {
    probableDisease: string;
    confidence: string;
    causes: string;
    nutrientDeficiency: string;
    properNutrientWay: string;
    treatment: string;
    isPlant?: boolean;
    speciesMatch?: boolean;
    detectedSpecies?: string;
    selectedSpecies?: string;
    mismatchMessage?: string | null;
  };
}

export interface FarmingRecord {
  id: number | string;
  plant_name: string;
  soil_type?: string;
  location?: string;
  season?: string;
  guide: string;
  status?: string;
  created_at: string;
  user_email?: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  activeTab?: 'detector' | 'farming';
  onSelectScan?: (scan: ScanRecord) => void;
  onSelectFarmingPlan?: (plan: FarmingRecord) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  userEmail,
  activeTab = 'detector',
  onSelectScan,
  onSelectFarmingPlan,
}) => {
  const [drawerTab, setDrawerTab] = useState<'detector' | 'farming'>(
    activeTab === 'farming' ? 'farming' : 'detector'
  );
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [farmingPlans, setFarmingPlans] = useState<FarmingRecord[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [loadingFarming, setLoadingFarming] = useState(false);

  // Sync drawer tab with the active dashboard tab when opened
  useEffect(() => {
    if (isOpen && activeTab) {
      setDrawerTab(activeTab === 'farming' ? 'farming' : 'detector');
    }
  }, [isOpen, activeTab]);

  // Fetch disease diagnosis history with bidirectional database sync
  const fetchScans = async () => {
    setLoadingScans(true);
    try {
      const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
      const userKey = cleanEmail ? `plantguardian_scans_${cleanEmail}` : 'plantguardian_scans';
      const cached = localStorage.getItem(userKey) || localStorage.getItem('plantguardian_recent_scans');
      let localRecords: ScanRecord[] = [];
      if (cached) {
        try { localRecords = JSON.parse(cached); } catch {}
      }

      const url = cleanEmail 
        ? `${BACKEND_URL}/api/scans?email=${encodeURIComponent(cleanEmail)}`
        : `${BACKEND_URL}/api/scans`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const serverScans: ScanRecord[] = Array.isArray(data.scans) ? data.scans : [];

        // Identify local scans that are missing from the server database
        const serverIds = new Set(serverScans.map((s: ScanRecord) => String(s.id)));
        const missingOnServer = localRecords.filter((s: ScanRecord) => !serverIds.has(String(s.id)));

        let finalScans = [...serverScans];

        // If this device has local records not yet in server database, sync them up now!
        if (cleanEmail && missingOnServer.length > 0) {
          try {
            const syncRes = await fetch(`${BACKEND_URL}/api/scans/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, scans: missingOnServer }),
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (Array.isArray(syncData.scans)) {
                finalScans = syncData.scans;
              }
            }
          } catch (syncErr) {
            console.warn('Scans background sync deferred:', syncErr);
            finalScans = [...serverScans, ...missingOnServer];
          }
        }

        const sorted = finalScans.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setScans(sorted);
        localStorage.setItem(userKey, JSON.stringify(sorted));
        setLoadingScans(false);
        return;
      }

      if (localRecords.length > 0) {
        setScans(localRecords);
      }
    } catch (err) {
      console.warn('Failed to fetch scan history:', err);
      const userKey = userEmail ? `plantguardian_scans_${userEmail.toLowerCase()}` : 'plantguardian_scans';
      const cached = localStorage.getItem(userKey);
      if (cached) {
        try { setScans(JSON.parse(cached)); } catch {}
      }
    } finally {
      setLoadingScans(false);
    }
  };

  // Fetch farming guidance history with bidirectional database sync
  const fetchFarmingPlans = async () => {
    setLoadingFarming(true);
    try {
      const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
      const userKey = cleanEmail ? `plantguardian_farming_${cleanEmail}` : 'plantguardian_farming';
      const cached = localStorage.getItem(userKey);
      let localRecords: FarmingRecord[] = [];
      if (cached) {
        try { localRecords = JSON.parse(cached); } catch {}
      }

      const url = cleanEmail 
        ? `${BACKEND_URL}/api/farming-plans?email=${encodeURIComponent(cleanEmail)}`
        : `${BACKEND_URL}/api/farming-plans`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const serverPlans: FarmingRecord[] = Array.isArray(data.plans) ? data.plans : [];

        // Identify local plans that are missing from the server database
        const serverIds = new Set(serverPlans.map((p: FarmingRecord) => String(p.id)));
        const missingOnServer = localRecords.filter((p: FarmingRecord) => !serverIds.has(String(p.id)));

        let finalPlans = [...serverPlans];

        // If this device has local records not yet in server database, sync them up now!
        if (cleanEmail && missingOnServer.length > 0) {
          try {
            const syncRes = await fetch(`${BACKEND_URL}/api/farming-plans/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, plans: missingOnServer }),
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (Array.isArray(syncData.plans)) {
                finalPlans = syncData.plans;
              }
            }
          } catch (syncErr) {
            console.warn('Farming plans background sync deferred:', syncErr);
            finalPlans = [...serverPlans, ...missingOnServer];
          }
        }

        const sorted = finalPlans.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setFarmingPlans(sorted);
        localStorage.setItem(userKey, JSON.stringify(sorted));
        setLoadingFarming(false);
        return;
      }

      if (localRecords.length > 0) {
        setFarmingPlans(localRecords);
      }
    } catch (err) {
      console.warn('Failed to fetch farming plans history:', err);
      const userKey = userEmail ? `plantguardian_farming_${userEmail.toLowerCase()}` : 'plantguardian_farming';
      const cached = localStorage.getItem(userKey);
      if (cached) {
        try { setFarmingPlans(JSON.parse(cached)); } catch {}
      }
    } finally {
      setLoadingFarming(false);
    }
  };

  const handleDeleteScan = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    const userKey = cleanEmail ? `plantguardian_scans_${cleanEmail}` : 'plantguardian_scans';

    const updated = scans.filter((s) => String(s.id) !== String(id));
    setScans(updated);
    localStorage.setItem(userKey, JSON.stringify(updated));

    try {
      await fetch(`${BACKEND_URL}/api/scans/${id}?email=${encodeURIComponent(cleanEmail)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Failed to delete scan on server:', err);
    }
  };

  const handleDeleteFarmingPlan = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    const userKey = cleanEmail ? `plantguardian_farming_${cleanEmail}` : 'plantguardian_farming';

    const updated = farmingPlans.filter((p) => String(p.id) !== String(id));
    setFarmingPlans(updated);
    localStorage.setItem(userKey, JSON.stringify(updated));

    try {
      await fetch(`${BACKEND_URL}/api/farming-plans/${id}?email=${encodeURIComponent(cleanEmail)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Failed to delete farming plan on server:', err);
    }
  };

  const handleRefresh = () => {
    fetchScans();
    fetchFarmingPlans();
  };

  useEffect(() => {
    if (isOpen) {
      fetchScans();
      fetchFarmingPlans();
    }
  }, [isOpen, userEmail]);

  // Real-time PostgreSQL database subscription across devices
  useEffect(() => {
    if (!isOpen || !supabase || !userEmail) return;
    const client = supabase;
    const cleanEmail = userEmail.trim().toLowerCase();

    const channel = client
      .channel(`realtime_scans:${cleanEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plant_scans',
          filter: `user_email=eq.${cleanEmail}`,
        },
        () => {
          fetchScans();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farming_plans',
          filter: `user_email=eq.${cleanEmail}`,
        },
        () => {
          fetchFarmingPlans();
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [isOpen, userEmail]);

  // Listen to local real-time events from the dashboard
  useEffect(() => {
    const handleNewScan = (e: any) => {
      if (e.detail) {
        setScans((prev) => [e.detail, ...prev.filter((s) => s.id !== e.detail.id)]);
      }
    };
    const handleNewFarmingPlan = (e: any) => {
      if (e.detail) {
        setFarmingPlans((prev) => [e.detail, ...prev.filter((p) => p.id !== e.detail.id)]);
      }
    };

    window.addEventListener('scan_recorded', handleNewScan);
    window.addEventListener('farming_plan_recorded', handleNewFarmingPlan);
    return () => {
      window.removeEventListener('scan_recorded', handleNewScan);
      window.removeEventListener('farming_plan_recorded', handleNewFarmingPlan);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectDiagnosis = (scan: ScanRecord) => {
    window.dispatchEvent(new CustomEvent('load_diagnosis', { detail: scan }));
    onSelectScan?.(scan);
    onClose();
  };

  const handleSelectFarmingPlan = (plan: FarmingRecord) => {
    window.dispatchEvent(new CustomEvent('load_farming_plan', { detail: plan }));
    onSelectFarmingPlan?.(plan);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const cleanPreviewText = (rawText?: string) => {
    if (!rawText) return '';
    const cleaned = rawText
      .replace(/#+\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/[-*•]\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length <= 80) return cleaned;
    return cleaned.substring(0, 80).trim() + '...';
  };

  const isRefreshing = loadingScans || loadingFarming;

  return createPortal(
    <div 
      className="fixed inset-0 pointer-events-auto"
      style={{ zIndex: 99998 }}
    >
      {/* Dark backdrop covering the rest of the screen */}
      <div 
        onClick={onClose}
        className="fixed inset-0 cursor-pointer transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99998,
        }}
        title="Click outside to close history"
      />

      {/* Solid Opaque Side Bar Anchored to the RIGHT */}
      <aside 
        className="fixed top-0 right-0 bottom-0 h-full flex flex-col overflow-hidden animate-slide-in-right"
        style={{
          width: '460px',
          maxWidth: '100vw',
          backgroundColor: '#08140a', // 100% SOLID opaque dark forest background (NO transparency)
          borderLeft: '1px solid rgba(199, 234, 107, 0.25)',
          boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.95)',
          zIndex: 100000,
        }}
      >
        {/* Header */}
        <div 
          className="p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0"
          style={{
            backgroundColor: '#0c1b0e', // 100% solid
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#c7ea6b] shrink-0"
              style={{
                backgroundColor: 'rgba(199, 234, 107, 0.15)',
                border: '1px solid rgba(199, 234, 107, 0.35)',
              }}
            >
              <History className="w-5 h-5 text-[#c7ea6b]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                  {drawerTab === 'detector' ? 'Past Diagnoses' : 'Farming Guidance History'}
                </h2>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-[#c7ea6b]"
                  style={{
                    backgroundColor: 'rgba(199, 234, 107, 0.18)',
                    border: '1px solid rgba(199, 234, 107, 0.35)',
                  }}
                >
                  {drawerTab === 'detector' ? scans.length : farmingPlans.length}
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                {drawerTab === 'detector' 
                  ? 'Click any diagnosis to view in dashboard' 
                  : 'Click any advisory plan to load into dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              className={`p-2 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer ${
                isRefreshing ? 'animate-spin text-[#c7ea6b]' : ''
              }`}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
              title="Refresh history records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer hover:bg-white/15"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
              title="Close history panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Disease Detector vs Farming Guidance */}
        <div 
          className="px-4 py-3 flex items-center gap-2 shrink-0"
          style={{
            backgroundColor: '#09160b',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerTab('detector')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              drawerTab === 'detector'
                ? 'bg-[#c7ea6b] text-[#142816] shadow-[0_0_12px_rgba(199,234,107,0.3)] font-bold'
                : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Disease Detector ({scans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerTab('farming')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              drawerTab === 'farming'
                ? 'bg-[#c7ea6b] text-[#142816] shadow-[0_0_12px_rgba(199,234,107,0.3)] font-bold'
                : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>Farming Guidance ({farmingPlans.length})</span>
          </button>
        </div>

        {/* Records List Container */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
          style={{ backgroundColor: '#08140a' }}
        >
          {/* ═════════════════════════════════════════════════════════════
              TAB 1: DISEASE DETECTOR DIAGNOSES
              ═════════════════════════════════════════════════════════════ */}
          {drawerTab === 'detector' && (
            loadingScans && scans.length === 0 ? (
              <div className="py-20 text-center text-white/50 flex flex-col items-center">
                <RefreshCw className="w-8 h-8 text-[#c7ea6b] animate-spin mb-3" />
                <div className="text-xs">Loading past diagnosis records...</div>
              </div>
            ) : scans.length === 0 ? (
              <div className="py-20 text-center text-white/50 flex flex-col items-center">
                <Clock className="w-10 h-10 text-white/20 mb-3" />
                <div className="text-sm font-medium text-white/80 mb-1">
                  No Diagnosis Records Yet
                </div>
                <p className="text-xs max-w-xs text-white/50 leading-relaxed">
                  Whenever you diagnose a plant in the Disease Detector, your pathology report is automatically saved here.
                </p>
              </div>
            ) : (
              scans.map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => handleSelectDiagnosis(scan)}
                  className="group p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none"
                  style={{
                    backgroundColor: '#0f2414',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#15311b';
                    e.currentTarget.style.borderColor = 'rgba(199, 234, 107, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0f2414';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  title="Click to view this diagnosis on your dashboard"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 shrink-0"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.18)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        <Sprout className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-white truncate">
                        {scan.plant_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-white/50 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(scan.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteScan(e, scan.id)}
                        className="p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                        title="Delete this record"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Disease Name */}
                  <div className="text-sm font-serif font-bold text-white mb-1.5 group-hover:text-[#c7ea6b] transition-colors flex items-center gap-2">
                    <span className="text-rose-400">●</span>
                    <span className="truncate">{scan.disease_name}</span>
                  </div>

                  {/* Recommendations summary */}
                  {scan.recommendations && (
                    <p 
                      className="text-xs text-white/70 leading-relaxed mb-2.5 font-sans"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxHeight: '2.4rem',
                      }}
                    >
                      {scan.recommendations}
                    </p>
                  )}

                  {/* Footer status & Action */}
                  <div 
                    className="flex items-center justify-between text-[11px] pt-1.5"
                    style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    {scan.status === 'Species Mismatch' ? (
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Species Mismatch
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {scan.status || 'Diagnosed'}
                      </span>
                    )}
                    <span className="text-[#c7ea6b] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Load into Dashboard</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))
            )
          )}

          {/* ═════════════════════════════════════════════════════════════
              TAB 2: FARMING GUIDANCE ADVISORIES
              ═════════════════════════════════════════════════════════════ */}
          {drawerTab === 'farming' && (
            loadingFarming && farmingPlans.length === 0 ? (
              <div className="py-20 text-center text-white/50 flex flex-col items-center">
                <RefreshCw className="w-8 h-8 text-[#c7ea6b] animate-spin mb-3" />
                <div className="text-xs">Loading past farming plans...</div>
              </div>
            ) : farmingPlans.length === 0 ? (
              <div className="py-20 text-center text-white/50 flex flex-col items-center">
                <Sprout className="w-10 h-10 text-white/20 mb-3" />
                <div className="text-sm font-medium text-white/80 mb-1">
                  No Farming Guidance Records Yet
                </div>
                <p className="text-xs max-w-xs text-white/50 leading-relaxed">
                  Whenever you generate custom farming guidance for a crop in the Farming Guidance tab, your precision agronomic plan is automatically saved here.
                </p>
              </div>
            ) : (
              farmingPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => handleSelectFarmingPlan(plan)}
                  className="group p-3 sm:p-3.5 rounded-2xl transition-all duration-200 cursor-pointer select-none"
                  style={{
                    backgroundColor: '#0f2414',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#15311b';
                    e.currentTarget.style.borderColor = 'rgba(199, 234, 107, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0f2414';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  title="Click to view and load this farming plan into dashboard"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c7ea6b] shrink-0"
                        style={{
                          backgroundColor: 'rgba(199, 234, 107, 0.18)',
                          border: '1px solid rgba(199, 234, 107, 0.35)',
                        }}
                      >
                        <Sprout className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-serif font-bold text-white group-hover:text-[#c7ea6b] transition-colors truncate">
                        {plan.plant_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-white/50 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(plan.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFarmingPlan(e, plan.id)}
                        className="p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                        title="Delete this farming plan"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Badges for Soil, Season, Location */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {plan.soil_type && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-white/80 border border-white/10 flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-[#c7ea6b]" />
                        <span>{plan.soil_type.split(' (')[0]}</span>
                      </span>
                    )}
                    {plan.season && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-white/80 border border-white/10 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-[#c7ea6b]" />
                        <span>{plan.season.split(' (')[0]}</span>
                      </span>
                    )}
                    {plan.location && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-white/80 border border-white/10 flex items-center gap-1 truncate max-w-[130px]">
                        <MapPin className="w-2.5 h-2.5 text-[#c7ea6b]" />
                        <span className="truncate">{plan.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Short 1-line advisory summary snippet */}
                  {plan.guide && (
                    <p 
                      className="text-xs text-white/60 leading-snug mb-2 font-sans"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxHeight: '1.25rem',
                      }}
                    >
                      {cleanPreviewText(plan.guide)}
                    </p>
                  )}

                  {/* Footer status & Action */}
                  <div 
                    className="flex items-center justify-between text-[11px] pt-1.5"
                    style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {plan.status || 'Advisory Ready'}
                    </span>
                    <span className="text-[#c7ea6b] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Load into Dashboard</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-3.5 flex items-center justify-between text-xs text-white/60 shrink-0"
          style={{
            backgroundColor: '#061007',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#c7ea6b]" />
            Synced with Database
          </span>
          <span className="font-mono text-[10px] text-[#c7ea6b]">PlantGuardian AI</span>
        </div>
      </aside>
    </div>,
    document.body
  );
};
