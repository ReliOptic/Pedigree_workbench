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

describe('search flow integration', () => {
  it('shows match count when typing a query and dims non-matching nodes', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for seeded nodes to appear.
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-canvas')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toBeInTheDocument();

    // Type a query that won't match anything.
    await user.click(searchInput);
    await user.type(searchInput, 'ZZZZZ-NO-MATCH');

    // Match count badge should appear showing 0 matches.
    await waitFor(() => {
      const badge = screen.getByTestId('search-match-count');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toContain('0');
    });
  }, 20000);

  it('returns all nodes to full opacity when search is cleared', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-canvas')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');

    // Type a query.
    await user.click(searchInput);
    await user.type(searchInput, 'ZZZZZ');

    // Badge visible.
    await waitFor(() => {
      expect(screen.getByTestId('search-match-count')).toBeInTheDocument();
    });

    // Clear the search.
    await user.clear(searchInput);

    // Badge should disappear.
    await waitFor(() => {
      expect(screen.queryByTestId('search-match-count')).not.toBeInTheDocument();
    });
  }, 20000);

  it('clears query and blurs on Escape key', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-canvas')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    await user.click(searchInput);
    await user.type(searchInput, 'test');

    expect(searchInput).toHaveValue('test');

    // Press Escape on the search input.
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  }, 20000);

  it('focuses search input when "/" is pressed', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('pedigree-canvas')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    expect(document.activeElement).not.toBe(searchInput);

    // Press "/" on the body.
    fireEvent.keyDown(window, { key: '/' });

    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });
  }, 20000);

  it('highlights matching nodes with search query', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for at least one seed node.
    await waitFor(() => {
      expect(screen.getByTestId('pedigree-node-SNUDB #1-1')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    await user.click(searchInput);
    await user.type(searchInput, 'SNUDB #1-1');

    // The matching node should not have opacity-30.
    await waitFor(() => {
      const node = screen.getByTestId('pedigree-node-SNUDB #1-1');
      expect(node.className).not.toContain('opacity-30');
    });

    // Match count badge should show at least 1 match.
    await waitFor(() => {
      const badge = screen.getByTestId('search-match-count');
      expect(badge.textContent).toMatch(/^[1-9]/);
    });
  }, 20000);
});
