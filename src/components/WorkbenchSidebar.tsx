import { AlertTriangle, GitBranchPlus, HeartHandshake, Layers3, Link2, Plus, ShieldAlert, Spline } from 'lucide-react';

import type { CohortStats, MissingDataAlert } from '../types/breeding.types';
import type { Individual } from '../types/pedigree.types';
import type { Language } from '../types/translation.types';
import type { PopulationStats } from '../services/population-genetics';
import type { ValidationResult } from '../services/pedigree-validation';
import type { SpeciesProfile } from '../services/species-profiles';
import type { WorkbenchMode } from '../services/settings-store';

type RelationshipMode =
  | { readonly kind: 'idle' }
  | { readonly kind: 'assign-parent'; readonly parentRole: 'sire' | 'dam'; readonly sourceId: string }
  | { readonly kind: 'create-mating'; readonly sourceId: string };

interface SidebarLabels {
  readonly selectedNode: string;
  readonly jumpToGeneration: string;
  readonly hidePanel: string;
  readonly showPanel: string;
  readonly panelTools: string;
  readonly datasetStructure: string;
  readonly validation: string;
  readonly generations: string;
  readonly groups: string;
  readonly founders: string;
  readonly missingParents: string;
  readonly missingGeneration: string;
  readonly missingSex: string;
  readonly issuesNeedReview: string;
  readonly generationBreakdown: string;
  readonly groupBreakdown: string;
  readonly relationTools: string;
  readonly relationToolsBody: string;
  readonly addChild: string;
  readonly connectAsSire: string;
  readonly connectAsDam: string;
  readonly createMating: string;
  readonly cancelMode: string;
  readonly clickChildForSire: string;
  readonly clickChildForDam: string;
  readonly clickPartnerForMating: string;
  readonly topAttentionNodes: string;
  readonly noGroups: string;
  readonly noAttentionNodes: string;
  readonly workbenchMode: string;
  readonly autoMode: string;
  readonly cohortMode: string;
  readonly pedigreeMode: string;
  readonly cohortHint: string;
  readonly pedigreeHint: string;
  readonly autoHint: string;
}

interface WorkbenchSidebarProps {
  readonly selected: Individual | null;
  readonly stats: CohortStats;
  readonly missingAlerts: readonly MissingDataAlert[];
  readonly populationStats: PopulationStats;
  readonly validation: ValidationResult;
  readonly speciesProfile: SpeciesProfile;
  readonly individuals: readonly Individual[];
  readonly language: Language;
  readonly relationshipMode: RelationshipMode;
  readonly onAddChild: () => void;
  readonly onStartAssignSire: () => void;
  readonly onStartAssignDam: () => void;
  readonly onStartMating: () => void;
  readonly onCancelRelationshipMode: () => void;
  readonly onSelectIndividual: (id: string) => void;
  readonly onFocusGeneration: (generation: string) => void;
  readonly activeGroupId: string | null;
  readonly onFocusGroup: (groupId: string | null) => void;
  readonly preferredWorkbenchMode: WorkbenchMode;
  readonly effectiveWorkbenchMode: 'cohort' | 'pedigree';
  readonly onWorkbenchModeChange: (mode: WorkbenchMode) => void;
}

