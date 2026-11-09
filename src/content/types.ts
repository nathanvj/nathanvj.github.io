/**
 * Shapes for everything in src/content. You only need this file when adding
 * a new kind of content; for editing text, open the other files in this folder.
 *
 * Text fields marked `Rich` support two bits of markup:
 *   [link text](https://example.com)   becomes a link
 *   **bold**                           becomes bold
 */

export type Rich = string;

export type HatName = 'cap' | 'hardhat' | 'crown' | 'party';
export type IconName =
  | 'spark' | 'cube' | 'shield' | 'cap' | 'heart' | 'bone' | 'bolt' | 'ball' | 'chat'
  | 'spring' | 'moon' | 'sun' | 'term' | 'game';

export interface Link {
  label: string;
  href: string;
}

export interface Social {
  /** used by the terminal: `open github` */
  id: string;
  name: string;
  url: string;
}

export interface WorkEntry {
  role: string;
  company: string;
  url?: string;
  /** a pixel logo in public/img/logos, or 'portrait' for the little pixel Nathan, or an icon name */
  logo: { src: string; width: number; height: number } | { portrait: true } | { icon: IconName };
  period: string;
  location: string;
  /** current jobs get an orange "In progress" badge and an orange dot on the timeline */
  current: boolean;
  description: Rich;
  highlights?: string[];
  /** what Ruby might say when she lands on this card */
  rubySays?: string;
  /** a hat Ruby puts on when she lands on this card, and what she says about it */
  hat?: { name: HatName; says: string };
}

export interface Ability {
  icon: IconName;
  title: string;
  text: Rich;
}

export interface Achievement {
  id: string;
  name: string;
  /** how to earn it, shown in Ruby's panel */
  how: string;
  icon: IconName;
  /** secret achievements show this text instead of name and how, until found */
  secret?: string;
}
