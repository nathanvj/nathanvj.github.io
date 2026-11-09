/**
 * Turns the tiny markup used in src/content into safe HTML, at build time.
 *   [text](https://url)  ->  <a href="https://url">text</a>  (external links open in a new tab)
 *   **text**             ->  <strong>text</strong>
 * Everything else is escaped, so content can never inject markup by accident.
 */
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function rich(text: string): string {
  return escape(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const external = /^https?:/.test(href);
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/** Fill {placeholders} in a template string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** A content line can be one string or a list to pick from at random. */
export function pick(line: string | readonly string[]): string {
  return typeof line === 'string' ? line : line[Math.floor(Math.random() * line.length)];
}
