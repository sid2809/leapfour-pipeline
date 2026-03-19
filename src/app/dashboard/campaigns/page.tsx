'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface Campaign {
  id: string;
  name: string;
  niche: string;
  city: string;
  country: string;
  status: string;
  leadTarget: number;
  totalScraped: number;
  totalFiltered: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/campaigns?page=${page}&limit=20`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setPagination(data.pagination);
      }
      setLoading(false);
    }
    load();
  }, [page]);

  return (
    <div className="px-8 pt-5">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Campaigns
        </h1>
        <Link
          href="/dashboard/campaigns/new"
          className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-700"
        >
          New Campaign
        </Link>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            {Array.from({ length: 5 }).map((_, i) => (
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
          <>
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Name</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Niche</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">City</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Country</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Status</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Target</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Scraped</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-4 py-3">Filtered</th>
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
                      <td className="px-4 py-3 text-sm text-neutral-500">{c.city}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500">{c.country}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STATUS_BADGE[c.status] || 'bg-neutral-100 text-neutral-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] || 'bg-neutral-400'}`} />
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500 text-right font-[tabular-nums]">{c.leadTarget}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 text-right font-[tabular-nums]">{c.totalScraped}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 text-right font-[tabular-nums]">{c.totalFiltered}</td>
                      <td className="px-4 py-3 text-xs text-neutral-400 text-right font-[tabular-nums]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border border-neutral-200 bg-white text-neutral-700 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-neutral-500">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="border border-neutral-200 bg-white text-neutral-700 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
