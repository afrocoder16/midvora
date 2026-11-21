export const packages = [
  { id: 'starter', name: 'Starter', price: 525, caption: 'A proper first impression.', description: 'For a business ready for a beautiful, useful place on the web.', timeline: '5–7 days', features: ['Custom 5-page website', 'Mobile-ready design', 'Contact form + Google Maps', 'Basic SEO setup', 'SSL security', 'Revisions included'], tone: 'sage' },
  { id: 'growth', name: 'Growth', price: 775, caption: 'Room for your next chapter.', description: 'For restaurants, salons, and services ready to do more online.', timeline: '10 days', features: ['Everything in Starter', 'Up to 8 pages', 'Online ordering (Square / Toast)', 'Update your menu from your phone', 'Instagram feed', 'English + Spanish option'], tone: 'blue' },
  { id: 'premium', name: 'Premium', price: 1299, caption: 'The whole picture.', description: 'For an established business ready for a fuller digital experience.', timeline: '14 days', features: ['Everything in Growth', 'Up to 12 pages', 'Interactive features + loyalty cards', 'Your own admin panel', 'Blog section', 'Advanced SEO + analytics'], tone: 'peach' },
];

// What keeps a website online and cared for after the first year.
export const carePlans = [
  { id: 'care', name: 'Care', price: 300, monthly: 25, usually: 'Usually for Starter websites', description: 'Hosting, security, and weekly maintenance. The essentials, quietly taken care of.' },
  { id: 'care-plus', name: 'Care Plus', price: 500, monthly: null, usually: 'Usually for Growth and Premium websites', description: 'Everything in Care, with more hands-on support for websites that do more.' },
];

// Ways we help businesses and churches that are just getting started.
export const helpingOffers = [
  { id: 'small', name: 'Small website (1–2 pages)', price: 300 as number | null, summary: 'Small website · 1–2 pages · from $300' },
  { id: 'new-business', name: 'Free first website for a new business', price: null as number | null, summary: 'Free first website · just starting out' },
  { id: 'church', name: 'Church website', price: null as number | null, summary: 'Church website · free first year' },
];

export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