function getLabels(language: Language): SidebarLabels {
  if (language === 'ko') {
    return {
      selectedNode: '선택 노드',
      jumpToGeneration: '세대로 이동',
      hidePanel: '패널 접기',
      showPanel: '패널 열기',
      panelTools: '도구',
      datasetStructure: '데이터 구조',
      validation: '검증',
      generations: '세대',
      groups: '그룹',
      founders: '창시 개체',
      missingParents: '누락 부모 참조',
      missingGeneration: '세대 누락',
      missingSex: '성별 누락',
      issuesNeedReview: '검토가 필요한 항목',
      generationBreakdown: '세대 분포',
      groupBreakdown: '그룹 분포',
      relationTools: '관계 편집',
      relationToolsBody: '버튼을 누른 뒤 캔버스에서 대상 노드를 클릭해 관계를 적용합니다.',
      addChild: '자식 추가',
      connectAsSire: '부로 연결',
      connectAsDam: '모로 연결',
      createMating: '교배 연결',
      cancelMode: '모드 취소',
      clickChildForSire: '이제 자식 노드를 클릭하면 선택 개체가 sire로 연결됩니다.',
      clickChildForDam: '이제 자식 노드를 클릭하면 선택 개체가 dam으로 연결됩니다.',
      clickPartnerForMating: '이제 파트너 노드를 클릭하면 교배 레코드 작성이 시작됩니다.',
      topAttentionNodes: '우선 확인 개체',
      noGroups: '그룹 정보 없음',
      noAttentionNodes: '즉시 확인이 필요한 개체가 없습니다.',
      workbenchMode: '작업 모드',
      autoMode: '자동',
      cohortMode: '코호트',
      pedigreeMode: '가계도',
      cohortHint: 'F0 중심의 리터·상태·데이터 완성도를 읽을 때 적합합니다.',
      pedigreeHint: '부모-자식 연결과 세대 구조를 편집할 때 적합합니다.',
      autoHint: '현재 데이터 구조를 보고 코호트 또는 가계도 보기 중 하나를 자동으로 추천합니다.',
    };
  }

  return {
    selectedNode: 'Selected node',
    jumpToGeneration: 'Jump to generation',
    hidePanel: 'Hide panel',
    showPanel: 'Show panel',
    panelTools: 'Tools',
    datasetStructure: 'Dataset Structure',
    validation: 'Validation',
    generations: 'Generations',
    groups: 'Groups',
    founders: 'Founders',
    missingParents: 'Missing parent refs',
    missingGeneration: 'Missing generation',
    missingSex: 'Missing sex',
    issuesNeedReview: 'Items that need review',
    generationBreakdown: 'Generation breakdown',
    groupBreakdown: 'Group breakdown',
    relationTools: 'Relationship Tools',
    relationToolsBody: 'Choose an action here, then click the target node on the canvas.',
    addChild: 'Add child',
    connectAsSire: 'Connect as sire',
    connectAsDam: 'Connect as dam',
    createMating: 'Create mating',
    cancelMode: 'Cancel mode',
    clickChildForSire: 'Click a child node to assign the selected individual as sire.',
    clickChildForDam: 'Click a child node to assign the selected individual as dam.',
    clickPartnerForMating: 'Click a partner node to start a mating record with the selected individual.',
    topAttentionNodes: 'Priority review nodes',
    noGroups: 'No group data',
    noAttentionNodes: 'No immediate attention nodes.',
    workbenchMode: 'Workbench mode',
    autoMode: 'Auto',
    cohortMode: 'Cohort',
    pedigreeMode: 'Pedigree',
    cohortHint: 'Best for founder-only litter review, status screening, and data completeness work.',
    pedigreeHint: 'Best for sire-dam links, generation structure, and lineage editing.',
    autoHint: 'Automatically chooses cohort or pedigree based on the current dataset shape.',
  };
}

function summarizeIssues(validation: ValidationResult): {
  orphanParents: number;
  missingGeneration: number;
  missingSex: number;
} {
  const orphanParents = validation.warnings
    .filter((warning) => warning.type === 'orphan-parent')
    .reduce((count, warning) => count + Math.max(warning.ids.length - 1, 1), 0);

  const missingGeneration =
    validation.warnings.find((warning) => warning.type === 'missing-generation')?.ids.length ?? 0;
  const missingSex =
    validation.warnings.find((warning) => warning.type === 'missing-sex')?.ids.length ?? 0;

  return { orphanParents, missingGeneration, missingSex };
}

function getGenerationRows(stats: CohortStats): Array<{ label: string; count: number }> {
  return [...stats.generationBreakdown.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([label, count]) => ({ label, count }));
}

