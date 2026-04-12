import type { CohortStats, MissingDataAlert } from '../types/breeding.types';
import type { Translation } from '../types/translation.types';

interface DashboardProps {
  readonly stats: CohortStats;
  readonly missingAlerts: readonly MissingDataAlert[];
  readonly t: Translation;
  readonly projectName?: string;
}

const SEVERITY_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

const SEVERITY_BAR: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-green-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
};

/**
 * Founder Cohort Dashboard — shown when the loaded project has no F1 data.
 * Provides a summary of the cohort, litter groups, missing data alerts,
 * and breeding candidate count.
 */
export function Dashboard({ stats, missingAlerts, t, projectName }: DashboardProps): React.JSX.Element {
  if (stats.totalCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 flex flex-col items-center gap-3">
          <p className="text-lg font-semibold text-text-primary">{t.noDataYet}</p>
          <p className="text-sm text-slate-500">{t.importToStart}</p>
        </div>
      </div>
    );
  }

  const { totalCount, sexDistribution, litterGroups, breedingCandidateCount, statusDistribution } = stats;

  return (
    <div className="h-full overflow-y-auto p-6 bg-surface">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand tracking-tight">
          {projectName !== undefined && projectName !== '' ? projectName : t.founderCohort}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t.individuals}: {totalCount} &nbsp;·&nbsp; {t.litterGroups}: {litterGroups.length}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label={t.individuals} value={totalCount} />
        <SummaryCard label={t.litterGroups} value={litterGroups.length} />
        <SummaryCard label={t.breedingCandidates} value={breedingCandidateCount} highlight={breedingCandidateCount > 0} />
        <SummaryCard
          label="Sex known"
          value={`${totalCount - sexDistribution.unknown}/${totalCount}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Litter groups */}
        <section className="bg-surface-raised border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.litterGroups}</h2>
          {litterGroups.length === 0 ? (
            <p className="text-xs text-slate-400">No litter groups assigned</p>
          ) : (
            <div className="space-y-2">
              {litterGroups.map((lg) => (
                <div
                  key={lg.groupId}
                  className="flex items-center justify-between px-3 py-2 bg-surface border border-border rounded text-xs"
                >
                  <span className="font-medium text-text-primary">{lg.groupId}</span>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>{lg.individuals.length} ind.</span>
                    <span>
                      {lg.sexDistribution.male}M / {lg.sexDistribution.female}F
                      {lg.sexDistribution.unknown > 0 ? ` / ${lg.sexDistribution.unknown}?` : ''}
                    </span>
                    {lg.surrogate !== undefined && (
                      <span className="text-indigo-500">S:{lg.surrogate}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Status distribution */}
        <section className="bg-surface-raised border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Status Distribution</h2>
          {statusDistribution.size === 0 ? (
            <p className="text-xs text-slate-400">No status data</p>
          ) : (
            <div className="space-y-1.5">
              {Array.from(statusDistribution.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-xs">
                    <span className="text-text-primary truncate max-w-[160px]">{status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${(count / totalCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-500 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Missing data alerts */}
        <section className="bg-surface-raised border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.missingData}</h2>
          {missingAlerts.length === 0 ? (
            <p className="text-xs text-green-600">All fields complete</p>
          ) : (
            <div className="space-y-2">
              {missingAlerts.map((alert) => (
                <div key={alert.field} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${SEVERITY_COLOR[alert.severity]}`}>
                      {alert.field}
                    </span>
                    <span className="text-slate-500">
                      {alert.missingCount}/{alert.totalCount} ({Math.round(alert.rate * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${SEVERITY_BAR[alert.severity]}`}
                      style={{ width: `${alert.rate * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Next steps checklist */}
        <section className="bg-surface-raised border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.nextSteps}</h2>
          <NextStepChecklist missingAlerts={missingAlerts} breedingCandidateCount={breedingCandidateCount} totalCount={totalCount} />
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  readonly label: string;
  readonly value: number | string;
  readonly highlight?: boolean;
}): React.JSX.Element {
  return (
    <div className={`bg-surface-raised border rounded-lg p-4 flex flex-col gap-1 ${highlight ? 'border-brand' : 'border-border'}`}>
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${highlight ? 'text-brand' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

function NextStepChecklist({
  missingAlerts,
  breedingCandidateCount,
  totalCount,
}: {
  readonly missingAlerts: readonly MissingDataAlert[];
  readonly breedingCandidateCount: number;
  readonly totalCount: number;
}): React.JSX.Element {
  const steps: { label: string; done: boolean }[] = [];

  const sexAlert = missingAlerts.find((a) => a.field === 'sex');
  if (sexAlert !== undefined) {
    steps.push({
      label: `Fill missing sex data (${sexAlert.missingCount}/${totalCount})`,
      done: false,
    });
  }

  const cd163Alert = missingAlerts.find((a) => a.field === 'CD163');
  if (cd163Alert !== undefined) {
    steps.push({
      label: `Add CD163 genotype (${cd163Alert.missingCount}/${totalCount})`,
      done: false,
    });
  }

  const birthAlert = missingAlerts.find((a) => a.field === 'birth_date');
  if (birthAlert !== undefined) {
    steps.push({
      label: `Record birth dates (${birthAlert.missingCount}/${totalCount})`,
      done: false,
    });
  }

  if (breedingCandidateCount > 0) {
    steps.push({
      label: `Plan first matings (${breedingCandidateCount} candidate${breedingCandidateCount > 1 ? 's' : ''} ready)`,
      done: false,
    });
  }

  if (steps.length === 0) {
    steps.push({ label: 'Data complete — ready to plan matings', done: true });
  }

  return (
    <ul className="space-y-2">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-2 text-xs">
          <span
            className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
              step.done ? 'border-green-500 bg-green-100 text-green-700' : 'border-slate-300 bg-surface'
            }`}
            aria-hidden="true"
          >
            {step.done && '✓'}
          </span>
          <span className={step.done ? 'text-green-700 line-through' : 'text-text-primary'}>
            {step.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
