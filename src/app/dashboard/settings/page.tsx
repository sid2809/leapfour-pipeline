'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SETTINGS_KEYS = {
  outscraper_api_key: '',
  dataforseo_login: '',
  dataforseo_password: '',
  pagespeed_api_key: '',
  instantly_api_key: '',
  sender_name: '',
  sender_title: '',
  physical_address: '',
  company_legal_name: '',
  scoring_reviews_rating_threshold: '4.0',
  scoring_reviews_count_threshold: '15',
  scoring_pagespeed_threshold: '50',
  scoring_strong_rating_threshold: '4.3',
  scoring_strong_reviews_threshold: '30',
  overscrape_multiplier: '2.5',
};

type TestStatus = {
  loading: boolean;
  success?: boolean;
  message?: string;
};

export default function SettingsPage() {
  const { data, isLoading } = useSWR('/api/settings', fetcher);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, TestStatus>>({});
  const [initialized, setInitialized] = useState(false);

  const settings: Record<string, string> = data?.settings ?? {};

  if (data && !initialized) {
    const merged: Record<string, string> = {};
    for (const key of Object.keys(SETTINGS_KEYS)) {
      merged[key] = settings[key] ?? SETTINGS_KEYS[key as keyof typeof SETTINGS_KEYS];
    }
    setValues(merged);
    setInitialized(true);
  }

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => new Set(prev).add(key));
  }

  function togglePassword(key: string) {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleTest(service: string) {
    setTestStatus((prev) => ({
      ...prev,
      [service]: { loading: true },
    }));

    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      setTestStatus((prev) => ({
        ...prev,
        [service]: {
          loading: false,
          success: data.success,
          message: data.success ? data.message : data.error,
        },
      }));
    } catch {
      setTestStatus((prev) => ({
        ...prev,
        [service]: { loading: false, success: false, message: 'Request failed' },
      }));
    }
  }

  async function handleSave() {
    if (dirty.size === 0) return;
    setSaving(true);

    const changed: Record<string, string> = {};
    for (const key of Array.from(dirty)) {
      changed[key] = values[key];
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changed),
      });

      if (res.ok) {
        toast.success('Settings saved');
        setDirty(new Set());
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !initialized) {
    return (
      <div className="px-8 pt-5">
        <div className="h-6 w-24 bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-neutral-100 rounded animate-pulse mt-2" />
        <div className="max-w-2xl mt-5 space-y-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-neutral-200 rounded-lg p-6 h-48 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full bg-[#FAFAFA] border border-neutral-200 rounded-md px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none';
  const labelClass = 'block text-xs font-medium text-neutral-500 mb-1.5';

  return (
    <div className="px-8 pt-5 pb-10">
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        Settings
      </h1>
      <p className="text-sm text-neutral-500 mt-1">
        API keys, sender information, and scoring thresholds
      </p>

      <div className="max-w-2xl mt-5 space-y-5">
        {/* API Keys */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold mb-4">API Keys</h2>

          <div className="space-y-4">
            <ApiKeyField
              label="Outscraper API Key"
              settingsKey="outscraper_api_key"
              value={values.outscraper_api_key ?? ''}
              onChange={(v) => handleChange('outscraper_api_key', v)}
              showPassword={showPassword.outscraper_api_key}
              onTogglePassword={() => togglePassword('outscraper_api_key')}
              onTest={() => handleTest('outscraper')}
              testStatus={testStatus.outscraper}
              inputClass={inputClass}
              labelClass={labelClass}
            />

            <div>
              <label className={labelClass}>DataForSEO Login</label>
              <input
                type="text"
                value={values.dataforseo_login ?? ''}
                onChange={(e) => handleChange('dataforseo_login', e.target.value)}
                className={inputClass}
              />
            </div>

            <ApiKeyField
              label="DataForSEO Password"
              settingsKey="dataforseo_password"
              value={values.dataforseo_password ?? ''}
              onChange={(v) => handleChange('dataforseo_password', v)}
              showPassword={showPassword.dataforseo_password}
              onTogglePassword={() => togglePassword('dataforseo_password')}
              onTest={() => handleTest('dataforseo')}
              testStatus={testStatus.dataforseo}
              inputClass={inputClass}
              labelClass={labelClass}
            />

            <ApiKeyField
              label="PageSpeed API Key"
              settingsKey="pagespeed_api_key"
              value={values.pagespeed_api_key ?? ''}
              onChange={(v) => handleChange('pagespeed_api_key', v)}
              showPassword={showPassword.pagespeed_api_key}
              onTogglePassword={() => togglePassword('pagespeed_api_key')}
              onTest={() => handleTest('pagespeed')}
              testStatus={testStatus.pagespeed}
              inputClass={inputClass}
              labelClass={labelClass}
            />

            <ApiKeyField
              label="Instantly API Key"
              settingsKey="instantly_api_key"
              value={values.instantly_api_key ?? ''}
              onChange={(v) => handleChange('instantly_api_key', v)}
              showPassword={showPassword.instantly_api_key}
              onTogglePassword={() => togglePassword('instantly_api_key')}
              onTest={() => handleTest('instantly')}
              testStatus={testStatus.instantly}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          </div>
        </div>

        {/* Sender Information */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold mb-4">Sender Information</h2>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Sender Name</label>
              <input
                type="text"
                value={values.sender_name ?? ''}
                onChange={(e) => handleChange('sender_name', e.target.value)}
                placeholder="e.g., Siddharth"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sender Title</label>
              <input
                type="text"
                value={values.sender_title ?? ''}
                onChange={(e) => handleChange('sender_title', e.target.value)}
                placeholder="e.g., Founder, Leapfour Media"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Physical Address</label>
              <input
                type="text"
                value={values.physical_address ?? ''}
                onChange={(e) => handleChange('physical_address', e.target.value)}
                placeholder="Required for CAN-SPAM compliance"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Company Legal Name</label>
              <input
                type="text"
                value={values.company_legal_name ?? ''}
                onChange={(e) =>
                  handleChange('company_legal_name', e.target.value)
                }
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Scoring Thresholds */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold mb-4">Scoring Thresholds</h2>

          <div className="grid grid-cols-2 gap-x-5 gap-y-3">
            <div>
              <label className={labelClass}>Reviews Rating Threshold</label>
              <input
                type="number"
                step="0.1"
                value={values.scoring_reviews_rating_threshold ?? '4.0'}
                onChange={(e) =>
                  handleChange(
                    'scoring_reviews_rating_threshold',
                    e.target.value
                  )
                }
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelClass}>Reviews Count Threshold</label>
              <input
                type="number"
                value={values.scoring_reviews_count_threshold ?? '15'}
                onChange={(e) =>
                  handleChange(
                    'scoring_reviews_count_threshold',
                    e.target.value
                  )
                }
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelClass}>PageSpeed Threshold</label>
              <input
                type="number"
                value={values.scoring_pagespeed_threshold ?? '50'}
                onChange={(e) =>
                  handleChange('scoring_pagespeed_threshold', e.target.value)
                }
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelClass}>Strong Rating Threshold</label>
              <input
                type="number"
                step="0.1"
                value={values.scoring_strong_rating_threshold ?? '4.3'}
                onChange={(e) =>
                  handleChange(
                    'scoring_strong_rating_threshold',
                    e.target.value
                  )
                }
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelClass}>Strong Reviews Threshold</label>
              <input
                type="number"
                value={values.scoring_strong_reviews_threshold ?? '30'}
                onChange={(e) =>
                  handleChange(
                    'scoring_strong_reviews_threshold',
                    e.target.value
                  )
                }
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelClass}>Overscrape Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={values.overscrape_multiplier ?? '2.5'}
                onChange={(e) =>
                  handleChange('overscrape_multiplier', e.target.value)
                }
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 mt-3">
            After changing thresholds, use &apos;Re-categorize All&apos; on any
            campaign to apply.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={saving || dirty.size === 0}
          className="bg-neutral-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function ApiKeyField({
  label,
  settingsKey,
  value,
  onChange,
  showPassword,
  onTogglePassword,
  onTest,
  testStatus,
  inputClass,
  labelClass,
}: {
  label: string;
  settingsKey: string;
  value: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  onTest: () => void;
  testStatus?: TestStatus;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} font-mono pr-9`}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          type="button"
          onClick={onTest}
          disabled={testStatus?.loading}
          className="border border-neutral-200 bg-white text-neutral-500 text-xs px-3 py-2 rounded-md hover:bg-neutral-50 disabled:opacity-50"
        >
          {testStatus?.loading ? '...' : 'Test'}
        </button>
      </div>
      {testStatus && !testStatus.loading && testStatus.success !== undefined && (
        <p
          className={`text-[11px] mt-1.5 ${
            testStatus.success ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {testStatus.success ? `✓ ${testStatus.message}` : `✗ ${testStatus.message}`}
        </p>
      )}
    </div>
  );
}
