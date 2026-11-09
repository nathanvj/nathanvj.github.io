/**
 * Site-wide settings: who you are, how to reach you, the menu and the footer.
 * Change anything here and the whole page (and the terminal) follows.
 */
import type { Link, Social } from './types';

export const site = {
  name: 'Nathan van Jole',
  url: 'https://nathanvj.com',
  /** browser tab title and the title in link previews */
  title: 'Nathan van Jole',
  /** the description search engines and link previews show */
  description:
    'Nathan van Jole, CTO at Advey.',
  email: 'hi@nathanvj.com',
  location: 'The Netherlands',
  /** used for the twitter:creator tag */
  twitter: '@nathanvanjole',

  socials: [
    { id: 'github', name: 'GitHub', url: 'https://github.com/nathanvj' },
    { id: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/in/nathan-van-jole' },
    { id: 'x', name: 'X', url: 'https://twitter.com/nathanvanjole' },
    { id: 'instagram', name: 'Instagram', url: 'https://instagram.com/nathanvanjole' },
  ] satisfies Social[],

  nav: [
    { label: 'About', href: '#about' },
    { label: 'Work', href: '#work' },
    { label: 'Build', href: '#build' },
    { label: 'Contact', href: '#contact' },
  ] satisfies Link[],

  footer: {
    /** {year} is replaced with the current year */
    copyright: '© {year} Nathan van Jole',
    madeIn: 'Made in the Netherlands, with Ruby and',
    /** the beating heart: clicking it starts date night on the water */
    heart: { label: 'Daniëlle', bubble: '♥ Daniëlle' },
    hideRuby: 'Hide Ruby',
    showRuby: 'Bring Ruby back',
  },
};
