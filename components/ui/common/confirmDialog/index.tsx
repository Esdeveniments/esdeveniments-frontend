"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import type { ConfirmDialogProps } from "types/props";

/** Compact alert dialog for confirming a destructive action. */
export default function ConfirmDialog({
  open,
  setOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  busy = false,
  testId,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = async () => {
    const result = await onConfirm();
    if (result !== false) setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      initialFocus={cancelRef}
      role="alertdialog"
      className="relative z-modal"
      data-testid={testId}
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-foreground-strong/40 transition-opacity duration-normal ease-smooth data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-sm card-elevated card-body stack transition-[opacity,transform] duration-normal ease-smooth data-[closed]:opacity-0 data-[closed]:scale-95"
        >
          <DialogTitle as="h2" className="heading-4 text-foreground-strong">
            {title}
          </DialogTitle>
          {description && (
            <Description className="body-small text-foreground/80">
              {description}
            </Description>
          )}
          {/* Stacked on mobile (action on top), side by side from sm with the action on the right. */}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={handleConfirm}
              disabled={busy}
              data-testid={testId ? `${testId}-action-button` : undefined}
            >
              {confirmLabel}
            </button>
            <button
              ref={cancelRef}
              type="button"
              className="btn-ghost w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              {cancelLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
