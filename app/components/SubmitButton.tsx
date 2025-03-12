'use client';

import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  formAction?: any;
  className: string;
  children: React.ReactNode;
}

export function SubmitButton({ formAction, className, children }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  
  return (
    <button 
      formAction={formAction}
      disabled={pending}
      className={`${className} relative transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      <span className={pending ? 'opacity-0' : 'opacity-100'}>{children}</span>
      {pending && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </button>
  );
} 