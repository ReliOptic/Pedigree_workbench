import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('node right-click menu', () => {
  it('opens on right-click and shows the benchmark-informed items', async () => {
    render(<App />);
    const node = await screen.findByTestId('pedigree-node-SNUDB #1-1');

    fireEvent.contextMenu(node, { clientX: 200, clientY: 200 });

    const menu = await screen.findByTestId('context-menu');
    expect(within(menu).getByTestId('ctx-edit')).toBeInTheDocument();
    expect(within(menu).getByTestId('ctx-add-child')).toBeInTheDocument();
    expect(within(menu).getByTestId('ctx-add-sibling')).toBeInTheDocument();
    expect(within(menu).getByTestId('ctx-copy-id')).toBeInTheDocument();
    expect(within(menu).getByTestId('ctx-delete')).toBeInTheDocument();
  }, 20000);

  it('Escape dismisses the menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    const node = await screen.findByTestId('pedigree-node-SNUDB #1-1');

    fireEvent.contextMenu(node);
    await screen.findByTestId('context-menu');
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
    });
  }, 20000);

  it('Add child prefills sire when target is male', async () => {
    const user = userEvent.setup();
    render(<App />);
    // SNUDB #1-1 is 수컷 (male) in the seed data.
    const node = await screen.findByTestId('pedigree-node-SNUDB #1-1');

    fireEvent.contextMenu(node);
    await screen.findByTestId('context-menu');
    await user.click(screen.getByTestId('ctx-add-child'));

    const dialog = await screen.findByRole('dialog', { name: /add node/i });
    // The sire <select> should have "SNUDB #1-1" already selected.
    const sireSelect = within(dialog)
      .getAllByRole('combobox')
      .find((el) => (el as HTMLSelectElement).value === 'SNUDB #1-1');
    expect(sireSelect).toBeDefined();
  }, 20000);

  it('Add sibling prefills sire and dam from target', async () => {
    const user = userEvent.setup();
    render(<App />);
    // F1-1 has sire=SNUDB #1-1 and dam=SNUDB #2-1 in the seed.
    const node = await screen.findByTestId('pedigree-node-F1-1');

    fireEvent.contextMenu(node);
    await screen.findByTestId('context-menu');
    await user.click(screen.getByTestId('ctx-add-sibling'));

    const dialog = await screen.findByRole('dialog', { name: /add node/i });
    const selects = within(dialog).getAllByRole('combobox');
    const sireSelect = selects.find((el) => (el as HTMLSelectElement).value === 'SNUDB #1-1');
    const damSelect = selects.find((el) => (el as HTMLSelectElement).value === 'SNUDB #2-1');
    expect(sireSelect).toBeDefined();
    expect(damSelect).toBeDefined();
  }, 20000);

  it('Delete removes the target node', async () => {
    const user = userEvent.setup();
    render(<App />);
    const node = await screen.findByTestId('pedigree-node-SNUDB #1-2');

    fireEvent.contextMenu(node);
    await screen.findByTestId('context-menu');
    await user.click(screen.getByTestId('ctx-delete'));

    await waitFor(() => {
      expect(screen.queryByTestId('pedigree-node-SNUDB #1-2')).not.toBeInTheDocument();
    });
  }, 20000);
});

describe('canvas right-click menu', () => {
  it('opens on right-click of empty canvas with Add individual + Fit to screen', async () => {
    render(<App />);
    await screen.findByTestId('pedigree-node-SNUDB #1-1');

    const canvas = screen.getByTestId('pedigree-canvas');
    fireEvent.contextMenu(canvas, { clientX: 50, clientY: 50 });

    const menu = await screen.findByTestId('context-menu');
    expect(within(menu).getByTestId('ctx-add-individual')).toBeInTheDocument();
    expect(within(menu).getByTestId('ctx-fit-view')).toBeInTheDocument();
    expect(within(menu).getByTestId('ctx-zoom-in')).toBeInTheDocument();
    expect(within(menu).getByTestId('ctx-zoom-out')).toBeInTheDocument();
  }, 20000);

  it('Add individual opens the modal empty', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId('pedigree-node-SNUDB #1-1');

    const canvas = screen.getByTestId('pedigree-canvas');
    fireEvent.contextMenu(canvas);
    await screen.findByTestId('context-menu');
    await user.click(screen.getByTestId('ctx-add-individual'));

    const dialog = await screen.findByRole('dialog', { name: /add node/i });
    const idInput = within(dialog).getByTestId('add-node-id') as HTMLInputElement;
    expect(idInput.value).toBe('');
  }, 20000);
});
