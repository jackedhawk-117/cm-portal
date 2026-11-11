import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PALETTE = ['#047857', '#0f766e', '#0e7490', '#4f46e5', '#7c3aed', '#b45309', '#be123c', '#475569'];

const STATUS_COLORS = {
  Submitted: '#0ea5e9',
  'Under Review': '#f59e0b',
  'In Progress': '#6366f1',
  Resolved: '#10b981',
  Reopened: '#f43f5e',
};

function ChartCard({ title, description, children, height = 320, action }) {
  return (
    <section className="card card-pad">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div style={{ height }}>{children}</div>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
      No data yet
    </div>
  );
}

const axisProps = {
  tick: { fill: '#64748b', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: '#e2e8f0' },
};

const tooltipProps = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    fontSize: 12,
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  },
  cursor: { fill: 'rgba(4, 120, 87, 0.06)' },
};

function formatMonth(month) {
  if (!month) return '';
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

/** CMO analytics built entirely from /api/stats/cmo aggregates. */
export function CmoCharts({ stats }) {
  const districts = (stats?.by_district || []).filter((d) => d.count > 0);
  const departments = (stats?.by_department || []).filter((d) => d.count > 0);
  const statuses = (stats?.by_status || []).filter((d) => d.count > 0);
  const trend = (stats?.monthly_trend || []).map((row) => ({
    ...row,
    label: formatMonth(row.month),
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="District-wise grievances"
        description="All submitted cases, grouped by Kerala district."
        height={Math.max(300, districts.length * 26)}
      >
        {districts.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={districts} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey="name" width={128} {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="count" name="Grievances" fill="#047857" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="Department-wise workload"
        description="Cases forwarded to each department (unassigned excluded)."
        height={Math.max(300, departments.length * 28)}
      >
        {departments.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departments} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey="name" width={150} {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="count" name="Grievances" radius={[0, 6, 6, 0]} barSize={15}>
                {departments.map((entry, index) => (
                  <Cell key={entry.id || entry.name} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard title="Status distribution" description="Live counts across the five workflow states.">
        {statuses.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statuses}
                dataKey="count"
                nameKey="name"
                innerRadius={62}
                outerRadius={105}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
                label={({ name, count }) => `${name} (${count})`}
                labelLine={false}
              >
                {statuses.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard title="Monthly trend" description="Submitted versus resolved over the last six months.">
        {trend.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend
                verticalAlign="top"
                height={30}
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
              <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#047857" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </div>
  );
}