function getGroupRows(stats: CohortStats): Array<{ label: string; count: number }> {
  return stats.litterGroups
    .map((group) => ({ label: group.groupId, count: group.individuals.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8);
}

function getAttentionIds(validation: ValidationResult): readonly string[] {
  const ids = new Set<string>();
  for (const issue of [...validation.errors, ...validation.warnings]) {
    for (const id of issue.ids) ids.add(id);
  }
  return [...ids].slice(0, 8);
}

function getFirstWarningType(id: string, validation: ValidationResult, language: Language): string {
  for (const issue of [...validation.errors, ...validation.warnings]) {
    if (issue.ids.includes(id)) {
      if (language === 'ko') {
        const map: Record<string, string> = {
          'missing-sex': '성별 미입력',
          'missing-generation': '세대 미입력',
          'orphan-parent': '누락 부모 참조',
          'cycle': '순환 참조',
          'duplicate-id': '중복 ID',
        };
        return map[issue.type] ?? issue.type;
      }
      const map: Record<string, string> = {
        'missing-sex': 'Missing sex',
        'missing-generation': 'Missing generation',
        'orphan-parent': 'Orphan parent ref',
        'cycle': 'Cycle detected',
        'duplicate-id': 'Duplicate ID',
      };
      return map[issue.type] ?? issue.type;
    }
  }
  return '';
}

export function WorkbenchSidebar({
  selected,
  stats,
  missingAlerts,
  populationStats,
  validation,
  speciesProfile,
  individuals,
  language,
  relationshipMode,
  onAddChild,
  onStartAssignSire,
  onStartAssignDam,
  onStartMating,
  onCancelRelationshipMode,
  onSelectIndividual,
  onFocusGeneration,
  activeGroupId,
  onFocusGroup,
  preferredWorkbenchMode,
  effectiveWorkbenchMode,
  onWorkbenchModeChange,
}: WorkbenchSidebarProps): React.JSX.Element {
  const labels = getLabels(language);
  const generationRows = getGenerationRows(stats);
  const groupRows = getGroupRows(stats);
  const issueSummary = summarizeIssues(validation);
  const attentionIds = getAttentionIds(validation);
  const attentionIndividuals = attentionIds
    .map((id) => individuals.find((individual) => individual.id === id))
    .filter((individual): individual is Individual => individual !== undefined);

  const relationshipHint =
    relationshipMode.kind === 'assign-parent'
      ? (relationshipMode.parentRole === 'sire' ? labels.clickChildForSire : labels.clickChildForDam)
      : relationshipMode.kind === 'create-mating'
        ? labels.clickPartnerForMating
        : null;

  return (
    <aside className="h-full overflow-y-auto border-r border-border bg-surface-raised">
      <div className="p-4 space-y-4">
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-text-primary">{labels.workbenchMode}</h3>
            <span className="text-[11px] uppercase tracking-wide text-text-muted">
              {effectiveWorkbenchMode === 'cohort' ? labels.cohortMode : labels.pedigreeMode}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              ['auto', labels.autoMode],
              ['cohort', labels.cohortMode],
              ['pedigree', labels.pedigreeMode],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onWorkbenchModeChange(mode)}
                className={`panel-button rounded-lg px-3 py-2 text-xs font-medium ${
                  preferredWorkbenchMode === mode ? 'border-[var(--color-border-strong)] bg-surface text-text-primary' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-text-muted">
            {preferredWorkbenchMode === 'pedigree'
              ? labels.pedigreeHint
              : preferredWorkbenchMode === 'cohort'
                ? labels.cohortHint
                : labels.autoHint}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">{labels.relationTools}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{labels.relationToolsBody}</p>

          {selected === null ? (
            <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted">
              {language === 'ko' ? '먼저 캔버스에서 개체 하나를 선택하세요.' : 'Select an individual on the canvas first.'}
            </p>
          ) : (
            <>
              <div className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">{labels.selectedNode}</p>
                <p className="mt-1 truncate font-mono text-sm font-semibold text-text-primary" title={selected.label ?? selected.id}>
                  {selected.label ?? selected.id}
                </p>
                <p className="truncate text-xs text-text-secondary" title={selected.id}>{selected.id}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={onAddChild}
                  className="panel-button panel-button-primary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  {labels.addChild}
                </button>
                <button
                  type="button"
                  onClick={onStartAssignSire}
                  className="panel-button inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <GitBranchPlus className="h-4 w-4" />
                  {labels.connectAsSire}
                </button>
                <button
                  type="button"
                  onClick={onStartAssignDam}
                  className="panel-button inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <Spline className="h-4 w-4" />
                  {labels.connectAsDam}
                </button>
                <button
                  type="button"
                  onClick={onStartMating}
                  className="panel-button inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <HeartHandshake className="h-4 w-4" />
                  {labels.createMating}
                </button>
              </div>
            </>
          )}

          {relationshipHint !== null && (
            <div className="mt-3 rounded-lg border border-brand/30 bg-brand/8 px-3 py-2">
              <p className="text-xs font-medium leading-5 text-text-primary">{relationshipHint}</p>
              <button
                type="button"
                onClick={onCancelRelationshipMode}
                className="mt-2 text-xs font-medium text-brand hover:underline"
              >
                {labels.cancelMode}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">{labels.datasetStructure}</h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricCard label={language === 'ko' ? '종' : 'Species'} value={`${speciesProfile.icon} ${speciesProfile.name[language]}`} />
            <MetricCard label={language === 'ko' ? '개체 수' : 'Individuals'} value={stats.totalCount} />
            <MetricCard label={labels.generations} value={generationRows.length} />
            <MetricCard label={labels.groups} value={groupRows.length} />
            <MetricCard label={labels.founders} value={populationStats.founderCount} />
            <MetricCard label={labels.validation} value={validation.valid ? (language === 'ko' ? '정상' : 'Clean') : `${validation.errors.length}`} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">{labels.issuesNeedReview}</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <MetricRow label={labels.missingParents} value={issueSummary.orphanParents} />
            <MetricRow label={labels.missingGeneration} value={issueSummary.missingGeneration} />
            <MetricRow label={labels.missingSex} value={issueSummary.missingSex} />
            <MetricRow
              label={language === 'ko' ? '누락률 경고' : 'Completeness warnings'}
              value={missingAlerts.filter((alert) => alert.severity !== 'low').length}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-text-primary">{labels.generationBreakdown}</h3>
          <div className="mt-3 space-y-2">
            {generationRows.map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => onFocusGeneration(row.label)}
                className="panel-button flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left"
                title={`${labels.jumpToGeneration}: ${row.label}`}
              >
                <span className="truncate font-mono text-xs text-text-secondary">{row.label}</span>
                <span className="shrink-0 text-xs font-semibold text-text-primary">{row.count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-text-primary">{labels.groupBreakdown}</h3>
          <div className="mt-3 space-y-2">
            {groupRows.length === 0 ? (
              <p className="text-xs text-text-muted">{labels.noGroups}</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onFocusGroup(null)}
                  className={`panel-button flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                    activeGroupId === null ? 'border-[var(--color-border-strong)] bg-surface' : ''
                  }`}
                >
                  <span className="truncate text-xs text-text-secondary">
                    {language === 'ko' ? '전체 그룹' : 'All groups'}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-text-primary">{stats.totalCount}</span>
                </button>
                {groupRows.map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    onClick={() => onFocusGroup(row.label)}
                    className={`panel-button flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                      activeGroupId === row.label ? 'border-[var(--color-border-strong)] bg-surface' : ''
                    }`}
                    title={row.label}
                  >
                    <span className="truncate font-mono text-xs text-text-secondary">{row.label}</span>
                    <span className="shrink-0 text-xs font-semibold text-text-primary">{row.count}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </section>

        {effectiveWorkbenchMode === 'cohort' && (
          <CohortSummarySection
            stats={stats}
            individuals={individuals}
            language={language}
            activeGroupId={activeGroupId}
            onFocusGroup={onFocusGroup}
          />
        )}

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">{labels.topAttentionNodes}</h3>
          </div>
          <div className="mt-3 space-y-2">
            {attentionIndividuals.length === 0 ? (
              <p className="text-xs text-text-muted">{labels.noAttentionNodes}</p>
            ) : (
              attentionIndividuals.map((individual) => {
                const warningType = getFirstWarningType(individual.id, validation, language);
                return (
                  <button
                    key={individual.id}
                    type="button"
                    onClick={() => onSelectIndividual(individual.id)}
                    className="panel-button flex w-full items-start justify-between rounded-lg px-3 py-2 text-left"
                    title={`${individual.id} — ${warningType}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary" title={individual.label ?? individual.id}>
                        {individual.id}{individual.label ? ` · ${individual.label}` : ''}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-amber-600 dark:text-amber-400" title={warningType}>
                        {warningType}
                      </p>
                    </div>
                    <span className="mt-0.5 shrink-0 text-[11px] text-text-muted">{individual.generation ?? '—'}</span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

// ─── Cohort Summary Section ────────────────────────────────────────────────

interface CohortSummarySectionProps {
  readonly stats: CohortStats;
  readonly individuals: readonly Individual[];
  readonly language: Language;
  readonly activeGroupId: string | null;
  readonly onFocusGroup: (groupId: string | null) => void;
}

function CohortSummarySection({
  stats,
  individuals,
  language,
  activeGroupId,
  onFocusGroup,
}: CohortSummarySectionProps): React.JSX.Element {
  const isKo = language === 'ko';
  const total = stats.totalCount;
  const { male, female, unknown } = stats.sexDistribution;

  // Genotype completion: individuals that have at least one locus value.
  const withGenotype = individuals.filter((ind) => {
    return Object.keys(ind.fields).some((k) => /genotype|CD163/i.test(k)) ||
      (ind.sequence !== undefined && ind.sequence.trim() !== '');
  }).length;
  const genotypeCompletionPct =
    total > 0 ? Math.round((withGenotype / total) * 100) : 0;

  // Sex ratio string.
  const ratioStr = [
    male > 0 ? `♂${male}` : '',
    female > 0 ? `♀${female}` : '',
    unknown > 0 ? `?${unknown}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Unique statuses for quick-filter.
  const statusCounts = Array.from(stats.statusDistribution.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Groups for quick-filter.
  const groupRows = stats.litterGroups
    .map((g) => ({ label: g.groupId, count: g.individuals.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        {/* Use a simple inline SVG icon so we don't need an extra import */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-brand"
          aria-hidden="true"
        >
          <rect x="1" y="4" width="5" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="7.5" y="1" width="5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="6" width="1" height="1" rx="0.5" fill="currentColor" />
        </svg>
        <h3 className="text-sm font-semibold text-text-primary">
          {isKo ? '코호트 요약' : 'Cohort Summary'}
        </h3>
      </div>

      {/* Summary metrics */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricCard label={isKo ? '개체 수' : 'Total'} value={total} />
        <MetricCard label={isKo ? '성비' : 'Sex ratio'} value={ratioStr || '—'} />
        <MetricCard label={isKo ? '리터 수' : 'Groups'} value={groupRows.length} />
        <MetricCard
          label={isKo ? '유전형 완성도' : 'Genotype %'}
          value={`${genotypeCompletionPct}%`}
        />
      </div>

      {/* Quick filter: by group */}
      {groupRows.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-text-muted">
            {isKo ? '그룹 필터' : 'Filter by group'}
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onFocusGroup(null)}
              className={`panel-button flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                activeGroupId === null ? 'border-[var(--color-border-strong)] bg-surface' : ''
              }`}
            >
              <span className="truncate text-xs text-text-secondary">
                {isKo ? '전체' : 'All'}
              </span>
              <span className="shrink-0 text-xs font-semibold text-text-primary">{total}</span>
            </button>
            {groupRows.map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => onFocusGroup(row.label)}
                className={`panel-button flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                  activeGroupId === row.label ? 'border-[var(--color-border-strong)] bg-surface' : ''
                }`}
                title={row.label}
              >
                <span className="truncate font-mono text-xs text-text-secondary">{row.label}</span>
                <span className="shrink-0 text-xs font-semibold text-text-primary">{row.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick filter: by status */}
      {statusCounts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-text-muted">
            {isKo ? '상태 분포' : 'By status'}
          </p>
          <div className="space-y-1">
            {statusCounts.map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs text-text-secondary" title={status}>
                  {status}
                </span>
                <span className="shrink-0 text-xs font-semibold text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ label, value }: { readonly label: string; readonly value: number | string }): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface-raised px-3 py-2">
      <p className="truncate text-[11px] uppercase tracking-wide text-text-muted" title={label}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-text-primary" title={String(value)}>{value}</p>
    </div>
  );
}

function MetricRow({
  label,
  value,
  mono = false,
}: {
  readonly label: string;
  readonly value: number | string;
  readonly mono?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2">
      <span className={`min-w-0 truncate text-xs ${mono ? 'font-mono' : ''} text-text-secondary`} title={label}>{label}</span>
      <span className="shrink-0 text-xs font-semibold text-text-primary">{value}</span>
    </div>
  );
}
