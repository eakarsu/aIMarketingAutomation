import { useEffect, useMemo, useState } from 'react';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  updatedAt: string;
}

function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (vars[k] !== undefined ? vars[k] : `{{${k}}}`));
}

const defaultVars: Record<string, string> = {
  firstName: 'Alex',
  lastName: 'Smith',
  company: 'Acme Corp',
  coupon: 'WELCOME10',
  discount: '20%',
};

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, string>>(defaultVars);

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/custom-views/email-templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setTemplates(data.templates || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectTemplate = (t: Template | null) => {
    if (t) {
      setSelId(t.id);
      setName(t.name);
      setSubject(t.subject);
      setBody(t.body);
    } else {
      setSelId(null);
      setName('');
      setSubject('');
      setBody('');
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/custom-views/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: selId || undefined, name, subject, body }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      await load();
      setSelId(data.template.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`/api/custom-views/email-templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (selId === id) selectTemplate(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const previewSubject = useMemo(() => renderTemplate(subject, vars), [subject, vars]);
  const previewBody = useMemo(() => renderTemplate(body, vars), [body, vars]);

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="email-template-editor">
      <h2 className="text-xl font-bold text-gray-900 mb-3">Email Template Editor</h2>
      {error && <div className="text-red-600 text-sm mb-2">Error: {error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Template list */}
        <div className="border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Templates</h3>
            <button
              onClick={() => selectTemplate(null)}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              data-testid="tpl-new"
            >
              + New
            </button>
          </div>
          <ul className="space-y-1 max-h-72 overflow-auto" data-testid="tpl-list">
            {templates.length === 0 && <li className="text-xs text-gray-500">No templates yet.</li>}
            {templates.map((t) => (
              <li key={t.id} className={`p-2 rounded text-sm cursor-pointer flex justify-between items-center ${selId === t.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'}`}>
                <span onClick={() => selectTemplate(t)} className="flex-1 truncate">{t.name}</span>
                <button onClick={() => remove(t.id)} className="text-xs text-red-600 ml-2 hover:underline">del</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Editor */}
        <div className="border border-gray-200 rounded p-3">
          <h3 className="font-semibold text-sm mb-2">Editor</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
            data-testid="tpl-name"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (use {{firstName}})"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
            data-testid="tpl-subject"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body (use {{vars}})"
            rows={10}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
            data-testid="tpl-body"
          />
          <button
            onClick={save}
            disabled={saving || !subject || !body}
            className="mt-2 px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 disabled:opacity-50"
            data-testid="tpl-save"
          >
            {saving ? 'Saving…' : selId ? 'Update' : 'Create'}
          </button>
        </div>

        {/* Preview */}
        <div className="border border-gray-200 rounded p-3">
          <h3 className="font-semibold text-sm mb-2">Preview</h3>
          <div className="mb-2">
            <label className="text-xs text-gray-600">Variables (JSON-ish)</label>
            <div className="space-y-1 mt-1">
              {Object.entries(vars).map(([k, v]) => (
                <div key={k} className="flex gap-1">
                  <span className="text-xs w-20 truncate text-gray-700">{k}</span>
                  <input
                    value={v}
                    onChange={(e) => setVars((p) => ({ ...p, [k]: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded px-1 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="text-xs text-gray-500">Subject</div>
            <div className="font-semibold text-sm" data-testid="tpl-preview-subject">{previewSubject || '—'}</div>
            <div className="text-xs text-gray-500 mt-2">Body</div>
            <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100" data-testid="tpl-preview-body">{previewBody || '—'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
