import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders **bold** as <strong>, not literal asterisks', () => {
    const { container } = render(<Markdown>{'Japanese uses **three writing systems**.'}</Markdown>);
    expect(container.querySelector('strong')?.textContent).toBe('three writing systems');
    // The raw asterisks must not survive to the DOM.
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).toBe('Japanese uses three writing systems.');
  });

  it('renders lists', () => {
    const { container } = render(<Markdown>{'- one\n- two'}</Markdown>);
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders inline code', () => {
    const { container } = render(<Markdown>{'The particle `は` marks the topic.'}</Markdown>);
    expect(container.querySelector('code')?.textContent).toBe('は');
  });

  it('escapes raw HTML rather than executing it', () => {
    const { container } = render(<Markdown>{'<img src=x onerror="alert(1)">'}</Markdown>);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders nothing for empty content', () => {
    const { container } = render(<Markdown>{null}</Markdown>);
    expect(container.firstChild).toBeNull();
  });

  it('renders headings', () => {
    render(<Markdown>{'## Kana Forest'}</Markdown>);
    expect(screen.getByRole('heading', { name: 'Kana Forest' })).toBeInTheDocument();
  });
});
