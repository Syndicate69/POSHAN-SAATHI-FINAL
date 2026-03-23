'use client';

import React from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function ReCaptchaWrapper({ children }: { children: React.ReactNode }) {
  // Google's official test key for reCAPTCHA v3 (always passes)
  const G_TEST_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
  
  const envKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Check if the provided key is valid and not a placeholder
  const isValidKey = envKey && 
                     envKey.trim() !== '' && 
                     envKey !== 'YOUR_RECAPTCHA_SITE_KEY' &&
                     envKey !== 'undefined' &&
                     envKey !== 'null';

  const siteKey = isValidKey ? envKey : G_TEST_KEY;

  if (!isValidKey && process.env.NODE_ENV === 'development') {
    console.warn('reCAPTCHA site key is not set or invalid. Using Google test key.');
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
