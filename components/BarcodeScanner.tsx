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
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (e: any) {
          if (!e?.message?.includes("aborted") && !String(e).includes("aborted")) {
            console.error(e);
          }
        }
      }
      try {
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setIsStarted(false);
  };

  useEffect(() => {
    if (isStarted && !scannerRef.current) {
      // Small delay to ensure the DOM has rendered the #reader element
      const timer = setTimeout(() => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdgePercentage = 0.7;
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                return {
                  width: qrboxSize,
                  height: Math.floor(qrboxSize * 0.6)
                };
              }
            },
            (decodedText) => {
              if (html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                  onScan(decodedText);
                }).catch((e: any) => {
                  if (!e?.message?.includes("aborted") && !String(e).includes("aborted")) {
                    console.error(e);
                  }
                  onScan(decodedText);
                });
              } else {
                onScan(decodedText);
              }
            },
            (errorMessage) => {
              // parse errors are frequent, ignore them
            }
          ).then(() => {
            setHasCamera(true);
          }).catch((err: any) => {
            if (err?.message?.includes("aborted") || String(err).includes("aborted")) {
              return;
            }
            console.error("Error starting scanner", err);
            setHasCamera(false);
          });
        } catch (err) {
          console.error("Error initializing scanner", err);
          setHasCamera(false);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isStarted, onScan]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch((e: any) => {
            if (!e?.message?.includes("aborted") && !String(e).includes("aborted")) {
              console.error(e);
            }
          });
        }
        try {
          scannerRef.current.clear();
        } catch (e) {}
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
          onClick={stopScanner}
          className="px-6 py-2 bg-stone-200 dark:bg-stone-800 rounded-full text-sm font-bold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-[2rem] border-2 border-emerald-500/20 shadow-lg bg-black relative">
      <style dangerouslySetInnerHTML={{__html: `
        #reader {
          width: 100% !important;
          border: none !important;
        }
        #reader video {
          width: 100% !important;
          border-radius: 2rem;
        }
      `}} />
      {hasCamera === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}
      <div id="reader" className="w-full min-h-[300px]"></div>
    </div>
  );
}
