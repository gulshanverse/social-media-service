import { Analytics } from '@vercel/analytics/next';
import '@ggv/ui/src/styles.css';
import './globals.css';
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
