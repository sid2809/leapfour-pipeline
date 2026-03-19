'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Search, RefreshCw, Zap, Download, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORIES } from '@/lib/constants';

// ---------- Types ----------

interface Campaign {
  id: string;
  name: string;
  niche: string;
  searchQuery: string;
  serpKeyword: string;
  city: string;
  country: string;
  stateRegion: string | null;
  leadTarget: number;
  overscrapeMult: number;
  isTest: boolean;
  status: string;
  exportStatus: string | null;
  outscraperId: string | null;
  totalScraped: number;
  totalFiltered: number;
  totalParked: number;
  totalEnriched: number;
  totalFailed: number;
  pipelineStartedAt: string | null;
  createdAt: string;
  stats: {
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    totalLeads: number;
    totalExported: number;
    totalReady: number;
    totalCategorized: number;
    totalSkipped: number;
  };
}

interface Lead {
  id: string;
  status: string;
  businessName: string;
  email: string | null;
  emailType: string | null;
  phone: string | null;
  websiteDisplay: string | null;
  city: string | null;
  googleRating: number | null;
  reviewCount: number | null;
  pagespeedScore: number | null;
  pagespeedMobile: number | null;
  inLocalPack: boolean | null;
  hasPaidAds: boolean | null;
  category: string | null;
  competitor1Name: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface LeadPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------- Status styling ----------

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-neutral-400',
  SCRAPING: 'bg-blue-500 animate-pulse',
  FILTERING: 'bg-blue-500',
  ENRICHING: 'bg-amber-500 animate-pulse',
  CATEGORIZING: 'bg-amber-500',
  READY: 'bg-green-500',
  EXPORTED: 'bg-green-500',
  PARTIALLY_EXPORTED: 'bg-green-500',
  FAILED: 'bg-red-500',
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-500',
  SCRAPING: 'bg-blue-50 text-blue-600',
  FILTERING: 'bg-blue-50 text-blue-600',
  ENRICHING: 'bg-blue-50 text-blue-600',
  CATEGORIZING: 'bg-blue-50 text-blue-600',
  READY: 'bg-green-50 text-green-600',
  EXPORTED: 'bg-neutral-100 text-neutral-500',
  PARTIALLY_EXPORTED: 'bg-green-50 text-green-600',
  FAILED: 'bg-red-50 text-red-600',
};

const PROGRESS_STEPS = ['SCRAPING', 'FILTERING', 'ENRICHING', 'CATEGORIZING', 'READY'];
const PROGRESS_TEXT: Record<string, string> = {
  SCRAPING: 'Scraping Google Maps via Outscraper...',
  FILTERING: 'Processing and filtering leads...',
  ENRICHING: 'Running PageSpeed tests & checking Google rankings... This takes 1-3 minutes.',
  CATEGORIZING: 'Scoring and categorizing leads...',
};

const CATEGORY_BADGE: Record<string, string> = {
  'INVISIBLE': 'bg-red-500/10 text-red-600',
  'REVIEWS-WEAK': 'bg-orange-500/10 text-orange-600',
  'SLOW-SITE': 'bg-yellow-500/10 text-yellow-600',
  'NO-WEBSITE': 'bg-gray-500/10 text-gray-600',
  'STRONG-BUT-NO-ADS': 'bg-green-500/10 text-green-600',
  'UNCATEGORIZED': 'bg-purple-500/10 text-purple-600',
};

