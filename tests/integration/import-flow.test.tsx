import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../../src/App';
import { bulkImport, __resetForTests } from '../../src/services/pedigree-store';
import { SEED_INDIVIDUALS } from '../../src/services/seed-data';

beforeEach(async () => {
  __resetForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('pedigree-workbench');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  await bulkImport(SEED_INDIVIDUALS);
});

afterEach(() => {
  __resetForTests();
});

describe('import flow integration', () => {
  it('seeds the canvas, imports a new dataset, and re-renders the nodes', async () => {
    const user = userEvent.setup();
    render(<App />);

    // First render shows a seeded individual (manually seeded in beforeEach).
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-SNU-B001')).toBeInTheDocument();
    });

    // Open the import modal via the upload button.
    await user.click(screen.getByRole('button', { name: /upload/i }));
    const textarea = await screen.findByTestId('import-textarea');

    const payload = JSON.stringify([
      { id: 'IMP-A', sex: 'M', generation: 'F0', label: '01' },
      { id: 'IMP-B', sex: 'F', generation: 'F0', label: '02' },
      { id: 'IMP-C', sex: 'M', generation: 'F1', sire: 'IMP-A', dam: 'IMP-B', label: '03' },
    ]);

    fireEvent.change(textarea, { target: { value: payload } });
    await user.click(screen.getByTestId('import-submit'));

    // After import, the new nodes should render and the seed should be gone.
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-IMP-A')).toBeInTheDocument();
      expect(screen.getByTestId('pedigree-node-IMP-C')).toBeInTheDocument();
      expect(screen.queryByTestId('pedigree-node-SNU-B001')).not.toBeInTheDocument();
    });
  }, 20000);

  it('shows a validation error and leaves the canvas untouched on bad input', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-SNU-B001')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /upload/i }));
    const textarea = await screen.findByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: '{not json' } });
    await user.click(screen.getByTestId('import-submit'));

    expect(await screen.findByTestId('import-error')).toBeInTheDocument();
    // Original seed still rendered behind the modal.
    expect(screen.getByTestId('pedigree-node-SNU-B001')).toBeInTheDocument();
  }, 20000);
});
