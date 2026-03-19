'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';

const COUNTRIES = ['US', 'UK', 'India', 'Australia', 'Canada', 'Other'];

export default function NewCampaignPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('US');
  const [customCountry, setCustomCountry] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [leadTarget, setLeadTarget] = useState('500');
  const [isTest, setIsTest] = useState(false);

  const [searchQueryOverride, setSearchQueryOverride] = useState('');
  const [serpKeywordOverride, setSerpKeywordOverride] = useState('');
  const [overscrapeMultOverride, setOverscrapeMultOverride] = useState('');

  const effectiveCountry = country === 'Other' ? customCountry : country;

  const suggestedName = useMemo(() => {
    if (!niche || !city) return '';
    const month = new Date().toLocaleString('default', { month: 'short' });
    const year = new Date().getFullYear();
    return `${niche} - ${city} - ${month} ${year}`;
  }, [niche, city]);

  const [name, setName] = useState('');
  const displayName = name || suggestedName;

  const defaultSearchQuery = useMemo(() => {
    if (!niche || !city) return '';
    if (stateRegion) return `${niche} in ${city}, ${stateRegion}, ${effectiveCountry}`;
    return `${niche} in ${city}, ${effectiveCountry}`;
  }, [niche, city, stateRegion, effectiveCountry]);

  const overscrapeMult = parseFloat(overscrapeMultOverride) || 2.5;
  const target = isTest ? 5 : parseInt(leadTarget) || 500;
  const scrapeEstimate = isTest ? 10 : Math.ceil(target * overscrapeMult);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!niche || !city || !effectiveCountry) {
      toast.error('Please fill in Niche, City, and Country');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: displayName,
          niche,
          city,
          country: effectiveCountry,
          stateRegion: stateRegion || null,
          leadTarget: target,
          searchQueryOverride: searchQueryOverride || null,
          serpKeywordOverride: serpKeywordOverride || null,
          overscrapeMultOverride: overscrapeMultOverride || null,
          isTest,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create campaign');
        return;
      }

      toast.success('Campaign created');
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch {
      toast.error('Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-8 pt-5 max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        New Campaign
      </h1>
      <p className="text-sm text-neutral-500 mt-1">
        Configure and launch a lead generation campaign
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={suggestedName || 'e.g. plumber - Dallas - Mar 2026'}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
            />
          </div>

          {/* Niche */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Niche / Business Type</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="plumber"
              required
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Enter the service keyword as a customer would search it. Use singular: &apos;plumber&apos; not &apos;plumbers&apos;.
            </p>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Dallas"
              required
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Country</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
            >
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {country === 'Other' && (
              <input
                type="text"
                value={customCountry}
                onChange={e => setCustomCountry(e.target.value)}
                placeholder="Enter country"
                required
                className="w-full mt-2 border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
              />
            )}
          </div>

          {/* State/Region */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              State / Region <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={stateRegion}
              onChange={e => setStateRegion(e.target.value)}
              placeholder="Texas"
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
            />
          </div>

          {/* Lead Target */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Lead Target</label>
            <input
              type="number"
              value={isTest ? '5' : leadTarget}
              onChange={e => setLeadTarget(e.target.value)}
              disabled={isTest}
              min={1}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none tabular-nums disabled:opacity-50"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              System will scrape ~{scrapeEstimate} businesses to achieve this target
            </p>
          </div>

          {/* Test Mode */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTest}
              onChange={e => setIsTest(e.target.checked)}
              className="accent-neutral-900"
            />
            <span className="text-sm text-neutral-700">Test mode — scrape only 10 businesses</span>
          </label>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <span>Advanced Settings</span>
            {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 space-y-4 border-t border-neutral-100 pt-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Search Query Override</label>
                <input
                  type="text"
                  value={searchQueryOverride}
                  onChange={e => setSearchQueryOverride(e.target.value)}
                  placeholder={defaultSearchQuery}
                  className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">SERP Keyword Override</label>
                <input
                  type="text"
                  value={serpKeywordOverride}
                  onChange={e => setSerpKeywordOverride(e.target.value)}
                  placeholder={niche || 'niche keyword'}
                  className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Overscrape Multiplier Override</label>
                <input
                  type="number"
                  step="0.1"
                  value={overscrapeMultOverride}
                  onChange={e => setOverscrapeMultOverride(e.target.value)}
                  placeholder="2.5"
                  className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA] focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none tabular-nums"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !niche || !city || !effectiveCountry}
          className="w-full bg-green-600 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Starting Campaign...' : 'Start Campaign'}
        </button>
      </form>
    </div>
  );
}
