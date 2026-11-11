import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';
import { FAQS } from '../lib/constants';

export default function FAQ() {
  useTitle('FAQ');
  const [open, setOpen] = useState(0);
  return (
    <div>
      <section className="hero-pattern border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Help centre</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Everything you need to know about submitting, tracking and reopening a grievance on this
            recruitment prototype.
          </p>
        </div>
      </section>

      <div className="container-page grid max-w-5xl gap-8 py-10 lg:grid-cols-[1fr_280px]">
        <div className="card divide-y divide-slate-100">
          {FAQS.map((item, index) => {
            const expanded = open === index;
            return (
              <div key={item.q}>
                <h2>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    onClick={() => setOpen(expanded ? null : index)}
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                  >
                    <span className="flex items-start gap-2.5">
                      <HelpCircle size={16} className="mt-0.5 shrink-0 text-brand-600" />
                      {item.q}
                    </span>
                    <ChevronDown
                      size={17}
                      className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h2>
                {expanded && (
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-button-${index}`}
                    className="px-5 pb-5 pl-[3.1rem] text-sm leading-relaxed text-slate-600"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <Search size={18} className="text-brand-700" />
            <h2 className="mt-2 text-sm font-semibold text-slate-900">Need to track a case?</h2>
            <p className="mt-1 text-sm text-slate-600">Enter your CMK reference ID on the tracking page.</p>
            <Link to="/track" className="btn-primary btn-sm mt-3 w-full">Track grievance</Link>
          </div>
          <div className="card card-pad">
            <h2 className="text-sm font-semibold text-slate-900">Still have a question?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Send a message through the contact form. Enquiries are stored in the prototype database.
            </p>
            <Link to="/contact" className="btn-secondary btn-sm mt-3 w-full">Contact us</Link>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            Recruitment prototype with fictional data. Not affiliated with the Government of Kerala or the
            Chief Minister’s Office.
          </div>
        </aside>
      </div>
    </div>
  );
}
