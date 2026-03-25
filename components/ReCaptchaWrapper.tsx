'use client';

import React from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function ReCaptchaWrapper({ children }: { children: React.ReactNode }) {
  const envKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Check if the provided key is valid and not a placeholder
  const isValidKey = !!(envKey && 
                     envKey.trim() !== '' && 
                     envKey !== 'YOUR_RECAPTCHA_SITE_KEY' &&
                     envKey !== 'undefined' &&
                     envKey !== 'null');

  // If no valid key is found, we don't render the provider to avoid the "Missing required parameters: sitekey" error.
  // We must handle the missing context in components that use useGoogleReCaptcha.
  if (!isValidKey) {
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={envKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
