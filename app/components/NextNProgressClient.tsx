'use client';

import ProgressBar from '@badrap/bar-of-progress';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const progress = new ProgressBar({
  size: 3,
  color: '#10B981',
  className: 'bar-of-progress',
  delay: 100,
});

export default function NextNProgressClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleStart = () => {
      progress.start();
    };
    
    const handleStop = () => {
      progress.finish();
    };

    handleStart();
    const timer = setTimeout(handleStop, 500);

    return () => {
      clearTimeout(timer);
      progress.finish();
    };
  }, [pathname, searchParams]);

  return null;
} 