export const packages = [
  { id: 'starter', name: 'Starter', price: 525, caption: 'A proper first impression.', description: 'For a business ready for a beautiful, useful place on the web.', timeline: '5–7 days', features: ['Custom 5-page website', 'Mobile-ready design', 'Contact form + Google Maps', 'Basic SEO setup', 'SSL security', 'Revisions included'], tone: 'sage' },
  { id: 'growth', name: 'Growth', price: 775, caption: 'Room for your next chapter.', description: 'For restaurants, salons, and services ready to do more online.', timeline: '10 days', features: ['Everything in Starter', 'Up to 8 pages', 'Online ordering (Square / Toast)', 'Update your menu from your phone', 'Instagram feed', 'English + Spanish option'], tone: 'blue' },
  { id: 'premium', name: 'Premium', price: 1299, caption: 'The whole picture.', description: 'For an established business ready for a fuller digital experience.', timeline: '14 days', features: ['Everything in Growth', 'Up to 12 pages', 'Interactive features + loyalty cards', 'Your own admin panel', 'Blog section', 'Advanced SEO + analytics'], tone: 'peach' },
];
export const bases = [
  { id: 'landing', name: 'Landing page', price: 249, detail: 'One focused page' },
  { id: 'small', name: 'Small site', price: 395, detail: '3 essential pages' },
  { id: 'standard', name: 'Standard site', price: 525, detail: '5 pages to make your own' },
  { id: 'full', name: 'Full site', price: 775, detail: '8 pages, more possibility' },
];
export const extras = [
  { id: 'ordering', name: 'Online ordering', price: 150, detail: 'Square / Toast integration' },
  { id: 'google', name: 'Google Business Profile', price: 50, detail: 'Help your neighbors find you' },
  { id: 'photos', name: 'Photography session', price: 200, detail: 'Show the real you' },
  { id: 'qr', name: 'QR code menu', price: 49, detail: 'Your menu, a scan away' },
  { id: 'instagram', name: 'Instagram feed', price: 50, detail: 'Keep your website connected' },
  { id: 'blog', name: 'Blog section', price: 100, detail: 'A place for your stories' },
  { id: 'bilingual', name: 'English + Spanish', price: 100, detail: 'Make more people feel at home' },
  { id: 'brand', name: 'Logo & brand kit', price: 50, detail: 'A little more you, everywhere' },
  { id: 'email', name: 'Email marketing setup', price: 175, detail: 'Stay in touch with your people' },
  { id: 'social', name: 'Social media kit', price: 150, detail: 'A consistent first impression' },
];
export const bundles = [
  { id: 'get-online', name: 'Get Online', price: 575, detail: 'Starter website + Google Business Profile + QR menu', saving: 49 },
  { id: 'storefront', name: 'Digital Storefront', price: 999, detail: 'Growth website + Google Business Profile + photography + QR menu', saving: 75 },
  { id: 'presence', name: 'Full Digital Presence', price: 1799, detail: 'Premium website + Google Business Profile + social kit + photos + logo + email', saving: 125 },
];
export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
