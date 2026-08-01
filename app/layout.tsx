import './globals.css';

export const metadata = { title: 'Vantage CRE', description: 'Commercial real estate database management system' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
