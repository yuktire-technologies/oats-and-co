import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Button({ className, variant = "primary", size = "md", children, ...props }) {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-sans font-bold transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const variants = {
    primary: "bg-forest text-white hover:bg-green",
    orange: "bg-orange text-white hover:bg-orange/90", // specifically for checkout/order CTAs
    outline: "border border-forest text-forest hover:bg-forest/5",
    ghost: "text-forest hover:bg-forest/10",
  };
  
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
