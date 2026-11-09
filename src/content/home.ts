/**
 * Everything you read on the page, section by section, top to bottom.
 *
 * Markup in `Rich` fields: [link text](https://url) and **bold**.
 * `rubySays` is what Ruby might say when she lands on that part of the page.
 */
import type { Ability, AskQuestion, Link, Rich, WorkEntry } from './types';

// ------------------------------------------------------------------ hero
export const hero = {
  title: "Hi, I'm Nathan.",
  lede: 'CTO at [Advey](https://advey.ai).' as Rich,
  actions: [
    { label: 'Email me', href: 'mailto:hi@nathanvj.com' },
    { label: 'See my work', href: '#work' },
  ] satisfies Link[],
  rubySays: "That's my human.",
  streetSays: 'Smell that polder air.',
};

// ------------------------------------------------------------------ about
export const about = {
  title: 'About',
  photo: {
    src: '/img/about.jpg',
    alt: 'Nathan van Jole, laughing, in a brown polo',
    caption: 'Nathan, at full resolution.',
    rubySays: 'Looking good.',
  },
  paragraphs: [
    'I started writing code at twelve: Unity games first, then PHP sites held together mostly by optimism. What stuck was building the whole thing, back to front, and getting the small stuff right.',
    'I studied Informatics in Roosendaal and graduated with honours in 2020, after building software for healthcare, logistics and finance. Since then I have been shipping products that people rely on every day.',
    "Today I'm CTO at Advey, and I also lead development at GetMore Systems. I like small teams, real problems, and people who care about the details.",
  ] as Rich[],
  /** a few plain facts under the story */
  facts: {
    rows: [
      { label: 'Based in', value: 'The Netherlands' },
      { label: 'Writing code since', value: '2012' },
      { label: 'Building', value: 'Advey' },
    ],
    rubySays: 'Just the facts.',
  },
};

// ------------------------------------------------------------------ work
export const work = {
  title: 'Work',
  intro: 'Newest first. Three of these are still in progress.',
  entries: [
    {
      role: 'CTO',
      company: 'Advey',
      url: 'https://advey.ai',
      logo: { src: '/img/logos/advey.png', width: 14, height: 13 },
      period: 'Now',
      location: 'The Netherlands',
      current: true,
      description:
        'An AI platform that records and transcribes client meetings for financial advisors, then turns them into structured reports. "You became an advisor, not a note-taker."',
      highlights: [
        'Technical vision, architecture and product engineering, from idea to production',
        'The AI pipeline, from recorded meeting to finished report',
      ],
      rubySays: 'This is the big one right now.',
    },
    {
      role: 'Lead developer',
      company: 'GetMore Systems',
      url: 'https://www.getmoresystems.com',
      logo: { src: '/img/logos/getmore.png', width: 16, height: 16 },
      period: 'Aug 2024 to now',
      location: 'Barendrecht',
      current: true,
      description:
        'Responsible for technical quality and progress: evolving the platform front to back, and making sure technical choices line up with where the business is going.',
      highlights: [
        'Feature development across frontend and backend',
        'Code, architecture and performance optimisation',
        'Database management and query tuning',
        'Stability, maintenance and future-proofing',
      ],
      hat: { name: 'hardhat', says: 'Hard hat on. Safety first.' },
    },
    {
      role: 'Founder',
      company: 'Nathan van Jole B.V.',
      logo: { portrait: true },
      period: 'Aug 2024 to now',
      location: 'The Netherlands',
      current: true,
      description:
        'My own company.',
      hat: { name: 'crown', says: 'Boss mode.' },
    },
    {
      role: 'Full-stack developer',
      company: 'Jump',
      url: 'https://jump.nl',
      logo: { src: '/img/logos/jump.png', width: 10, height: 15 },
      period: 'Jan 2020 to Jul 2022',
      location: 'Zwijndrecht',
      current: false,
      description: 'A startup helping companies innovate through digitalisation and custom software.',
      highlights: [
        'Rewrote and extended brownfield CRM software for the financial sector',
        'Designed and built a digital catalogue for maritime products',
        'Designed and built an app for issuing and tracking COVID-19 self-tests',
        'Low and high fidelity designs in Figma, direct client contact and support',
      ],
    },
    {
      role: 'Informatics',
      company: 'Associate Degree Academy',
      logo: { icon: 'cap' },
      period: 'Graduated 2020, with honours',
      location: 'Roosendaal',
      current: false,
      description: 'Automated business processes and built applications for healthcare, logistics and finance.',
      hat: { name: 'cap', says: 'Graduated, with honours.' },
    },
  ] as WorkEntry[],
};

// ------------------------------------------------------------------ what I build
export const build = {
  title: 'What I build',
  intro: 'Give me a problem, not a tech stack. These days the problem usually involves AI.',
  featured: {
    icon: 'spark',
    title: 'AI that does real work',
    text: 'LLM features, agents and pipelines that hold up in production: retrieval over your own data, speech to structured documents, and evaluations so you know it actually works. At Advey this turns hour-long client meetings into structured reports.',
  } satisfies Ability,
  rubySays: 'This is the fun part.',
  abilities: [
    {
      icon: 'cube',
      title: 'Whole products, back to front',
      text: "From the first sketch to production: architecture, APIs, databases, frontends, and the design in between. I'd rather own the whole thing than hand it off halfway.",
    },
    {
      icon: 'shield',
      title: 'Systems that stay up',
      text: 'Performance, monitoring and the other unglamorous parts, like code the next developer can actually read.',
    },
  ] satisfies Ability[],
  /** the "Ask me something" box: pick a question, the answer types itself out */
  ask: {
    title: 'Ask me something',
    placeholder: 'Pick a question.',
    questions: [
      {
        id: 'advey',
        question: 'What are you building at Advey?',
        answer:
          'Advey records and transcribes client meetings for financial advisors, then turns them into structured reports. As CTO I own the architecture and the AI pipeline, from speech to the final report.',
      },
      {
        id: 'reliable',
        question: 'How do you make AI reliable?',
        answer:
          "Treat the model like a dependency you don't fully trust. Give it a narrow job and the right context, check what it returns against real rules, and measure it on real examples before and after every change. Most of the work is the boring part around the model.",
      },
      {
        id: 'projects',
        question: 'Are you taking on projects?',
        answer:
          "Not right now: Advey has all of me. But if you're building something in AI or finance and want to compare notes, email me at hi@nathanvj.com. I usually reply within a day.",
      },
    ] satisfies AskQuestion[],
  },
};

// ------------------------------------------------------------------ contact
export const contact = {
  title: 'Say hi',
  intro: 'Got a question, an idea, or just want to say hi? Email me. I usually reply within a day.',
  copyLabel: 'Copy address',
  copied: 'Copied {email}',
  copyFailed: "Couldn't copy. The address is {email}",
  rubyOnCopy: 'Got it. Now paste it somewhere nice.',
  mailboxSays: 'Post goes in here.',
  /** the envelope on the grass: click it to post it, and your mail app opens */
  letter: 'Post a letter to Nathan',
  letterHint: 'Psst: that letter wants to be posted.',
  rubyOnPost: 'Woof! Post for Nathan!',
};
