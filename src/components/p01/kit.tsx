/** P01 form controls, built from Launchpad's own styles (Team 2) so our pages match the common app. */
import type { ComponentProps } from "react";
import { focus, inputCls, primaryBtn, quietBtn } from "@/components/p02/ui";
import { cn } from "@/lib/utils";

export const labelCls = "mb-1.5 block text-sm font-semibold text-heading";
const locked = "disabled:cursor-not-allowed disabled:bg-muted disabled:text-foreground";

const VARIANT = {
  default: primaryBtn,
  outline: quietBtn,
  ghost: `inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground ${focus}`,
};

export function Button({
  variant = "default",
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof VARIANT; size?: "sm" }) {
  return (
    <button
      type={type}
      className={cn(VARIANT[variant], size === "sm" && "px-3 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

export const Input = ({ className, ...props }: ComponentProps<"input">) => (
  <input className={cn(inputCls, locked, className)} {...props} />
);

export const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <textarea className={cn(inputCls, locked, className)} {...props} />
);

export const Label = ({ className, ...props }: ComponentProps<"label">) => (
  <label className={cn(labelCls, className)} {...props} />
);
