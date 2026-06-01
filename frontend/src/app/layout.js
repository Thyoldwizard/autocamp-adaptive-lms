import "./globals.css";

const OG_IMAGE =
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80';

export const metadata = {
  title: {
    default: 'pace — Adaptive LMS',
    template: '%s | pace',
  },
  description:
    'An adaptive LMS for cohort-based education — connecting student progress, instructor visibility, and timely support into one confident workspace.',
  keywords: ['adaptive learning', 'LMS', 'bootcamp', 'cohort', 'data analytics', 'AI'],
  openGraph: {
    type: 'website',
    siteName: 'pace',
    title: 'pace — Adaptive LMS',
    description:
      'An adaptive LMS for cohort-based education — connecting student progress, instructor visibility, and timely support.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'pace Adaptive LMS' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pace — Adaptive LMS',
    description:
      'An adaptive LMS for cohort-based education — connecting student progress, instructor visibility, and timely support.',
    images: [OG_IMAGE],
  },
};

export const viewport = {
  themeColor: '#2D6A4F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
