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

function createCsvFile(content: string, name: string): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('CSV import flow integration', () => {
  it('uploads a CSV file, shows column mapper, adjusts mapping, imports, and renders nodes', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for initial seed to render.
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-SNU-B001')).toBeInTheDocument();
    });

    // Open the import modal.
    await user.click(screen.getByRole('button', { name: /upload/i }));

    // Find the file input and upload a CSV.
    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const csvContent = 'id,sex,generation,sire,dam,label\nCSV-A,M,F0,,,A\nCSV-B,F,F0,,,B\nCSV-C,M,F1,CSV-A,CSV-B,C';
    const file = createCsvFile(csvContent, 'test.csv');

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for column mapper to appear.
    await waitFor(() => {
      expect(screen.getByTestId('column-mapper-submit')).toBeInTheDocument();
    });

    // The auto-mapping should have detected reserved columns.
    // Click import without adjusting.
    await user.click(screen.getByTestId('column-mapper-submit'));

    // Dismiss ImportSummary overlay if it appears
    const dismissBtn = await screen.findByText('Start in Workbench', {}, { timeout: 5000 }).catch(() => null);
    if (dismissBtn) await user.click(dismissBtn);

    // After import, new nodes should render and old seed should be gone.
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-CSV-A')).toBeInTheDocument();
      expect(screen.getByTestId('pedigree-node-CSV-B')).toBeInTheDocument();
      expect(screen.getByTestId('pedigree-node-CSV-C')).toBeInTheDocument();
      expect(screen.queryByTestId('pedigree-node-SNU-B001')).not.toBeInTheDocument();
    });
  }, 20000);

  it('uploads a JSON file via file input and uses the JSON import lane', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-SNU-B001')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /upload/i }));

    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const jsonContent = JSON.stringify([
      { id: 'JSON-A', sex: 'M', generation: 'F0' },
      { id: 'JSON-B', sex: 'F', generation: 'F0' },
    ]);
    const file = new File([jsonContent], 'data.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // JSON file should populate the textarea, not show column mapper.
    await waitFor(() => {
      const textarea = screen.getByTestId('import-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(jsonContent);
    });

    // Now click import.
    await user.click(screen.getByTestId('import-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-JSON-A')).toBeInTheDocument();
      expect(screen.getByTestId('pedigree-node-JSON-B')).toBeInTheDocument();
      expect(screen.queryByTestId('pedigree-node-SNU-B001')).not.toBeInTheDocument();
    });
  }, 20000);
});