// ---------- Component ----------

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadPagination, setLeadPagination] = useState<LeadPagination | null>(null);
  const [leadPage, setLeadPage] = useState(1);
  const [leadCategory, setLeadCategory] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadSortBy, setLeadSortBy] = useState('createdAt');
  const [leadSortDir, setLeadSortDir] = useState<'asc' | 'desc'>('desc');
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  // Export
  const [exportCategories, setExportCategories] = useState<{ category: string; count: number }[]>([]);
  const [pushingCategory, setPushingCategory] = useState<string | null>(null);
  const [downloadingCategory, setDownloadingCategory] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ---------- Fetch campaign ----------

  const fetchCampaign = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setCampaign(data);
      return data;
    }
    return null;
  }, [id]);

  // ---------- Fetch leads ----------

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    const params = new URLSearchParams({
      page: String(leadPage),
      limit: '50',
      sortBy: leadSortBy,
      sortDir: leadSortDir,
    });
    if (leadCategory) params.set('category', leadCategory);
    if (leadStatus) params.set('status', leadStatus);
    if (leadSearch) params.set('search', leadSearch);

    const res = await fetch(`/api/campaigns/${id}/leads?${params}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads || []);
      setLeadPagination(data.pagination);
    }
    setLeadsLoading(false);
  }, [id, leadPage, leadCategory, leadStatus, leadSearch, leadSortBy, leadSortDir]);

  // ---------- Fetch export categories ----------

  const fetchExportCategories = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}/export`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setExportCategories(data.categories || []);
    }
  }, [id]);

  // ---------- Initial load ----------

  useEffect(() => {
    async function load() {
      await fetchCampaign();
      setLoading(false);
    }
    load();
  }, [fetchCampaign]);

  useEffect(() => {
    if (!loading && campaign) {
      fetchLeads();
      if (['READY', 'EXPORTED', 'PARTIALLY_EXPORTED'].includes(campaign.status)) {
        fetchExportCategories();
      }
    }
  }, [loading, campaign?.status, fetchLeads, fetchExportCategories]);

  // ---------- Polling ----------

  useEffect(() => {
    if (!campaign) return;

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const isTerminal = ['READY', 'EXPORTED', 'PARTIALLY_EXPORTED', 'FAILED'].includes(campaign.status);
    if (isTerminal) return;

    if (campaign.status === 'SCRAPING') {
      pollingRef.current = setInterval(async () => {
        const res = await fetch(`/api/campaigns/${id}/scrape/status`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.campaignStatus !== 'SCRAPING') {
            await fetchCampaign();
            fetchLeads();
          }
        }
      }, 60000);
    } else {
      pollingRef.current = setInterval(async () => {
        const updated = await fetchCampaign();
        if (updated) {
          fetchLeads();
          const done = ['READY', 'EXPORTED', 'PARTIALLY_EXPORTED', 'FAILED'].includes(updated.status);
          if (done && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }, 5000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [campaign?.status, id, fetchCampaign, fetchLeads]);

  // ---------- Actions ----------

  async function handleRename() {
    if (!newName.trim()) return;
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setCampaign(prev => prev ? { ...prev, name: newName } : prev);
      setEditingName(false);
      toast.success('Name updated');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      toast.success('Campaign deleted');
      router.push('/dashboard/campaigns');
    } else {
      toast.error('Failed to delete campaign');
      setDeleting(false);
    }
  }

  function handleSort(col: string) {
    if (leadSortBy === col) {
      setLeadSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setLeadSortBy(col);
      setLeadSortDir('desc');
    }
    setLeadPage(1);
  }

  async function handleEnrich() {
    setEnriching(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/enrich`, {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(180000),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Enrichment complete: ${data.enriched} enriched, ${data.categorized} categorized`);
        await fetchCampaign();
        fetchLeads();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Enrichment failed');
      }
    } catch {
      toast.error('Enrichment request timed out or failed');
    }
    setEnriching(false);
  }

  async function handleRecategorize() {
    setCategorizing(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/categorize`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const counts = Object.entries(data.byCategory || {}).map(([k, v]) => `${CATEGORY_LABELS[k] || k}: ${v}`).join(', ');
        toast.success(`Re-categorized ${data.totalCategorized} leads. ${counts}`);
        await fetchCampaign();
        fetchLeads();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Categorization failed');
      }
    } catch {
      toast.error('Categorization failed');
    }
    setCategorizing(false);
  }

  async function handleDownloadCsv(category: string) {
    setDownloadingCategory(category);
    try {
      const res = await fetch(`/api/campaigns/${id}/export?category=${encodeURIComponent(category)}`, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Download failed');
        setDownloadingCategory(null);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${category}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
      fetchExportCategories();
      fetchCampaign();
      fetchLeads();
    } catch {
      toast.error('Download failed');
    }
    setDownloadingCategory(null);
  }

  async function handleDownloadAll() {
    setDownloadingAll(true);
    for (const { category } of exportCategories) {
      await handleDownloadCsv(category);
    }
    setDownloadingAll(false);
  }

  async function handlePushToInstantly(category: string) {
    setPushingCategory(category);
    try {
      const res = await fetch(`/api/campaigns/${id}/push-instantly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Pushed ${data.leadsAdded} leads to Instantly`);
        fetchExportCategories();
        fetchCampaign();
        fetchLeads();
      } else {
        toast.error(data.error || 'Push to Instantly failed');
      }
    } catch {
      toast.error('Push to Instantly failed');
    }
    setPushingCategory(null);
  }

  // ---------- Elapsed time ----------

  function getElapsedTime() {
    if (!campaign?.pipelineStartedAt) return '';
    const start = new Date(campaign.pipelineStartedAt).getTime();
    const diff = Math.floor((Date.now() - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  // ---------- Progress ----------

  function getProgressPercent() {
    if (!campaign) return 0;
    const idx = PROGRESS_STEPS.indexOf(campaign.status);
    if (idx === -1) return campaign.status === 'FAILED' ? 0 : 100;
    return Math.round(((idx + 0.5) / PROGRESS_STEPS.length) * 100);
  }

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="px-8 pt-5">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-4 gap-4 mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="px-8 pt-5">
        <p className="text-sm text-neutral-400">Campaign not found</p>
      </div>
    );
  }

  const isActive = ['SCRAPING', 'FILTERING', 'ENRICHING', 'CATEGORIZING'].includes(campaign.status);

  return (
    <div className="px-8 pt-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRename()}
                  className="border border-neutral-200 rounded-md px-2 py-1 text-xl font-semibold bg-[#FAFAFA] outline-none focus:border-blue-600"
                />
                <button onClick={handleRename} className="text-xs text-blue-600 hover:underline">Save</button>
                <button onClick={() => setEditingName(false)} className="text-xs text-neutral-400 hover:text-neutral-600">Cancel</button>
              </div>
            ) : (
              <h1
                className="text-xl font-semibold tracking-tight text-neutral-900 cursor-pointer hover:text-neutral-700"
                onClick={() => { setNewName(campaign.name); setEditingName(true); }}
                title="Click to edit"
              >
                {campaign.name}
              </h1>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STATUS_BADGE[campaign.status] || 'bg-neutral-100 text-neutral-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[campaign.status] || 'bg-neutral-400'}`} />
              {campaign.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">{campaign.niche}</span>
            <span className="text-xs text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">{campaign.city}</span>
            <span className="text-xs text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">{campaign.country}</span>
            {campaign.isTest && (
              <span className="text-[10px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 font-medium uppercase">Test</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === 'READY' && (
            <button
              onClick={handleRecategorize}
              disabled={categorizing}
              className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-700 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw size={13} className={categorizing ? 'animate-spin' : ''} />
              {categorizing ? 'Re-categorizing...' : 'Re-categorize All'}
            </button>
          )}
          {(campaign.status === 'ENRICHING' || campaign.status === 'FAILED' || campaign.stats.byStatus?.['FILTERED'] > 0) && (
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="inline-flex items-center gap-1.5 bg-neutral-900 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              <Zap size={13} className={enriching ? 'animate-pulse' : ''} />
              {enriching ? 'Enrichment running...' : 'Run Enrichment'}
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Delete this campaign?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-neutral-400 hover:text-neutral-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-neutral-400 hover:text-red-600"
              title="Delete campaign"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {isActive && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-neutral-700">{PROGRESS_TEXT[campaign.status] || 'Processing...'}</p>
            <span className="text-xs text-neutral-400 font-[tabular-nums]">{getElapsedTime()}</span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
          {campaign.status === 'SCRAPING' && (
            <p className="text-[11px] text-neutral-400 mt-2">Polling every 60 seconds. This usually takes 15-25 minutes.</p>
          )}
          {campaign.status === 'ENRICHING' && (
            <p className="text-[11px] text-neutral-400 mt-2">Enrichment runs automatically. PageSpeed tests + SERP checks take 1-3 minutes.</p>
          )}
        </div>
      )}

      {/* Failed state */}
      {campaign.status === 'FAILED' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-5">
          <p className="text-sm text-red-600 font-medium">Campaign failed</p>
          <p className="text-xs text-red-500 mt-1">Check the job logs for details.</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-3 mt-5">
        <StatCard label="Scraped" value={campaign.totalScraped} />
        <StatCard label="With Email" value={campaign.totalFiltered} />
        <StatCard label="Parked" value={campaign.totalParked} />
        <StatCard label="Enriched" value={campaign.totalEnriched} />
        <StatCard label="Failed" value={campaign.totalFailed} />
        <StatCard label="Exported" value={campaign.stats.totalExported} />
      </div>

      {/* Category Breakdown */}
      {Object.keys(campaign.stats.byCategory).length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 mt-5">
          <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900 mb-3">Category Breakdown</h3>
          <div className="space-y-2">
            {CATEGORIES.map(cat => {
              const count = campaign.stats.byCategory[cat] || 0;
              if (count === 0) return null;
              const max = Math.max(...Object.values(campaign.stats.byCategory));
              const pct = max > 0 ? (count / max) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500 w-32 shrink-0">{CATEGORY_LABELS[cat] || cat}</span>
                  <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] || '#a3a3a3' }}
                    />
                  </div>
                  <span className="text-xs text-neutral-700 font-medium font-[tabular-nums] w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Section */}
      {['READY', 'EXPORTED', 'PARTIALLY_EXPORTED'].includes(campaign.status) && exportCategories.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900">Export</h3>
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="inline-flex items-center gap-1.5 bg-neutral-900 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              <Download size={13} />
              {downloadingAll ? 'Downloading...' : 'Download All CSVs'}
            </button>
          </div>
          <div className="space-y-2">
            {exportCategories.map(({ category, count }) => (
              <div key={category} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${CATEGORY_BADGE[category] || 'bg-neutral-100 text-neutral-500'}`}>
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <span className="text-xs text-neutral-400 font-[tabular-nums]">{count} leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadCsv(category)}
                    disabled={downloadingCategory === category}
                    className="inline-flex items-center gap-1 border border-neutral-200 bg-white text-neutral-700 rounded-md px-2.5 py-1 text-[11px] font-medium hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <Download size={11} />
                    {downloadingCategory === category ? '...' : 'CSV'}
                  </button>
                  <button
                    onClick={() => handlePushToInstantly(category)}
                    disabled={pushingCategory === category}
                    className="inline-flex items-center gap-1 border border-neutral-200 bg-white text-neutral-700 rounded-md px-2.5 py-1 text-[11px] font-medium hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <Send size={11} />
                    {pushingCategory === category ? '...' : 'Instantly'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Table */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900">Leads</h3>
          <span className="text-xs text-neutral-400">{leadPagination?.total ?? 0} total</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={leadSearch}
              onChange={e => { setLeadSearch(e.target.value); setLeadPage(1); }}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md bg-white outline-none focus:border-blue-600 w-48"
            />
          </div>
          <select
            value={leadCategory}
            onChange={e => { setLeadCategory(e.target.value); setLeadPage(1); }}
            className="border border-neutral-200 rounded-md px-2 py-1.5 text-xs bg-white outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
            ))}
          </select>
          <select
            value={leadStatus}
            onChange={e => { setLeadStatus(e.target.value); setLeadPage(1); }}
            className="border border-neutral-200 rounded-md px-2 py-1.5 text-xs bg-white outline-none"
          >
            <option value="">All Statuses</option>
            {['FILTERED', 'ENRICHED', 'CATEGORIZED', 'READY', 'EXPORTED', 'SKIPPED', 'PARKED'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {campaign.status === 'SCRAPING' && leads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-400">Waiting for Outscraper results...</p>
            <p className="text-xs text-neutral-300 mt-1">This usually takes 15-25 minutes.</p>
          </div>
        ) : leads.length === 0 && !leadsLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-400">No leads found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  {[
                    { key: 'businessName', label: 'Business' },
                    { key: 'email', label: 'Email' },
                    { key: 'googleRating', label: 'Rating' },
                    { key: 'reviewCount', label: 'Reviews' },
                    { key: 'pagespeedScore', label: 'PageSpeed' },
                    { key: 'inLocalPack', label: 'Local Pack' },
                    { key: 'category', label: 'Category' },
                    { key: 'status', label: 'Status' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3 cursor-pointer hover:text-neutral-700 select-none"
                    >
                      {col.label}
                      {leadSortBy === col.key && (
                        <span className="ml-1">{leadSortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  leads.map(lead => (
                    <tr key={lead.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900 max-w-[200px] truncate">{lead.businessName}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 max-w-[180px] truncate">{lead.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 font-[tabular-nums]">{lead.googleRating != null ? Number(lead.googleRating).toFixed(1) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 font-[tabular-nums]">{lead.reviewCount ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-[tabular-nums]">
                        {lead.pagespeedScore != null ? (
                          <span className={lead.pagespeedScore < 30 ? 'text-red-600 font-medium' : lead.pagespeedScore <= 60 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                            {lead.pagespeedScore}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {lead.inLocalPack === true ? (
                          <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-600">Yes</span>
                        ) : lead.inLocalPack === false ? (
                          <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-500">No</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {lead.category ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${CATEGORY_BADGE[lead.category] || 'bg-neutral-100 text-neutral-500'}`}>
                            {CATEGORY_LABELS[lead.category] || lead.category}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STATUS_BADGE[lead.status] || 'bg-neutral-100 text-neutral-500'}`}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {leadPagination && leadPagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              onClick={() => setLeadPage(p => Math.max(1, p - 1))}
              disabled={leadPage === 1}
              className="border border-neutral-200 bg-white text-neutral-700 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-neutral-500">
              Page {leadPage} of {leadPagination.totalPages}
            </span>
            <button
              onClick={() => setLeadPage(p => Math.min(leadPagination.totalPages, p + 1))}
              disabled={leadPage === leadPagination.totalPages}
              className="border border-neutral-200 bg-white text-neutral-700 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="text-lg font-semibold tracking-tight text-neutral-900 mt-0.5 font-[tabular-nums]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
