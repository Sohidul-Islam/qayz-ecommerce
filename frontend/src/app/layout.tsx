import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { DesignProvider } from '@/context/DesignContext';
import { AnalyticsProvider } from '@/context/AnalyticsContext';
import { CartProvider } from '@/context/CartContext';
import { DesignSwitcherBar } from '@/components/layout/DesignSwitcherBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'QAYZ | Luxury South Asian Punjabi & Handloom Atelier',
    template: '%s | QAYZ Atelier',
  },
  description:
    'Discover QAYZ — modern luxury South Asian Panjabi crafted from mulberry silk, Dhaka Jamdani, Chikankari muslin, and Belgian linen. Express Bangladesh delivery & Cash on Delivery.',
  keywords: ['Punjabi', 'Panjabi', 'Luxury Panjabi Bangladesh', 'Jamdani Panjabi', 'Silk Panjabi', 'QAYZ'],
  openGraph: {
    title: 'QAYZ | Luxury South Asian Punjabi Atelier',
    description: 'Handwoven Jamdani, raw mulberry silk, and minimalist linen Panjabi crafted in Dhaka.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <DesignProvider>
          <AnalyticsProvider>
            <CartProvider>
              <DesignSwitcherBar />
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <CartDrawer />
            </CartProvider>
          </AnalyticsProvider>
        </DesignProvider>
      </body>
    </html>
  );
}

