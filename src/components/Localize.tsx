"use client";

import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { useLanguage } from './LanguageContext';

const ATTRIBUTES = ['title', 'alt', 'placeholder', 'aria-label', 'aria-description'] as const;
const childKey = (child: ReactNode, index: number) => isValidElement(child) ? `node:${child.key ?? index}` : `text:${index}`;
/** React-owned text localization; no DOM mutation, HTML injection, external request, or extra layout element. */
export function localizeTree(node: ReactNode, translate: (value: string) => string): ReactNode {
  if (typeof node === 'string') return translate(node);
  if (Array.isArray(node)) return localizeChildren(node, translate);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props;
  if (element.type === Localize || props.translate === 'no' || props['data-no-localize']
    || ['script', 'style', 'code'].includes(String(element.type))) return node;
  const next: Record<string, unknown> = {};
  for (const name of ATTRIBUTES) if (typeof props[name] === 'string') next[name] = translate(props[name] as string);
  if (props.children !== undefined && !(element.type === 'option' && props.value === undefined))
    next.children = localizeChildren(props.children as ReactNode, translate);
  return cloneElement(element, next);
}

function localizeChildren(children: ReactNode, translate: (value: string) => string): ReactNode {
  const list = Array.isArray(children) ? children : [children];
  if (list.length === 1) return localizeTree(list[0], translate);
  // Inline emphasis/icons stay React nodes; translated templates may reorder their placeholders.
  const elements: ReactNode[] = [];
  const elementIndexes: number[] = [];
  const text = list.map((child, originalIndex) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (child === null || child === undefined || typeof child === 'boolean') return '';
    const index = elements.push(child) - 1;
    elementIndexes.push(originalIndex);
    return `⟬RZ${index}⟭`;
  }).join('');
  const translated = translate(text);
  // If no whole-message match exists, translate each literal without merging React elements.
  if (translated === text) return list.map((child, index) => <Fragment key={childKey(child, index)}>{localizeTree(child, translate)}</Fragment>);
  return translated.split(/(⟬RZ\d+⟭)/g).map((part, index) => {
    const marker = /^⟬RZ(\d+)⟭$/.exec(part);
    const item = marker ? Number(marker[1]) : -1;
    return <Fragment key={marker ? childKey(elements[item], elementIndexes[item]) : `translated-text:${index}`}>{marker ? localizeTree(elements[item], translate) : part}</Fragment>;
  });
}

export function Localize({ children }: { children: ReactNode }) {
  const { translate } = useLanguage();
  return <>{localizeTree(children, translate)}</>;
}
