type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-pink-500 hover:bg-pink-400 text-white shadow-lg shadow-pink-500/30',
  secondary: 'bg-white/95 hover:bg-white text-pink-600',
  ghost: 'bg-transparent hover:bg-white/10 text-white',
};

export function createButton({ label, variant = 'primary', onClick, className = '' }: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.className = `px-6 py-3 rounded-full font-semibold text-lg transition active:scale-95 ${VARIANT_CLASSES[variant]} ${className}`;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
