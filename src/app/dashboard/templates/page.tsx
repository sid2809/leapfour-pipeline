'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronRight, ChevronDown, Save } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_COLORS, VARIABLE_AVAILABILITY } from '@/lib/constants';

// ---------- Types ----------

interface Template {
  id: string;
  category: string;
  sequenceNumber: number;
  subject: string;
  body: string;
}

interface PreviewLead {
  id: string;
  businessName: string | null;
  email: string | null;
  category: string | null;
  campaign: { name: string };
}

interface Preview {
  subject: string;
  body: string;
  missingVars: string[];
}

const TEMPLATE_CATEGORIES = [
  'INVISIBLE', 'REVIEWS-WEAK', 'SLOW-SITE', 'NO-WEBSITE', 'STRONG-BUT-NO-ADS',
];

const SEQUENCE_LABELS = ['Email 1', 'Email 2', 'Email 3', 'Email 4', 'Email 5', 'Email 6'];

// ---------- Component ----------

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Template[]>>({});
  const [loading, setLoading] = useState(true);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Editor state
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Preview state
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ---------- Fetch templates ----------

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/templates', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates || []);
      setGrouped(data.grouped || {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Fetch preview leads
  useEffect(() => {
    async function loadLeads() {
      const res = await fetch('/api/templates/leads', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPreviewLeads(data.leads || []);
      }
    }
    loadLeads();
  }, []);

  // ---------- Select template ----------

  function handleSelectTemplate(template: Template) {
    if (hasChanges && selectedTemplate) {
      const confirmed = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
    }
    setSelectedTemplate(template);
    setEditSubject(template.subject);
    setEditBody(template.body);
    setHasChanges(false);
    setPreview(null);
    setSelectedLeadId('');
  }

  function handleSubjectChange(value: string) {
    setEditSubject(value);
    setHasChanges(value !== selectedTemplate?.subject || editBody !== selectedTemplate?.body);
  }

  function handleBodyChange(value: string) {
    setEditBody(value);
    setHasChanges(editSubject !== selectedTemplate?.subject || value !== selectedTemplate?.body);
  }

  // ---------- Save ----------

  async function handleSave() {
    if (!selectedTemplate) return;
    setSaving(true);
    const res = await fetch(`/api/templates/${selectedTemplate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subject: editSubject, body: editBody }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedTemplate(data.template);
      setHasChanges(false);
      toast.success('Template saved');
      fetchTemplates();
    } else {
      toast.error('Failed to save template');
    }
    setSaving(false);
  }

  // ---------- Insert variable ----------

  function insertVariable(varName: string) {
    if (!bodyRef.current) return;
    const textarea = bodyRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = `{{${varName}}}`;
    const newBody = editBody.slice(0, start) + text + editBody.slice(end);
    setEditBody(newBody);
    setHasChanges(true);
    // Restore cursor position after React re-render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }

  // ---------- Preview ----------

  async function handlePreview(leadId: string) {
    setSelectedLeadId(leadId);
    if (!leadId || !selectedTemplate) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    const res = await fetch('/api/templates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templateId: selectedTemplate.id, leadId }),
    });
    if (res.ok) {
      const data = await res.json();
      setPreview(data);
    } else {
      toast.error('Preview failed');
    }
    setPreviewLoading(false);
  }

  // ---------- Toggle category ----------

  function toggleCategory(cat: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // ---------- Find template for slot ----------

  function getTemplateForSlot(category: string, seq: number): Template | undefined {
    return (grouped[category] || []).find(t => t.sequenceNumber === seq);
  }

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="px-8 pt-5">
        <div className="h-6 w-24 bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-neutral-100 rounded animate-pulse mt-2" />
      </div>
    );
  }

  const availableVars = selectedTemplate
    ? VARIABLE_AVAILABILITY[selectedTemplate.category] || []
    : [];

  const allVars = [
    'Greeting', 'CompanyName', 'FirstName', 'Email', 'Phone', 'Website',
    'City', 'Country', 'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews',
    'PageSpeed', 'LoadTime', 'MobileScore', 'InLocalPack', 'SearchTerm',
    'Competitor1', 'Competitor2', 'Comp1Rating', 'Comp1Reviews',
    'SenderName', 'SenderTitle', 'PhysicalAddress', 'Personalization',
  ];

  return (
    <div className="flex h-full">
      {/* Left Column — Template sidebar */}
      <div className="w-[250px] flex-shrink-0 border-r border-neutral-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-neutral-100">
          <h1 className="text-[15px] font-semibold tracking-tight text-neutral-900">Templates</h1>
          <p className="text-[11px] text-neutral-400 mt-0.5">{templates.length} templates</p>
        </div>

        <div className="p-2">
          {TEMPLATE_CATEGORIES.map(cat => {
            const isExpanded = expandedCategories.has(cat);
            const catTemplates = grouped[cat] || [];
            return (
              <div key={cat} className="mb-1">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] || '#a3a3a3' }}
                  />
                  <span className="truncate">{CATEGORY_LABELS[cat] || cat}</span>
                  <span className="text-[10px] text-neutral-400 ml-auto">{catTemplates.length}</span>
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {SEQUENCE_LABELS.map((label, i) => {
                      const seq = i + 1;
                      const template = getTemplateForSlot(cat, seq);
                      const isSelected = selectedTemplate?.id === template?.id && !!template;
                      return (
                        <button
                          key={seq}
                          onClick={() => template && handleSelectTemplate(template)}
                          disabled={!template}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : template
                                ? 'text-neutral-600 hover:bg-neutral-50'
                                : 'text-neutral-300 cursor-not-allowed'
                          }`}
                        >
                          {label}
                          {!template && <span className="ml-1 text-[10px]">(empty)</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Column — Editor */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTemplate ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-neutral-400">Select a template from the left to start editing</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[selectedTemplate.category] || '#a3a3a3' }}
                  />
                  <h2 className="text-sm font-semibold text-neutral-900">
                    {CATEGORY_LABELS[selectedTemplate.category] || selectedTemplate.category} — Email {selectedTemplate.sequenceNumber}
                  </h2>
                </div>
                {hasChanges && (
                  <p className="text-[11px] text-amber-600 mt-0.5">Unsaved changes</p>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="inline-flex items-center gap-1.5 bg-neutral-900 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
              >
                <Save size={13} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => handleSubjectChange(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-neutral-200 rounded-md px-3 py-2 text-sm font-mono focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Body</label>
                <textarea
                  ref={bodyRef}
                  value={editBody}
                  onChange={e => handleBodyChange(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-neutral-200 rounded-md px-3 py-2 text-sm font-mono focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 outline-none resize-y"
                  style={{ minHeight: '300px' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column — Variables + Preview */}
      {selectedTemplate && (
        <div className="w-[300px] flex-shrink-0 border-l border-neutral-200 bg-white overflow-y-auto">
          {/* Variable Reference */}
          <div className="p-4 border-b border-neutral-100">
            <h3 className="text-xs font-semibold text-neutral-900 mb-2">Available Variables</h3>
            <div className="flex flex-wrap gap-1">
              {allVars.map(v => {
                const isAvailable = availableVars.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => isAvailable && insertVariable(v)}
                    disabled={!isAvailable}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isAvailable
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                        : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
                    }`}
                    title={isAvailable ? `Insert {{${v}}}` : `Not available for ${CATEGORY_LABELS[selectedTemplate.category]}`}
                  >
                    {`{{${v}}}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-neutral-900 mb-2">Preview with Lead</h3>
            <select
              value={selectedLeadId}
              onChange={e => handlePreview(e.target.value)}
              className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[11px] bg-white outline-none focus:border-blue-600 mb-3"
            >
              <option value="">Select a lead...</option>
              {previewLeads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.businessName || 'Unknown'} ({lead.email}) — {lead.campaign.name}
                </option>
              ))}
            </select>

            {previewLoading && (
              <div className="text-[11px] text-neutral-400">Loading preview...</div>
            )}

            {preview && !previewLoading && (
              <div className="space-y-3">
                {preview.missingVars.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                    <p className="text-[10px] text-amber-700 font-medium">Missing variables:</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">{preview.missingVars.map(v => `{{${v}}}`).join(', ')}</p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-medium text-neutral-500 mb-1">Subject</p>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-1.5 text-xs text-neutral-800">
                    {preview.subject}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-neutral-500 mb-1">Body</p>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-2 text-xs text-neutral-800 whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                    {preview.body}
                  </div>
                </div>
              </div>
            )}

            {!preview && !previewLoading && selectedLeadId === '' && (
              <p className="text-[11px] text-neutral-400">Select a lead above to see a live preview of this template.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
