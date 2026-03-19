'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalCampaigns: number;
  totalLeads: number;
  totalReady: number;
  totalParked: number;
}

interface Campaign {
  id: string;
  name: string;
  niche: string;
  city: string;
  country: string;
  status: string;
  totalFiltered: number;
  createdAt: string;
}

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-neutral-400',
  SCRAPING: 'bg-blue-500 animate-pulse',
  FILTERING: 'bg-blue-500',
  ENRICHING: 'bg-amber-500 animate-pulse',
  CATEGORIZING: 'bg-amber-500',
  READY: 'bg-green-500',
  EXPORTED: 'bg-green-500',
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
  FAILED: 'bg-red-50 text-red-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, campsRes] = await Promise.all([
        fetch('/api/dashboard/stats', { credentials: 'include' }),
        fetch('/api/campaigns?limit=5', { credentials: 'include' }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (campsRes.ok) {
        const data = await campsRes.json();
        setCampaigns(data.campaigns || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="px-8 pt-5">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Dashboard
        </h1>
        <Link
          href="/dashboard/campaigns/new"
          className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-700"
        >
          New Campaign
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mt-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Campaigns" value={stats?.totalCampaigns ?? 0} />
            <StatCard label="Total Leads" value={stats?.totalLeads ?? 0} />
            <StatCard label="Leads Ready" value={stats?.totalReady ?? 0} />
            <StatCard label="Leads Parked" value={stats?.totalParked ?? 0} />
          </>
        )}
      </div>

      {/* Recent Campaigns */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
            Recent Campaigns
          </h2>
          {campaigns.length > 0 && (
            <Link href="/dashboard/campaigns" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full mb-2" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-400">No campaigns yet</p>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-block mt-3 bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-neutral-800"
            >
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Name</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Niche</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Location</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Status</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Leads</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                    className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{c.niche}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{c.city}, {c.country}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STATUS_BADGE[c.status] || 'bg-neutral-100 text-neutral-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] || 'bg-neutral-400'}`} />
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500 text-right font-[tabular-nums]">{c.totalFiltered}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400 text-right font-[tabular-nums]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-neutral-900 mt-1 font-[tabular-nums]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
