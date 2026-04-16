import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

describe('node edit flow', () => {
  it('opens the inspector, edits label, saves, and reflects the change', async () => {
    const user = userEvent.setup();
    render(<App />);

    const node = await screen.findByTestId('pedigree-node-SNU-B001');
    await user.click(node);

    // Inspector opens.
    const inspector = await screen.findByRole('complementary', { name: /inspector/i });
    // Enter edit mode.
    await user.click(within(inspector).getByTestId('inspector-edit'));

    // Change the label.
    const labelInput = within(inspector).getAllByRole('textbox')[0]; // first textbox = label field
    expect(labelInput).toBeDefined();
    await user.clear(labelInput!);
    await user.type(labelInput!, 'renamed');

    // Save.
    await user.click(within(inspector).getByTestId('inspector-save'));

    // After save, the inspector header label updates with the new value.
    await waitFor(() => {
      expect(within(inspector).getByTestId('inspector-label-display')).toHaveTextContent(
        'renamed',
      );
    });
  }, 20000);

  it('adds a sequence in edit mode, persists, and shows the sequence section', async () => {
    const user = userEvent.setup();
    render(<App />);

    const node = await screen.findByTestId('pedigree-node-SNU-S011');
    await user.click(node);

    const inspector = await screen.findByRole('complementary', { name: /inspector/i });
    await user.click(within(inspector).getByTestId('inspector-edit'));

    const seqBox = within(inspector).getByTestId('inspector-sequence');
    await user.clear(seqBox);
    await user.type(seqBox, 'ATGCGTACG');

    await user.click(within(inspector).getByTestId('inspector-save'));

    // After save we're back in read mode and the sequence section shows length.
    await waitFor(() => {
      expect(within(inspector).getByText(/Length: 9 bp/i)).toBeInTheDocument();
    });
    // Predict Structure button is present and enabled.
    const predictBtn = within(inspector).getByTestId('predict-structure');
    expect(predictBtn).toBeEnabled();
  }, 20000);

  it('deletes a node after confirming, removing it from the canvas', async () => {
    const user = userEvent.setup();
    render(<App />);

    const node = await screen.findByTestId('pedigree-node-SNU-B002');
    await user.click(node);

    const inspector = await screen.findByRole('complementary', { name: /inspector/i });
    await user.click(within(inspector).getByTestId('inspector-delete'));
    await user.click(within(inspector).getByTestId('inspector-confirm-delete'));

    await waitFor(() => {
      expect(screen.queryByTestId('pedigree-node-SNU-B002')).not.toBeInTheDocument();
    });
  }, 20000);
});

describe('add node flow', () => {
  it('opens the add-node modal, submits, and renders the new node', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for seed to land.
    await screen.findByTestId('pedigree-node-SNU-B001');

    await user.click(screen.getByTestId('add-node-button'));
    const dialog = await screen.findByRole('dialog', { name: /add node/i });

    const idInput = within(dialog).getByTestId('add-node-id');
    await user.type(idInput, 'NEW-001');
    await user.click(within(dialog).getByTestId('add-node-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-NEW-001')).toBeInTheDocument();
    });
  }, 20000);

  it('blocks duplicate ids with an error', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByTestId('pedigree-node-SNU-B001');

    await user.click(screen.getByTestId('add-node-button'));
    const dialog = await screen.findByRole('dialog', { name: /add node/i });

    await user.type(within(dialog).getByTestId('add-node-id'), 'SNU-B001');
    await user.click(within(dialog).getByTestId('add-node-submit'));

    await waitFor(() => {
      expect(within(dialog).getByTestId('add-node-error')).toBeInTheDocument();
    });
  }, 20000);
});
