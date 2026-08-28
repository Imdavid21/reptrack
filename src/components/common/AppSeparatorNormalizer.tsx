import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// A metadata separator has whitespace on at least one side. Keep compact
// semantic multiplication such as kg·reps intact.
const SEPARATOR = /(?:\s+·\s*|\s*·\s+)/g;
const SKIP_SELECTOR = 'script, style, code, pre, textarea';

function normalizeNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP_SELECTOR)) return;
    const current = node.nodeValue;
    if (current?.includes('·')) node.nodeValue = current.replace(SEPARATOR, ' | ');
    return;
  }

  if (!(node instanceof Element) || node.matches(SKIP_SELECTOR)) return;

  for (const attribute of ['aria-label', 'title']) {
    const value = node.getAttribute(attribute);
    if (value?.includes('·')) node.setAttribute(attribute, value.replace(SEPARATOR, ' | '));
  }

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const parent = textNode.parentElement;
    if (parent && !parent.closest(SKIP_SELECTOR)) {
      const value = textNode.nodeValue;
      if (value?.includes('·')) textNode.nodeValue = value.replace(SEPARATOR, ' | ');
    }
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
        if (mutation.type === 'characterData') normalizeNode(mutation.target);
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
