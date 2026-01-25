import { useState, useEffect } from 'react';

interface ConfirmationFlashProps {
  message: string;
  type?: 'success' | 'error';
  duration?: number;
  onComplete?: () => void;
}

export function ConfirmationFlash({ 
  message, 
  type = 'success',
  duration = 1000,
  onComplete 
}: ConfirmationFlashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className={`text-center py-4 font-mono text-lg ${type === 'success' ? 'flash-saved' : 'flash-error'}`}>
      {message}
    </div>
  );
}
