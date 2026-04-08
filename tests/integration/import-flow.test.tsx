import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../../src/App';
import { __resetForTests } from '../../src/services/pedigree-store';

beforeEach(async () => {
  __resetForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('pedigree-workbench');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

afterEach(() => {
  __resetForTests();
});

describe('import flow integration', () => {
  it('seeds the canvas, imports a new dataset, and re-renders the nodes', async () => {
    const user = userEvent.setup();
    render(<App />);

    // First render shows the seeded individuals.
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-GEN-0942')).toBeInTheDocument();
    });

    // Open the import modal via the upload button.
    await user.click(screen.getByRole('button', { name: /upload/i }));
    const textarea = await screen.findByTestId('import-textarea');

    const payload = JSON.stringify([
      { id: 'IMP-A', label: '01', gender: 'male', generation: 1 },
      { id: 'IMP-B', label: '02', gender: 'female', generation: 1 },
      { id: 'IMP-C', label: '03', gender: 'male', generation: 2, sireId: 'IMP-A', damId: 'IMP-B' },
    ]);

    fireEvent.change(textarea, { target: { value: payload } });
    await user.click(screen.getByTestId('import-submit'));

    // After import, the new nodes should render and the seeded ones should be gone.
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-IMP-A')).toBeInTheDocument();
      expect(screen.getByTestId('pedigree-node-IMP-C')).toBeInTheDocument();
      expect(screen.queryByTestId('pedigree-node-GEN-0942')).not.toBeInTheDocument();
    });
  }, 20000);

  it('shows a validation error and leaves the canvas untouched on bad input', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-GEN-0942')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /upload/i }));
    const textarea = await screen.findByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: '{not json' } });
    await user.click(screen.getByTestId('import-submit'));

    expect(await screen.findByTestId('import-error')).toBeInTheDocument();
    // Original seed still rendered behind the modal.
    expect(screen.getByTestId('pedigree-node-GEN-0942')).toBeInTheDocument();
  }, 20000);
});
