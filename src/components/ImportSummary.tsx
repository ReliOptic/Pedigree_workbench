import { Button } from './ui';
import { StatusDot } from './ui';

interface ImportSummaryAnalysis {
  totalIndividuals: number;
  parentLinkCount: number;
  parentLinkRatio: number;
  generationDepth: number;
  orphanReferences: number;
  litterGroupCount: number;
  missingSex: number;
  missingGenotype: number;
  detectedGenerations: string[];
  recommendedMode: 'cohort' | 'pedigree';
}

interface ImportSummaryProps {
  analysis: ImportSummaryAnalysis;
  onDismiss: () => void;
}

interface StatRowProps {
  label: string;
  value: React.ReactNode;
  indicator?: React.ReactNode;
}

function StatRow({ label, value, indicator }: StatRowProps) {
  return (
    <div style={{ display: 'contents' }}>
      <span
        style={{
          color: 'var(--text-secondary)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-regular)',
          lineHeight: '1.5',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingBlock: '3px',
        }}
      >
        {indicator}
        {label}
      </span>
      <span
        style={{
          color: 'var(--text-primary)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          textAlign: 'right',
          lineHeight: '1.5',
          paddingBlock: '3px',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ImportSummary({ analysis, onDismiss }: ImportSummaryProps) {
  const {
    totalIndividuals,
    parentLinkCount,
    parentLinkRatio,
    generationDepth,
    orphanReferences,
    litterGroupCount,
    missingSex,
    missingGenotype,
    detectedGenerations,
    recommendedMode,
  } = analysis;

  const generationLabel =
    detectedGenerations.length > 0
      ? `${generationDepth} (${detectedGenerations.join('–')})`
      : String(generationDepth);

  const parentLinkLabel = `${parentLinkCount}/${totalIndividuals} (${Math.round(parentLinkRatio * 100)}%)`;

  return (
    <div
      role="dialog"
      aria-label="Import Summary"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 40,
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-overlay)',
        padding: '24px',
        maxWidth: '420px',
        width: '100%',
        fontFamily: 'var(--font-family)',
        pointerEvents: 'all',
      }}
    >
      {/* Title */}
      <h2
        style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-primary)',
          lineHeight: '1.25',
        }}
      >
        Import Summary
      </h2>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          columnGap: '16px',
          rowGap: '0px',
          marginBottom: '16px',
        }}
      >
        <StatRow label="Total individuals" value={totalIndividuals} />
        <StatRow label="Detected generations" value={generationLabel} />
        <StatRow label="Parent links" value={parentLinkLabel} />
        <StatRow
          label="Orphan references"
          value={orphanReferences}
          indicator={
            <StatusDot status={orphanReferences > 0 ? 'warn' : 'ok'} />
          }
        />
        <StatRow label="Litter groups" value={litterGroupCount} />
        <StatRow
          label="Missing sex"
          value={missingSex}
          indicator={<StatusDot status={missingSex > 0 ? 'warn' : 'ok'} />}
        />
        <StatRow
          label="Missing genotype"
          value={missingGenotype}
          indicator={
            <StatusDot status={missingGenotype > 0 ? 'warn' : 'ok'} />
          }
        />
      </div>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          background: 'var(--border)',
          marginBottom: '14px',
        }}
      />

      {/* Recommended mode badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <span
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-regular)',
          }}
        >
          Recommended mode
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            paddingInline: '8px',
            paddingBlock: '3px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-overlay)',
            border: '1px solid var(--border-strong)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--status-active)',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}
        >
          <StatusDot status="ok" />
          {recommendedMode === 'pedigree' ? 'Pedigree' : 'Cohort'}
        </span>
      </div>

      {/* Action button */}
      <Button
        variant="primary"
        size="md"
        onClick={onDismiss}
        style={{ width: '100%' }}
      >
        Start in Workbench
      </Button>
    </div>
  );
}
