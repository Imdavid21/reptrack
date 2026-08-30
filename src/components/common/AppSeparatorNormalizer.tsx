import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// A metadata separator has whitespace on at least one side. Keep compact
// semantic multiplication such as kg·reps intact.
const SEPARATOR = /(?:\s+·\s*|\s*·\s+)/g;
const SKIP_SELECTOR = 'script, style, code, pre, textarea';

/** Writes only when the value actually changes so the observer never feeds itself. */
function normalizeTextNode(node: Node) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP_SELECTOR)) return;
  const current = node.nodeValue;
  if (!current || !current.includes('·')) return;
  const next = current.replace(SEPARATOR, ' | ');
  if (next !== current) node.nodeValue = next;
}

function normalizeNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    normalizeTextNode(node);
    return;
  }

  if (!(node instanceof Element) || node.matches(SKIP_SELECTOR)) return;

  for (const attribute of ['aria-label', 'title']) {
    const value = node.getAttribute(attribute);
    if (!value || !value.includes('·')) continue;
    const next = value.replace(SEPARATOR, ' | ');
    if (next !== value) node.setAttribute(attribute, next);
  }

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    normalizeTextNode(textNode);
    textNode = walker.nextNode();
  }
}

/**
 * App-wide presentation rule for compact metadata separators.
 * Existing and lazy-rendered UI is normalized without touching multiplication
 * signs, decimal punctuation, or prose outside authenticated app routes.
 */
export function AppSeparatorNormalizer() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith('/app')) return;

    const root = document.getElementById('root');
    if (!root) return;

    normalizeNode(root);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(normalizeNode);
        if (mutation.type === 'characterData') normalizeTextNode(mutation.target);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  return null;
}
