import React from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * BahiKhata button — warm cream / ember system.
 * States: idle, hover, active, focus-visible, disabled, isLoading, isSuccess.
 */
const VARIANTS = {
  primary:
    "bg-[#B4301C] text-[#FFFDF7] border border-[#B4301C] shadow-[0_2px_6px_rgba(180,48,28,0.28)] hover:brightness-95 hover:shadow-[0_3px_10px_rgba(180,48,28,0.30)]",
  secondary:
    "bg-white text-[#101014] border border-[#E7E1D6] hover:bg-[#F7F3EA] hover:shadow-[0_1px_3px_rgba(16,16,20,0.10)]",
  danger:
    "bg-[#FDF1EE] text-[#B4301C] border border-[#F3D9D4] hover:bg-[#FBE4DC]",
  success:
    "bg-[#F1F8F3] text-[#1F6B43] border border-[#CBE3D4] hover:brightness-[0.98]",
  quiet:
    "bg-transparent text-[#B4301C] border border-transparent hover:bg-[#FDF1EE]",
};

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  isLoading = false,
  isSuccess = false,
  icon: Icon,
  iconOnly = false,
  className,
  ...props
}) {
  const disabled = isLoading || isSuccess || props.disabled;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold text-[13px] whitespace-nowrap transition-[filter,background-color,box-shadow,transform] duration-150 " +
    "active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24231F] " +
    (iconOnly ? "h-[38px] w-[38px] rounded-xl p-0 " : "px-[18px] py-[11px] ") +
    "disabled:cursor-not-allowed disabled:bg-[#F1EDE5] disabled:text-[#A5A19A] disabled:border-[#E7E1D6] disabled:shadow-none disabled:brightness-100";

  const successSkin =
    variant === "primary"
      ? "!bg-[#1F6B43] !text-[#FFFDF7] !border-[#1F6B43] !opacity-100"
      : "!bg-[#F1F8F3] !text-[#1F6B43] !border-[#CBE3D4] !opacity-100";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={isLoading || undefined}
      className={cn(
        base,
        VARIANTS[variant],
        isLoading && "cursor-progress opacity-90",
        isSuccess && successSkin,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isSuccess ? (
        <Check size={16} />
      ) : (
        Icon && <Icon size={iconOnly ? 17 : 16} strokeWidth={2} />
      )}
      {!iconOnly && children}
    </button>
  );
}
