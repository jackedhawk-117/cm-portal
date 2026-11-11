import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Paperclip,
  PencilLine,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useTitle } from '../../hooks/useTitle';
import { Field, InlineError, Spinner } from '../../components/ui';
import { AiSuggestionCard } from '../../components/AiSuggestionCard';
import { KERALA_DISTRICTS, PRIORITIES } from '../../lib/constants';
import { formatBytes } from '../../lib/format';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function NewGrievance() {
  useTitle('Submit a grievance');
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    district: '',
    category_id: '',
    subject: '',
    description: '',
    priority: 'Medium',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analyzedText, setAnalyzedText] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.category_id)),
    [categories, form.category_id],
  );

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    if (key === 'category_id' || key === 'priority') setAccepted(false);
  };

  const handleFile = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setErrors((c) => ({ ...c, file: 'Only JPG, PNG or PDF files are allowed' }));
      setFile(null);
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setErrors((c) => ({ ...c, file: 'File must be 5 MB or smaller' }));
      setFile(null);
      e.target.value = '';
      return;
    }
    setErrors((c) => ({ ...c, file: undefined }));
    setFile(selected);
  };

  const removeFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const analyse = async () => {
    if (form.description.trim().length < 30) {
      setErrors((c) => ({ ...c, description: 'Write at least 30 characters before analysing' }));
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await api.post('/ai/analyze', {
        description: form.description,
        district: form.district || undefined,
      });
      setAnalysis(res.data);
      setAnalyzedText(form.description);
      setAccepted(false);
      toast.info(
        res.data.source === 'gemini'
          ? 'AI suggestion ready. Review and accept or edit it.'
          : 'Fallback suggestion ready (not AI). Review it carefully.',
      );
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptSuggestion = () => {
    if (!analysis) return;
    setForm((current) => ({
      ...current,
      category_id: String(analysis.category.id),
      priority: analysis.priority,
    }));
    setAccepted(true);
    toast.success('Suggestion applied to the form. You can still edit it.');
  };

  const validate = () => {
    const next = {};
    if (!form.district) next.district = 'Select your district';
    if (!form.category_id) next.category_id = 'Select a category';
    if (form.subject.trim().length < 5) next.subject = 'Subject must be at least 5 characters';
    if (form.description.trim().length < 30) next.description = 'Description must be at least 30 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('district', form.district);
      payload.append('category_id', form.category_id);
      payload.append('subject', form.subject.trim());
      payload.append('description', form.description.trim());
      payload.append('priority', form.priority);
      if (analysis) {
        payload.append('ai_category', analysis.category.name);
        payload.append('ai_department', analysis.department?.code || '');
        payload.append('ai_priority', analysis.priority);
        payload.append('ai_priority_reason', analysis.priority_reason || '');
        payload.append('ai_summary', analysis.summary || '');
        payload.append('ai_language', analysis.language_detected || '');
        payload.append('ai_source', analysis.source || '');
        payload.append('ai_confidence', String(analysis.confidence ?? ''));
        payload.append('ai_accepted', accepted ? 'true' : 'false');
      }
      if (file) payload.append('attachment', file);

      const res = await api.postForm('/grievances', payload);
      toast.success(`Grievance submitted. Reference: ${res.data.ref_no}`);
      navigate(`/grievances/${res.data.id}?created=1`, { replace: true });
    } catch (err) {
      if (err.details?.length) {
        const mapped = {};
        for (const issue of err.details) mapped[issue.path] = issue.message;
        setErrors(mapped);
      }
      setSubmitError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const stale = analysis && analyzedText !== form.description;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/citizen" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-800">
          <ArrowLeft size={13} /> Back to my grievances
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand-700">New submission</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Submit a grievance</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Describe the issue clearly, choose the closest category and add evidence if you have it. The AI
          assistant can suggest a category and priority, but you stay in control.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]" noValidate>
        <div className="space-y-5">
          <div className="card card-pad space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Grievance details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="District" htmlFor="district" error={errors.district} required>
                <select id="district" className={`input ${errors.district ? 'input-error' : ''}`} value={form.district} onChange={setField('district')}>
                  <option value="">Select district</option>
                  {KERALA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Category" htmlFor="category" error={errors.category_id} required>
                <select id="category" className={`input ${errors.category_id ? 'input-error' : ''}`} value={form.category_id} onChange={setField('category_id')}>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            {selectedCategory && (
              <p className="-mt-1 text-xs text-slate-500">
                Usually handled by <span className="font-medium text-slate-700">{selectedCategory.department_name}</span>.
              </p>
            )}
            <Field label="Subject" htmlFor="subject" error={errors.subject} hint="A short headline, e.g. “Pothole near the school bus stop”" required>
              <input id="subject" className={`input ${errors.subject ? 'input-error' : ''}`} value={form.subject} onChange={setField('subject')} maxLength={150} placeholder="What is the issue?" />
            </Field>
            <Field
              label="Detailed description"
              htmlFor="description"
              error={errors.description}
              hint={`${form.description.length}/5000 characters · minimum 30. English and Malayalam are supported.`}
              required
            >
              <textarea
                id="description"
                rows={8}
                className={`input ${errors.description ? 'input-error' : ''}`}
                value={form.description}
                onChange={setField('description')}
                maxLength={5000}
                placeholder="Explain what happened, where, how long it has been going on, and who is affected."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Priority" htmlFor="priority" hint="You can accept the AI priority or choose your own." required>
                <select id="priority" className="input" value={form.priority} onChange={setField('priority')}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <div>
                <span className="label">Attachment (optional)</span>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50">
                  <Paperclip size={16} />
                  <span>{file ? 'Replace file' : 'Choose JPG, PNG or PDF'}</span>
                  <input ref={fileRef} type="file" className="sr-only" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={handleFile} />
                </label>
                <p className="hint">Maximum 5 MB. One file.</p>
                {file && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                    <FileText size={14} className="text-brand-700" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="text-slate-400">{formatBytes(file.size)}</span>
                    <button type="button" onClick={removeFile} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Remove attachment"><X size={14} /></button>
                  </div>
                )}
                {errors.file && <p className="field-error" role="alert">{errors.file}</p>}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Sparkles size={17} className="text-brand-700" /> AI grievance assistant
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Optional. Sends only your description and district to the server; the Gemini key stays on the server.
                </p>
              </div>
              <button type="button" onClick={analyse} className="btn-secondary" disabled={analyzing || form.description.trim().length < 30}>
                {analyzing ? <><Spinner /> Analysing…</> : analysis ? <><RefreshCw size={15} /> Re-analyse</> : <><Sparkles size={15} /> Analyse with AI</>}
              </button>
            </div>

            {analysisError && <div className="mt-3"><InlineError message={analysisError} /></div>}

            {analysis && (
              <div className="mt-4 space-y-3">
                {stale && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                    The description changed after this analysis. Re-analyse for an accurate suggestion.
                  </div>
                )}
                <AiSuggestionCard
                  ai={{
                    category: analysis.category.name,
                    department: analysis.department_code,
                    department_name: analysis.department?.name,
                    priority: analysis.priority,
                    priority_reason: analysis.priority_reason,
                    summary: analysis.summary,
                    confidence: analysis.confidence,
                    language: analysis.language_detected,
                    source: analysis.source,
                    accepted,
                  }}
                  duplicates={analysis.duplicates}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={acceptSuggestion} className="btn-primary btn-sm">
                    <CheckCircle2 size={14} /> Accept suggestion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccepted(false);
                      document.getElementById('category')?.focus();
                      toast.info('Edit the category and priority manually, then submit.');
                    }}
                    className="btn-secondary btn-sm"
                  >
                    <PencilLine size={14} /> Edit manually
                  </button>
                </div>
                {accepted && (
                  <p className="text-xs font-medium text-emerald-700">
                    AI suggestion accepted — it will be stored alongside your final choices for the CMO to review.
                  </p>
                )}
              </div>
            )}
            {!analysis && !analysisError && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                Write at least 30 characters, then select <strong>Analyse with AI</strong>. If the AI service is
                unavailable, a clearly labelled keyword fallback is used instead.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <h2 className="text-sm font-semibold text-slate-900">Before you submit</h2>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>• Use fictional details only in this prototype.</li>
              <li>• Include a landmark or ward to help the officer locate the issue.</li>
              <li>• Do not include Aadhaar, bank details or other sensitive personal data.</li>
              <li>• Abusive or irrelevant complaints may be closed by the CMO.</li>
            </ul>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
              <TriangleAlert size={14} className="mb-1" />
              AI output is advisory only. It never changes the official status and can be overridden by the CMO.
            </div>
          </div>

          {submitError && <InlineError message={submitError} />}
          <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
            {submitting ? <><Spinner /> Submitting…</> : <>Submit grievance <ArrowRight size={16} /></>}
          </button>
          <p className="text-center text-[11px] text-slate-500">
            You will receive a reference ID such as <span className="font-mono">CMK-2026-000123</span>.
          </p>
        </aside>
      </form>
    </div>
  );
}
