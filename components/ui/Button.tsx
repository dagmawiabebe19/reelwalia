import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps {
  href?: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "rw-btn-primary",
  secondary: "rw-btn-secondary",
};

export function Button({
  href,
  variant = "primary",
  className = "",
  children,
  type = "button",
  disabled,
  onClick,
}: ButtonProps) {
  const classes = `${variantClass[variant]} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
