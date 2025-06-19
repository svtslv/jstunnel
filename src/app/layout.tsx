import type { Metadata } from 'next';
import './globals.css';
import React from 'react';

export const metadata: Metadata = {
  title: 'JsTunnel - secure tunnels to localhost',
  description: `JsTunnel provides unique public URLs allowing you to easily share a web service on your local development machine with the world through a secure tls tunnel.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
