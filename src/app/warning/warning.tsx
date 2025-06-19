'use client';

import React from 'react';
import Link from 'next/link';

export const Warning = () => {
  const accept = () => {
    document.cookie = `x-tunnel-warning-accepted=true; path=/; max-age=${2 * 24 * 60 * 60}`;
    window.location.reload();
  };

  return (
    <div className="d-flex flex-column vh-100 bg-light">
      <main className="flex-grow-1 d-flex justify-content-center align-items-center">
        <div className="text-center p-4" style={{ maxWidth: '800px' }}>
          <h1 className="display-5 fw-bold mt-4">Tunnel Warning</h1>
          <p className="lead mt-3 fw-bold">
            This website is served for free via a{' '}
            <Link href="https://jstunnel.com" target="_blank" className="link-secondary">
              JsTunnel
            </Link>
          </p>
          <p className="lead text-secondary mt-3">
            Attackers may use this type of page to trick you into performing dangerous actions like installing software
            or revealing your personal information (e.g., passwords, phone numbers, or credit cards).
          </p>
          <p className="mb-0">
            <strong>Only continue if you trust the person who sent you this link.</strong>
          </p>
          <button className="btn btn-dark btn-lg mt-4 px-5" onClick={accept}>
            Visit Site
          </button>
        </div>
      </main>
    </div>
  );
};
