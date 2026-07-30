import './globals.css';

export const metadata = { title: 'CRE DBMS', description: 'Commercial real estate database management system' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
