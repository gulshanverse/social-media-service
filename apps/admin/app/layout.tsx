import '@ggv/ui/src/styles.css';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
