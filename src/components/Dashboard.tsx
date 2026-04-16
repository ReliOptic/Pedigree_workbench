import type { Individual } from '../types/pedigree.types';
import type { CohortStats, MissingDataAlert } from '../types/breeding.types';
import type { Language, Translation } from '../types/translation.types';
import type { PopulationStats } from '../services/population-genetics';
import type { ValidationResult } from '../services/pedigree-validation';
import type { SpeciesProfile } from '../services/species-profiles';
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
  readonly populationStats: PopulationStats;
  readonly validation: ValidationResult;
  readonly speciesProfile: SpeciesProfile;
  readonly language: Language;
  readonly onJumpToWorkbench: (individualId?: string) => void;
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
  populationStats,
  validation,
  speciesProfile,
  language,
  onJumpToWorkbench,
}: DashboardProps): React.JSX.Element {
  if (stats.totalCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 flex flex-col items-center gap-3">
          <p className="text-lg font-semibold text-text-primary">{t.noDataYet}</p>
          <p className="text-sm text-text-muted">{t.importToStart}</p>
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
        <p className="text-sm text-text-muted mt-1">
          {t.individuals}: {totalCount} &nbsp;·&nbsp;
          {t.litterGroups}: {litterGroups.length} &nbsp;·&nbsp;
          <span className="text-blue-600">&#9794;{sexDistribution.male}</span>
          {' · '}
          <span className="text-pink-600">&#9792;{sexDistribution.female}</span>
          {' · '}
          <span className="text-text-muted">?{sexDistribution.unknown}</span>
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
          label={t.sexKnown}
          value={`${totalCount - sexDistribution.unknown}/${totalCount}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard label={t.species} value={`${speciesProfile.icon} ${speciesProfile.name[language]}`} />
        <SummaryCard label={t.meanCoi} value={`${(populationStats.meanCOI * 100).toFixed(2)}%`} />
        <SummaryCard
          label={t.validationLabel}
          value={validation.valid ? t.clean : `${validation.errors.length} error(s)`}
          highlight={!validation.valid}
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
            <p className="text-xs text-text-muted">{t.noLitterGroupsAssigned}</p>
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
            <p className="text-[10px] text-text-muted mb-2">{t.koEfficiency} &nbsp; <span className="inline-flex gap-1 items-center"><span className="w-3 h-3 rounded-sm inline-block bg-red-400"/> 0%</span> → <span className="inline-flex gap-1 items-center"><span className="w-3 h-3 rounded-sm inline-block bg-yellow-300"/>50%</span> → <span className="inline-flex gap-1 items-center"><span className="w-3 h-3 rounded-sm inline-block bg-green-400"/>100%</span></p>
            <GenotypeHeatmap
              individuals={individuals}
              onSelectIndividual={onSelectIndividual}
            />
          </section>
        </div>

        {/* Missing Data Panel */}
        <section className="bg-surface-raised border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.missingData}</h2>
          <MissingDataPanel missingAlerts={missingAlerts} onJumpToWorkbench={onJumpToWorkbench} />
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

        <section className="bg-surface-raised border border-border rounded-lg p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.populationGenetics}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label={t.population} value={populationStats.populationSize} />
            <SummaryCard label={t.foundersLabel} value={populationStats.founderCount} />
            <SummaryCard label={t.maxCoi} value={`${(populationStats.maxCOI * 100).toFixed(2)}%`} />
            <SummaryCard label={t.inbredLabel} value={`${(populationStats.inbredProportion * 100).toFixed(1)}%`} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="py-2 pr-3">{t.generation}</th>
                  <th className="py-2 pr-3">{t.countLabel}</th>
                  <th className="py-2 pr-3">{t.meanCoi}</th>
                  <th className="py-2 pr-3">{t.foundersLabel}</th>
                </tr>
              </thead>
              <tbody>
                {populationStats.generationStats.map((row) => (
                  <tr key={row.generation} className="border-b border-border">
                    <td className="py-2 pr-3 font-mono text-text-primary">{row.generation}</td>
                    <td className="py-2 pr-3 text-text-secondary">{row.count}</td>
                    <td className="py-2 pr-3 text-text-secondary">{(row.meanCOI * 100).toFixed(2)}%</td>
                    <td className="py-2 pr-3 text-text-secondary">{row.founderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* High-COI individual jump links */}
          {(() => {
            const highCoiIndividuals = individuals.filter((ind) => {
              // Approximate COI check: individuals with both parents in dataset are candidates
              return ind.sire !== undefined && ind.dam !== undefined;
            });
            const highCoiCount = highCoiIndividuals.length;
            if (highCoiCount === 0 || populationStats.maxCOI < 0.0625) return null;
            return (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-2">
                  High COI detected — inspect individuals in Workbench:
                </p>
                <div className="flex flex-wrap gap-2">
                  {highCoiIndividuals.slice(0, 8).map((ind) => (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => onJumpToWorkbench(ind.id)}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors font-mono"
                    >
                      {ind.id}
                    </button>
                  ))}
                  {highCoiIndividuals.length > 8 && (
                    <button
                      type="button"
                      onClick={() => onJumpToWorkbench()}
                      className="text-[10px] px-2 py-0.5 rounded bg-surface text-text-muted border border-border hover:bg-surface-raised transition-colors"
                    >
                      +{highCoiIndividuals.length - 8} more
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </section>

        <section className="bg-surface-raised border border-border rounded-lg p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary mb-3">{t.validationLabel}</h2>
          {validation.valid ? (
            <p className="text-sm text-green-700 dark:text-green-400">{t.noValidationErrors}</p>
          ) : (
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <div key={`${error.type}-${index}`} className="rounded border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-red-700 dark:text-red-300">{error.message}</div>
                    <button
                      type="button"
                      onClick={() => onJumpToWorkbench(error.ids[0])}
                      className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors whitespace-nowrap"
                    >
                      View in Workbench
                    </button>
                  </div>
                  <div className="mt-1 font-mono text-red-600 dark:text-red-400">{error.ids.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {validation.warnings.map((warning, index) => (
                <div key={`${warning.type}-${index}`} className="rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-amber-700 dark:text-amber-300">{warning.message}</div>
                    <button
                      type="button"
                      onClick={() => onJumpToWorkbench(warning.ids[0])}
                      className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors whitespace-nowrap"
                    >
                      View in Workbench
                    </button>
                  </div>
                  <div className="mt-1 font-mono text-amber-600 dark:text-amber-400">{warning.ids.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
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
      <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${highlight ? 'text-brand' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}
