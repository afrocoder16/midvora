import { liveProjects } from './projects';
import { packages } from './services';

// One source of truth for the facts search engines read about Midvora.
export const SITE_URL = 'https://midvora.com';
export const abs = (path: string) => new URL(path, SITE_URL).toString();

export const BUSINESS_ID = `${SITE_URL}/#business`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const states = ['Minnesota', 'South Dakota', 'North Dakota'].map(name => ({ '@type': 'State', name }));

export const businessSchema = {
  '@type': 'ProfessionalService',
  '@id': BUSINESS_ID,
  name: 'Midvora',
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', '@id': `${SITE_URL}/#logo`, url: abs('/img/new logo.png'), width: 600, height: 600 },
  image: abs('/img/og-image.png'),
  description: 'Midvora is an independent web design studio in Marshall, Minnesota. We build fast, custom websites for local businesses across Minnesota, South Dakota, and North Dakota.',
  slogan: 'Your business, in a whole new light.',
  telephone: '+1-507-530-4837',
  email: 'info@midvora.com',
  address: { '@type': 'PostalAddress', streetAddress: '107 E Main', addressLocality: 'Marshall', addressRegion: 'MN', postalCode: '56258', addressCountry: 'US' },
  areaServed: states,
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: '+1-507-530-4837', email: 'info@midvora.com', areaServed: 'US', availableLanguage: 'English' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '18:00' }],
  priceRange: '$300-$1,299',
  sameAs: ['https://www.facebook.com/p/Midvora-61591870345093/', 'https://www.instagram.com/midvora_tech/'],
  knowsAbout: ['Web design', 'Small business websites', 'Local business websites', 'Website hosting and maintenance'],
};

export const websiteSchema = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: 'Midvora',
  inLanguage: 'en-US',
  publisher: { '@id': BUSINESS_ID },
};

export const breadcrumbSchema = (pageUrl: string, crumbs: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  '@id': `${pageUrl}#breadcrumb`,
  itemListElement: crumbs.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: abs(path) })),
});

export const faqSchema = (pagePath: string, questions: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  '@id': `${abs(pagePath)}#faq`,
  mainEntity: questions.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
});

// Prices here must always match what the Services page shows.
export const servicesSchema = () => ({
  '@type': 'Service',
  '@id': `${abs('/services/')}#service`,
  name: 'Custom website design for local businesses',
  serviceType: 'Web design',
  description: 'Custom, mobile-ready websites for local businesses, with hosting, security, and weekly maintenance included.',
  url: abs('/services/'),
  provider: { '@id': BUSINESS_ID },
  areaServed: states,
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Website packages',
    itemListElement: [
      { name: 'Small website (1–2 pages)', price: 300, description: 'A small one or two page website for businesses just getting started.' },
      ...packages.map(pkg => ({ name: `${pkg.name} website`, price: pkg.price, description: `${pkg.description} First-year price.` })),
    ].map(offer => ({ '@type': 'Offer', name: offer.name, description: offer.description, price: String(offer.price), priceCurrency: 'USD', url: abs('/services/#svc-packages') })),
  },
});

export const workSchema = () => ({
  '@type': 'ItemList',
  '@id': `${abs('/work/')}#clients`,
  name: 'Live client websites designed by Midvora',
  itemListElement: liveProjects.map((project, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: { '@type': 'WebSite', name: project.title, url: project.url, description: project.description, creator: { '@id': BUSINESS_ID } },
  })),
});
