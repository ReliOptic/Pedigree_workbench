import type { Individual } from '../types/pedigree.types';
import type { CohortStats, MissingDataAlert } from '../types/breeding.types';
import type { Translation } from '../types/translation.types';
import { LitterGroupCard } from './dashboard/LitterGroupCard';
import { StatusSummary } from './dashboard/StatusSummary';
import { GenotypeHeatmap } from './dashboard/GenotypeHeatmap';
import { MissingDataPanel } from './dashboard/MissingDataPanel';
import { BreedingCandidateList } from './dashboard/BreedingCandidateList';
import { NextStepChecklist } from './dashboard/NextStepChecklist';

interface DashboardProps {
  readonly stats: CohortStats;
  readonly missingAlerts: readonly MissingDataAlert[];
  readonly t: Translation;
  readonly projectName?: string;
  readonly individuals: readonly Individual[];
  readonly onSelectIndividual?: (id: string) => void;
}

/**
 * Founder Cohort Dashboard — shown when the loaded project has no F1 data.
 * Provides a summary of the cohort, litter groups, missing data alerts,
 * and breeding candidate count.
 */
export function Dashboard({
  stats,
  missingAlerts,
  t,
  projectName,
  individuals,
  onSelectIndividual,
}: DashboardProps): React.JSX.Element {
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
          {t.individuals}: {totalCount} &nbsp;·&nbsp;
          {t.litterGroups}: {litterGroups.length} &nbsp;·&nbsp;
          <span className="text-blue-600">{sexDistribution.male}M</span>
          {' / '}
          <span className="text-pink-600">{sexDistribution.female}F</span>
          {sexDistribution.unknown > 0 && ` / ${sexDistribution.unknown}?`}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label={t.individuals} value={totalCount} />
        <SummaryCard label={t.litterGroups} value={litterGroups.length} />
        <SummaryCard
          label={t.breedingCandidates}
          value={breedingCandidateCount}
          highlight={breedingCandidateCount > 0}
        />
        <SummaryCard
          label="Sex known"
          value={`${totalCount - sexDistribution.unknown}/${totalCount}`}
        />
      </div>

      {/*
        ┌──────────────────────────┬──────────────────────────────┐
        │ Litter Groups (scroll)   │ Status Summary + Heatmap     │
        ├──────────────────────────┼──────────────────────────────┤
        │ Missing Data Panel       │ Breeding Candidates          │
        ├──────────────────────────┴──────────────────────────────┤
        │ Next Steps Checklist                                    │
        └─────────────────────────────────────────────────────────┘
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Litter groups */}
        <section className="bg-surface-raised border border-border rounded-lg p-4 flex flex-col gap-3 max-h-80 overflow-y-auto">
          <h2 className="text-sm font-semibold text-text-primary sticky top-0 bg-surface-raised pb-1">{t.litterGroups}</h2>
          {litterGroups.length === 0 ? (
            <p className="text-xs text-slate-400">No litter groups assigned</p>
          ) : (
            litterGroups.map((lg) => (
              <LitterGroupCard
                key={lg.groupId}
                group={lg}
                onSelectIndividual={onSelectIndividual}
              />
            ))
          )}
        </section>

        {/* Status Summary + Genotype Heatmap */}
        <div className="flex flex-col gap-4">
          <section className="bg-surface-raised border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-3">{t.statusSummary}</h2>
            <StatusSummary
              statusDistribution={statusDistribution}
              totalCount={totalCount}
            />
          </section>

          <section className="bg-surface-raised border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-3">{t.genotypeHeatmap}</h2>
            <p className="text-[10px] text-slate-400 mb-2">{t.koEfficiency} &nbsp; <span className="inline-flex gap-1 items-center"><span className="w-3 h-3 rounded-sm inline-block bg-red-400"/> 0%</span> → <span className="inline-flex gap-1 items-center"><span className="w-3 h-3 rounded-sm inline-block bg-yellow-300"/>50%</span> → <span className="inline-flex gap-1 items-center"><span className="w-3 h-3 rounded-sm inline-block bg-green-400"/>100%</span></p>
            <GenotypeHeatmap
              individuals={individuals}
              onSelectIndividual={onSelectIndividual}
            />
          </section>
        </div>

        {/* Missing Data Panel */}
        <section className="bg-surface-raised border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.missingData}</h2>
          <MissingDataPanel missingAlerts={missingAlerts} />
        </section>

        {/* Breeding Candidates */}
        <section className="bg-surface-raised border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
          <h2 className="text-sm font-semibold text-text-primary mb-3 sticky top-0 bg-surface-raised pb-1">{t.breedingCandidates}</h2>
          <BreedingCandidateList
            individuals={individuals}
            onSelectIndividual={onSelectIndividual}
          />
        </section>

        {/* Next Steps Checklist — full width */}
        <section className="bg-surface-raised border border-border rounded-lg p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.nextSteps}</h2>
          <NextStepChecklist
            missingAlerts={missingAlerts}
            breedingCandidateCount={breedingCandidateCount}
            totalCount={totalCount}
          />
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
