import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('canvas keyboard interactions', () => {
  it('escape deselects a selected node', async () => {
    const user = userEvent.setup();
    render(<App />);

    const node = await screen.findByTestId('pedigree-node-SNU-B001');
    await user.click(node);

    // Inspector opens on selection.
    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: /inspector/i })).toBeInTheDocument();
    });

    // Escape on the canvas deselects.
    const canvas = screen.getByTestId('pedigree-canvas');
    canvas.focus();
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('complementary', { name: /inspector/i })).not.toBeInTheDocument();
    });
  }, 20000);

  it('exposes a keyboard-focusable canvas region with aria-label', async () => {
    render(<App />);

    // Canvas is a named region reachable by assistive tech.
    const canvas = await screen.findByRole('region', { name: /pedigree canvas/i });
    expect(canvas).toHaveAttribute('tabindex', '0');
  }, 20000);

  it('zoom toolbar buttons have accessible names', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-SNU-B001')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fit to screen/i })).toBeInTheDocument();
  }, 20000);

  it('node buttons announce sex and generation via aria-label', async () => {
    render(<App />);

    const node = await screen.findByTestId('pedigree-node-SNU-B001');
    const label = node.getAttribute('aria-label') ?? '';
    // Seed SNU-B001 is male, F0 — label should reference both.
    expect(label).toMatch(/male/i);
    expect(label).toMatch(/generation/i);
    expect(label).toMatch(/F0/);
  }, 20000);
});

describe('import modal accessibility', () => {
  it('is marked as a modal dialog with an accessible name', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    const dialog = await screen.findByRole('dialog', { name: /import/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  }, 20000);

  it('escape closes the modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /upload/i }));
    await screen.findByRole('dialog', { name: /import/i });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /import/i })).not.toBeInTheDocument();
    });
  }, 20000);
});
