'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, Camera as CameraIcon } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = () => {
    setIsStarted(true);
    setHasCamera(null);
    
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 150 }
      },
      (decodedText) => {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            onScan(decodedText);
          }).catch(console.error);
        }
      },
      (errorMessage) => {
        // parse errors are frequent, ignore them
      }
    ).then(() => {
      setHasCamera(true);
    }).catch(err => {
      console.error("Error starting scanner", err);
      setHasCamera(false);
    });
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  if (!isStarted) {
    return (
      <div className="w-full max-w-md mx-auto p-8 text-center bg-stone-50 dark:bg-stone-900/50 rounded-[2rem] border-2 border-stone-200 dark:border-stone-800 border-dashed flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
          <CameraIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="mb-6 text-stone-600 dark:text-stone-400">Click below to activate your camera and scan a barcode.</p>
        <button 
          onClick={startScanner}
          className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-emerald-700 transition-all hover:-translate-y-1"
        >
          Start Camera
        </button>
      </div>
    );
  }

  if (hasCamera === false) {
    return (
      <div className="p-6 text-center text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900/50 rounded-[2rem] border-2 border-stone-200 dark:border-stone-800 border-dashed min-h-[300px] flex flex-col items-center justify-center">
        <p className="mb-4 font-bold text-red-500 text-lg">Camera access denied</p>
        <p className="text-sm mb-6 max-w-xs mx-auto">Your browser blocked camera access. Please ensure you have granted camera permissions to this site.</p>
        <button 
          onClick={() => setIsStarted(false)}
          className="px-6 py-2 bg-stone-200 dark:bg-stone-800 rounded-full text-sm font-bold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-[2rem] border-2 border-emerald-500/20 shadow-lg bg-black relative">
      {hasCamera === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}
      <div id="reader" className="w-full min-h-[300px]"></div>
    </div>
  );
}
