import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Flag,
  Gauge,
  Landmark,
  Lock,
  MapPin,
  MessageSquarePlus,
  PencilLine,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTitle } from '../hooks/useTitle';
import { AttachmentList } from '../components/AttachmentList';
import { AiSuggestionCard } from '../components/AiSuggestionCard';
import { Timeline } from '../components/Timeline';
import {
  Field,
  InlineError,
  OverdueBadge,
  PageLoader,
  PriorityBadge,
  SourceBadge,
  Spinner,
  Stars,
  StatusBadge,
} from '../components/ui';
import { formatDateTime, cx } from '../lib/format';
import { ROLE_LABELS } from '../lib/constants';

const DASHBOARD = { CITIZEN: '/citizen', CMO_ADMIN: '/cmo', DEPT_OFFICER: '/officer' };

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" onClick={copy} className="btn-secondary btn-sm" aria-label="Copy reference ID">
      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy ID</>}
    </button>
  );
}

function Collapsible({ title, children, defaultOpen = false, badge }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-900">
        <span className="flex items-center gap-2">{title}{badge}</span>
        <ChevronDown size={15} className="text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">{children}</div>
    </details>
  );
}

export default function GrievanceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const created = params.get('created') === '1';
  const [bannerOpen, setBannerOpen] = useState(created);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [assignDept, setAssignDept] = useState('');
  const [assignOfficer, setAssignOfficer] = useState('');
  const [assignRemark, setAssignRemark] = useState('');
  const [statusRemark, setStatusRemark] = useState('');
  const [reviewRemark, setReviewRemark] = useState('');
  const [remark, setRemark] = useState('');
  const [remarkInternal, setRemarkInternal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [escalateRemark, setEscalateRemark] = useState('');
  const [override, setOverride] = useState({ category_id: '', department_id: '', priority: '' });
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [reopenReason, setReopenReason] = useState('');

  useTitle(detail?.ref_no || 'Grievance detail');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/grievances/${id}`);
      setDetail(res.data);
      setOverride({
        category_id: String(res.data.category.id),
        department_id: res.data.department ? String(res.data.department.id) : '',
        priority: res.data.priority,
      });
      setFeedback({ rating: res.data.feedback?.rating || 0, comment: res.data.feedback?.comment || '' });
      setReportText(res.data.assignment?.action_taken_report || '');
      if (res.data.assignment) setAssignDept(String(res.data.assignment.department.id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'CMO_ADMIN') {
      Promise.all([api.get('/departments'), api.get('/categories')])
        .then(([d, c]) => {
          setDepartments(d.data);
          setCategories(c.data);
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!assignDept || user?.role !== 'CMO_ADMIN') return;
    let cancelled = false;
    api
      .get(`/users/officers?department_id=${assignDept}`)
      .then((res) => {
        if (cancelled) return;
        setOfficers(res.data);
        setAssignOfficer((current) =>
          res.data.some((o) => String(o.id) === String(current)) ? current : String(res.data[0]?.id || ''),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [assignDept, user]);

  const run = async (fn, message) => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fn();
      if (res?.data) setDetail(res.data);
      else await load();
      toast.success(message);
    } catch (err) {
      setActionError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader label="Loading grievance…" />;
  if (error) {
    return (
      <div className="card card-pad space-y-3 text-center">
        <AlertTriangle className="mx-auto text-rose-500" />
        <h1 className="text-lg font-semibold text-slate-900">Unable to open this grievance</h1>
        <p className="text-sm text-slate-600">{error.message}</p>
        <Link to={DASHBOARD[user?.role] || '/'} className="btn-secondary btn-sm">Back to dashboard</Link>
      </div>
    );
  }

  const isCitizen = user.role === 'CITIZEN';
  const isCmo = user.role === 'CMO_ADMIN';
  const isOfficer = user.role === 'DEPT_OFFICER';
  const actions = detail.available_actions || [];
  const can = (name) => actions.includes(name);

  const handleStatus = () =>
    run(
      () => api.patch(`/grievances/${detail.id}/status`, { status: 'Under Review', remark: statusRemark || undefined }),
      'Grievance moved to Under Review.',
    ).then(() => setStatusRemark(''));

  const handleAssign = () => {
    if (!assignDept || !assignOfficer) {
      setActionError('Select a department and an officer.');
      return;
    }
    run(
      () =>
        api.post(`/grievances/${detail.id}/assign`, {
          department_id: Number(assignDept),
          officer_id: Number(assignOfficer),
          remark: assignRemark || undefined,
        }),
      'Grievance forwarded to the department.',
    ).then(() => setAssignRemark(''));
  };

  const handleRemark = () => {
    if (remark.trim().length < 3) {
      setActionError('Enter a remark of at least 3 characters.');
      return;
    }
    run(
      () => api.post(`/grievances/${detail.id}/remarks`, { remark: remark.trim(), is_internal: remarkInternal }),
      remarkInternal ? 'Internal note added.' : 'Public remark added.',
    ).then(() => setRemark(''));
  };

  const handleEscalate = () =>
    run(
      () => api.post(`/grievances/${detail.id}/escalate`, { remark: escalateRemark || undefined }),
      'Grievance escalated and priority updated.',
    ).then(() => setEscalateRemark(''));

  const handleReview = (decision) =>
    run(
      () =>
        api.post(`/grievances/${detail.id}/report-review`, {
          decision,
          remark: reviewRemark || undefined,
        }),
      decision === 'ACCEPT' ? 'Report accepted and grievance resolved.' : 'Report sent back to the department.',
    ).then(() => setReviewRemark(''));

  const handleReport = () => {
    if (reportText.trim().length < 20) {
      setActionError('The action-taken report must be at least 20 characters.');
      return;
    }
    const form = new FormData();
    form.append('report', reportText.trim());
    if (reportFile) form.append('report_file', reportFile);
    run(
      () => api.postForm(`/grievances/${detail.id}/action-report`, form),
      'Action-taken report submitted for CMO review.',
    ).then(() => setReportFile(null));
  };

  const handleOverride = () =>
    run(
      () =>
        api.patch(`/grievances/${detail.id}`, {
          category_id: Number(override.category_id),
          department_id: override.department_id ? Number(override.department_id) : null,
          priority: override.priority,
        }),
      'Official fields updated.',
    );

  const handleStart = () =>
    run(
      () => api.patch(`/grievances/${detail.id}/status`, { status: 'In Progress', remark: 'Investigation started by the department officer.' }),
      'Investigation marked as started.',
    );

  const handleFeedback = () => {
    if (!feedback.rating) {
      setActionError('Select a rating from 1 to 5.');
      return;
    }
    run(
      () => api.post(`/grievances/${detail.id}/feedback`, { rating: feedback.rating, comment: feedback.comment || undefined }),
      'Thank you. Your feedback has been saved.',
    );
  };

  const handleReopen = () => {
    if (reopenReason.trim().length < 10) {
      setActionError('Please explain the reason in at least 10 characters.');
      return;
    }
    run(
      () => api.post(`/grievances/${detail.id}/reopen`, { reason: reopenReason.trim() }),
      'Grievance reopened. The CMO will review it again.',
    ).then(() => setReopenReason(''));
  };

  return (
    <div className="space-y-5">
      {bannerOpen && created && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <button type="button" onClick={() => setBannerOpen(false)} className="absolute right-3 top-3 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Dismiss">
            <X size={16} />
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-600 p-2 text-white"><CheckCircle2 size={20} /></span>
            <div>
              <h1 className="text-lg font-semibold text-emerald-950">Grievance submitted successfully</h1>
              <p className="text-sm text-emerald-800">Keep this reference ID to track your case.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-mono text-base font-bold tracking-wide text-emerald-900">
              {detail.ref_no}
            </span>
            <CopyButton value={detail.ref_no} />
          </div>
        </div>
      )}

      <div>
        <Link to={DASHBOARD[user.role] || '/'} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-800">
          <ArrowLeft size={13} /> Back to dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{detail.ref_no}</span>
              <StatusBadge status={detail.status} />
              <PriorityBadge priority={detail.priority} />
              <OverdueBadge overdue={detail.is_overdue} />
              {detail.escalation_count > 0 && (
                <span className="badge bg-rose-50 text-rose-700"><Flag size={11} /> Escalated ×{detail.escalation_count}</span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{detail.subject}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin size={13} /> {detail.district}</span>
              <span className="inline-flex items-center gap-1"><Landmark size={13} /> {detail.category.name}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> Submitted {formatDateTime(detail.created_at)}</span>
              <span className="inline-flex items-center gap-1"><Gauge size={13} /> SLA {detail.sla_days} days</span>
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton value={detail.ref_no} />
          </div>
        </div>
      </div>

      {actionError && <InlineError message={actionError} />}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <section className="card card-pad">
            <h2 className="text-base font-semibold text-slate-900">Grievance description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{detail.description}</p>
            <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
                <dd className="mt-1 font-medium text-slate-800">{detail.category.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned department</dt>
                <dd className="mt-1 font-medium text-slate-800">{detail.department?.name || 'Not assigned yet'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last updated</dt>
                <dd className="mt-1 font-medium text-slate-800">{formatDateTime(detail.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved at</dt>
                <dd className="mt-1 font-medium text-slate-800">{detail.resolved_at ? formatDateTime(detail.resolved_at) : '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="card card-pad">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Sparkles size={16} className="text-brand-700" /> AI-assisted triage
            </h2>
            <AiSuggestionCard
              ai={{
                category: detail.ai.category,
                department: detail.ai.department,
                priority: detail.ai.priority,
                priority_reason: detail.ai.priority_reason,
                summary: detail.ai.summary,
                confidence: detail.ai.confidence,
                language: detail.ai.language,
                source: detail.ai.source,
                accepted: detail.ai.accepted,
              }}
              duplicates={detail.duplicates}
            />
            {isCmo && (
              <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
                AI fields are advisory. Confirm or override the official category, department and priority in
                the actions panel. AI never changes the status.
              </p>
            )}
          </section>

          <section className="card card-pad">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <FileText size={16} className="text-brand-700" /> Attachments
            </h2>
            <AttachmentList attachments={detail.attachments} />
          </section>

          {detail.assignment && !isCitizen && (
            <section className="card card-pad">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Building2 size={16} className="text-brand-700" /> Action-taken report
                </h2>
                <span className={cx(
                  'badge',
                  detail.assignment.report_status === 'ACCEPTED' && 'bg-emerald-50 text-emerald-700',
                  detail.assignment.report_status === 'SUBMITTED' && 'bg-sky-50 text-sky-700',
                  detail.assignment.report_status === 'SENT_BACK' && 'bg-rose-50 text-rose-700',
                  detail.assignment.report_status === 'PENDING' && 'bg-slate-100 text-slate-600',
                )}>
                  {detail.assignment.report_status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {detail.assignment.department.name} · Officer {detail.assignment.officer.name} · Assigned {formatDateTime(detail.assignment.assigned_at)}
              </p>
              {detail.assignment.action_taken_report ? (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                  {detail.assignment.action_taken_report}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">The department has not submitted a report yet.</p>
              )}
              {detail.assignment.review_remark && (
                <p className="mt-2 text-xs text-slate-500"><strong>CMO review remark:</strong> {detail.assignment.review_remark}</p>
              )}
            </section>
          )}

          {detail.feedback && (
            <section className="card card-pad">
              <h2 className="text-base font-semibold text-slate-900">Citizen feedback</h2>
              <div className="mt-2 flex items-center gap-2">
                <Stars value={detail.feedback.rating} readOnly size={18} />
                <span className="text-xs text-slate-500">{detail.feedback.rating}/5 · {formatDateTime(detail.feedback.created_at)}</span>
              </div>
              {detail.feedback.comment && <p className="mt-2 text-sm text-slate-600">“{detail.feedback.comment}”</p>}
            </section>
          )}

          <section className="card card-pad">
            <h2 className="text-base font-semibold text-slate-900">Status history</h2>
            <p className="mt-1 text-xs text-slate-500">
              {isCitizen ? 'Only public-facing updates and remarks are shown here.' : 'Internal notes are visible to staff only.'}
            </p>
            <div className="mt-4">
              <Timeline events={detail.timeline} showActor={!isCitizen} />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card card-pad">
            <h2 className="text-sm font-semibold text-slate-900">Case summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <User size={15} className="mt-0.5 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-500">Citizen</dt>
                  <dd className="font-medium text-slate-800">{detail.citizen.name}</dd>
                  <dd className="text-xs text-slate-500">{detail.citizen.email}</dd>
                  {detail.citizen.mobile && <dd className="text-xs text-slate-500">{detail.citizen.mobile}</dd>}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 size={15} className="mt-0.5 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-500">Assigned department</dt>
                  <dd className="font-medium text-slate-800">{detail.department?.name || 'Awaiting assignment'}</dd>
                </div>
              </div>
              {detail.assignment && (
                <div className="flex items-start gap-2">
                  <User size={15} className="mt-0.5 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-500">Assigned officer</dt>
                    <dd className="font-medium text-slate-800">{detail.assignment.officer.name}</dd>
                    <dd className="text-xs text-slate-500">Report: {detail.assignment.report_status}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <CalendarDays size={15} className="mt-0.5 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-500">Created</dt>
                  <dd className="font-medium text-slate-800">{formatDateTime(detail.created_at)}</dd>
                </div>
              </div>
            </dl>
          </section>

          {/* CMO actions ------------------------------------------------- */}
          {isCmo && (
            <section className="card card-pad space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">CMO actions</h2>

              {can('move_under_review') && (
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-700">Take up for review</p>
                  <input
                    className="input mt-2 text-xs"
                    placeholder="Optional remark"
                    value={statusRemark}
                    onChange={(e) => setStatusRemark(e.target.value)}
                  />
                  <button type="button" className="btn-primary btn-sm mt-2 w-full" onClick={handleStatus} disabled={busy}>
                    {busy ? <Spinner size={14} /> : null} Move to Under Review
                  </button>
                </div>
              )}

              {can('assign') && (
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-700">Forward to a department</p>
                  <Field label="Department" htmlFor="assign-dept" className="mt-2">
                    <select id="assign-dept" className="input text-xs" value={assignDept} onChange={(e) => setAssignDept(e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Officer" htmlFor="assign-officer" className="mt-2">
                    <select id="assign-officer" className="input text-xs" value={assignOfficer} onChange={(e) => setAssignOfficer(e.target.value)}>
                      <option value="">Select officer</option>
                      {officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </Field>
                  <input className="input mt-2 text-xs" placeholder="Optional remark" value={assignRemark} onChange={(e) => setAssignRemark(e.target.value)} />
                  <button type="button" className="btn-primary btn-sm mt-2 w-full" onClick={handleAssign} disabled={busy}>
                    {busy ? <Spinner size={14} /> : <Send size={14} />} Forward &amp; assign
                  </button>
                </div>
              )}

              {can('review_report') && (
                <Collapsible
                  title="Review action-taken report"
                  defaultOpen
                  badge={
                    detail.assignment?.report_status === 'SUBMITTED' ? (
                      <span className="badge bg-sky-50 text-sky-700">Ready</span>
                    ) : null
                  }
                >
                  <p className="text-xs text-slate-500">
                    {detail.assignment?.report_status === 'SUBMITTED'
                      ? 'The department has submitted a report. Accept it to resolve the case, or send it back for more work.'
                      : 'The department has not submitted a report for review yet.'}
                  </p>
                  <textarea className="input mt-2 text-xs" rows={3} placeholder="Review remark (optional)" value={reviewRemark} onChange={(e) => setReviewRemark(e.target.value)} />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" className="btn-primary btn-sm" onClick={() => handleReview('ACCEPT')} disabled={busy || detail.assignment?.report_status !== 'SUBMITTED'}>
                      <CheckCircle2 size={14} /> Accept
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => handleReview('SEND_BACK')} disabled={busy || detail.assignment?.report_status !== 'SUBMITTED'}>
                      <RefreshCw size={14} /> Send back
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">Accepting marks the grievance Resolved and notifies the citizen timeline.</p>
                </Collapsible>
              )}

              {can('escalate') && (
                <Collapsible title="Escalate overdue grievance" badge={<span className="badge bg-rose-50 text-rose-700">SLA breached</span>}>
                  <p className="text-xs text-slate-500">
                    Escalation raises the priority one level (Low → Medium → High) and records a public remark.
                  </p>
                  <input className="input mt-2 text-xs" placeholder="Reason (optional)" value={escalateRemark} onChange={(e) => setEscalateRemark(e.target.value)} />
                  <button type="button" className="btn-danger btn-sm mt-2 w-full" onClick={handleEscalate} disabled={busy}>
                    <Flag size={14} /> Escalate case
                  </button>
                </Collapsible>
              )}

              {can('override') && (
                <Collapsible title="Confirm / override official fields">
                  <p className="text-xs text-slate-500">
                    Category and department can only be changed before investigation starts. Priority can
                    always be adjusted.
                  </p>
                  <Field label="Category" htmlFor="override-category" className="mt-2">
                    <select id="override-category" className="input text-xs" value={override.category_id} onChange={(e) => setOverride({ ...override, category_id: e.target.value })}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Department" htmlFor="override-department" className="mt-2">
                    <select id="override-department" className="input text-xs" value={override.department_id} onChange={(e) => setOverride({ ...override, department_id: e.target.value })}>
                      <option value="">Unassigned</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Priority" htmlFor="override-priority" className="mt-2">
                    <select id="override-priority" className="input text-xs" value={override.priority} onChange={(e) => setOverride({ ...override, priority: e.target.value })}>
                      {['Low', 'Medium', 'High'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <button type="button" className="btn-secondary btn-sm mt-2 w-full" onClick={handleOverride} disabled={busy}>
                    <PencilLine size={14} /> Save official fields
                  </button>
                </Collapsible>
              )}

              {can('remark') && (
                <Collapsible title="Add a remark">
                  <textarea className="input text-xs" rows={3} placeholder="Remark for the case file…" value={remark} onChange={(e) => setRemark(e.target.value)} />
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600" checked={remarkInternal} onChange={(e) => setRemarkInternal(e.target.checked)} />
                    <Lock size={12} /> Internal note (hidden from the citizen)
                  </label>
                  <button type="button" className="btn-primary btn-sm mt-2 w-full" onClick={handleRemark} disabled={busy}>
                    <MessageSquarePlus size={14} /> Add remark
                  </button>
                </Collapsible>
              )}
            </section>
          )}

          {/* Officer actions --------------------------------------------- */}
          {isOfficer && (
            <section className="card card-pad space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Department actions</h2>
              {detail.status === 'In Progress' && (
                <button type="button" className="btn-secondary w-full" onClick={handleStart} disabled={busy}>
                  <CheckCircle2 size={16} /> Mark investigation started
                </button>
              )}
              {detail.assignment && (
                <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                  <p><strong>Report status:</strong> {detail.assignment.report_status}</p>
                  {detail.assignment.report_submitted_at && <p className="mt-1">Submitted {formatDateTime(detail.assignment.report_submitted_at)}</p>}
                  {detail.assignment.report_status === 'SENT_BACK' && (
                    <p className="mt-1 text-rose-700">The CMO sent this report back. Update it and resubmit.</p>
                  )}
                </div>
              )}
              {detail.status === 'In Progress' && (
                <Collapsible title="Submit action-taken report" defaultOpen>
                  <textarea className="input text-xs" rows={6} placeholder="Describe the investigation and the action taken…" value={reportText} onChange={(e) => setReportText(e.target.value)} maxLength={5000} />
                  <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 hover:border-brand-400">
                    <Upload size={14} />
                    <span className="min-w-0 flex-1 truncate">{reportFile ? reportFile.name : 'Optional JPG/PNG/PDF evidence (max 5 MB)'}</span>
                    <input type="file" className="sr-only" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(e) => setReportFile(e.target.files?.[0] || null)} />
                  </label>
                  <button type="button" className="btn-primary btn-sm mt-2 w-full" onClick={handleReport} disabled={busy}>
                    {busy ? <Spinner size={14} /> : <Send size={14} />} Submit to CMO for review
                  </button>
                </Collapsible>
              )}
              <Collapsible title="Add investigation remark">
                <textarea className="input text-xs" rows={3} placeholder="Investigation note…" value={remark} onChange={(e) => setRemark(e.target.value)} />
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600" checked={remarkInternal} onChange={(e) => setRemarkInternal(e.target.checked)} />
                  <Lock size={12} /> Internal note (hidden from the citizen)
                </label>
                <button type="button" className="btn-primary btn-sm mt-2 w-full" onClick={handleRemark} disabled={busy}>
                  <MessageSquarePlus size={14} /> Add remark
                </button>
              </Collapsible>
            </section>
          )}

          {/* Citizen actions --------------------------------------------- */}
          {isCitizen && detail.status === 'Resolved' && (
            <>
              <section className="card card-pad">
                <h2 className="text-sm font-semibold text-slate-900">Rate the resolution</h2>
                <p className="mt-1 text-xs text-slate-500">Your feedback helps the CMO understand service quality.</p>
                <div className="mt-3">
                  <Stars value={feedback.rating} onChange={(rating) => setFeedback({ ...feedback, rating })} />
                </div>
                <textarea className="input mt-3 text-xs" rows={3} placeholder="Optional comment…" value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} maxLength={1000} />
                <button type="button" className="btn-primary btn-sm mt-2 w-full" onClick={handleFeedback} disabled={busy}>
                  {busy ? <Spinner size={14} /> : <CheckCircle2 size={14} />} {detail.feedback ? 'Update feedback' : 'Submit feedback'}
                </button>
              </section>
              <section className="card card-pad">
                <h2 className="text-sm font-semibold text-slate-900">Still not fixed?</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Reopen the grievance with a reason. It will return to the CMO for review and, if needed, be
                  forwarded to the department again.
                </p>
                <textarea className="input mt-2 text-xs" rows={3} placeholder="Explain why the issue persists…" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} maxLength={2000} />
                <button type="button" className="btn-secondary btn-sm mt-2 w-full" onClick={handleReopen} disabled={busy}>
                  <RefreshCw size={14} /> Reopen grievance
                </button>
              </section>
            </>
          )}

          {isCitizen && detail.status !== 'Resolved' && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
              {detail.status === 'Reopened'
                ? 'Your reopened grievance is waiting for CMO review. You will see the next update on the timeline.'
                : 'The CMO and the assigned department will update this case. You can check back here or from your dashboard at any time.'}
            </section>
          )}

          {!isCitizen && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
              <Lock size={12} className="mr-1 inline-block" />
              Internal notes are never shown to citizens. Only public remarks appear on their timeline and on
              public tracking.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
