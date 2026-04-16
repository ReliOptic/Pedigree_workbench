import { AlertTriangle, GitBranchPlus, HeartHandshake, Layers3, Link2, Plus, ShieldAlert, Spline } from 'lucide-react';

import type { CohortStats, MissingDataAlert } from '../types/breeding.types';
import type { Individual } from '../types/pedigree.types';
import type { Language } from '../types/translation.types';
import type { PopulationStats } from '../services/population-genetics';
import type { ValidationResult } from '../services/pedigree-validation';
import type { SpeciesProfile } from '../services/species-profiles';

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
  readonly onCollapse: () => void;
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
  onCollapse,
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
          <p className="text-xs leading-5 text-text-muted">
            {language === 'ko'
              ? '세대와 리터를 기준으로 작업 대상을 좁힌 뒤, 캔버스에서 관계를 편집하세요.'
              : 'Use generations and litters to narrow the working set, then edit relationships on the canvas.'}
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

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">{labels.topAttentionNodes}</h3>
          </div>
          <div className="mt-3 space-y-2">
            {attentionIndividuals.length === 0 ? (
              <p className="text-xs text-text-muted">{labels.noAttentionNodes}</p>
            ) : (
              attentionIndividuals.map((individual) => (
                <button
                  key={individual.id}
                  type="button"
                  onClick={() => onSelectIndividual(individual.id)}
                  className="panel-button flex w-full items-start justify-between rounded-lg px-3 py-2 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary" title={individual.label ?? individual.id}>
                      {individual.label ?? individual.id}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-text-secondary" title={individual.id}>
                      {individual.id}
                    </p>
                  </div>
                  <span className="mt-0.5 text-[11px] text-text-muted">{individual.generation ?? '—'}</span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

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
