/**
 * Smart next-steps checklist dynamically generated from cohort data gaps.
 */

import type { MissingDataAlert } from '../../types/breeding.types';

interface NextStep {
  readonly label: string;
  readonly done: boolean;
}

interface NextStepChecklistProps {
  readonly missingAlerts: readonly MissingDataAlert[];
  readonly breedingCandidateCount: number;
  readonly totalCount: number;
  readonly hasMatings?: boolean;
  readonly hasF1?: boolean;
}

function buildSteps(
  missingAlerts: readonly MissingDataAlert[],
  breedingCandidateCount: number,
  totalCount: number,
  hasMatings: boolean,
  hasF1: boolean,
): readonly NextStep[] {
  const steps: NextStep[] = [];

  const sexAlert = missingAlerts.find((a) => a.field === 'sex');
  if (sexAlert !== undefined) {
    steps.push({
      label: `Complete sex data for ${sexAlert.missingCount} individuals (${sexAlert.missingCount}/${totalCount})`,
      done: false,
    });
  }

  const cd163Alert = missingAlerts.find((a) => a.field === 'CD163');
  if (cd163Alert !== undefined) {
    steps.push({
      label: `Add CD163 genotype data (${cd163Alert.missingCount}/${totalCount} missing)`,
      done: false,
    });
  }

  const birthAlert = missingAlerts.find((a) => a.field === 'birth_date');
  if (birthAlert !== undefined) {
    steps.push({
      label: `Record birth dates (${birthAlert.missingCount}/${totalCount} missing)`,
      done: false,
    });
  }

  if (breedingCandidateCount > 0 && !hasMatings) {
    steps.push({
      label: `Set up mating pairs for ${breedingCandidateCount} breeding candidate${breedingCandidateCount > 1 ? 's' : ''}`,
      done: false,
    });
  } else if (breedingCandidateCount > 0 && hasMatings) {
    steps.push({
      label: `Matings planned for ${breedingCandidateCount} breeding candidate${breedingCandidateCount > 1 ? 's' : ''}`,
      done: true,
    });
  }

  if (!hasF1) {
    steps.push({
      label: 'Record F1 offspring when born',
      done: false,
    });
  }

  if (steps.length === 0) {
    steps.push({ label: 'Data complete — ready to plan matings', done: true });
  }

  return steps;
}

export function NextStepChecklist({
  missingAlerts,
  breedingCandidateCount,
  totalCount,
  hasMatings = false,
  hasF1 = false,
}: NextStepChecklistProps): React.JSX.Element {
  const steps = buildSteps(missingAlerts, breedingCandidateCount, totalCount, hasMatings, hasF1);

  return (
    <ul className="space-y-2">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-2 text-xs">
          <span
            className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-[9px] ${
              step.done
                ? 'border-green-500 bg-green-100 text-green-700'
                : 'border-slate-300 bg-surface'
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
