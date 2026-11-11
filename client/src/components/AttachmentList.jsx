import { Download, Eye, FileImage, FileText } from 'lucide-react';
import { attachmentUrl } from '../lib/api';
import { formatBytes, formatDateTime } from '../lib/format';

/** Attachment metadata + authorised download links (cookie based). */
export function AttachmentList({ attachments = [] }) {
  if (!attachments.length) {
    return <p className="text-sm text-slate-500">No attachments were uploaded.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {attachments.map((file) => {
        const Icon = file.mime === 'application/pdf' ? FileText : FileImage;
        return (
          <li key={file.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{file.filename}</p>
              <p className="text-xs text-slate-500">
                {formatBytes(file.size)} · {file.kind === 'action_report' ? 'Action report' : 'Complaint attachment'} ·{' '}
                {formatDateTime(file.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={attachmentUrl(file.id)}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost btn-sm"
                aria-label={`View ${file.filename}`}
              >
                <Eye size={14} /> View
              </a>
              <a
                href={attachmentUrl(file.id, true)}
                className="btn-ghost btn-sm"
                aria-label={`Download ${file.filename}`}
              >
                <Download size={14} /> Download
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
