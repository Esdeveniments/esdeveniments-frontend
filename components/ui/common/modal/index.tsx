"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { ModalProps } from "types/props";
import Button from "@components/ui/common/button";
import { keepScrolledToTop } from "@utils/browser";

export default function Modal({
  open,
  setOpen,
  title,
  children,
  actionButton,
  onActionButtonClick,
  actionButtonDisabled = false,
  actionButtonAnalyticsAction,
  testId,
  initialFocusRef,
}: ModalProps) {
  const t = useTranslations("Components.Modal");
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  // Headless UI reads `.current` when it moves focus in, after the content
  // has mounted, so a target that didn't render falls back to the close button.
  const initialFocus = useMemo(
    () => ({
      get current() {
        return initialFocusRef?.current ?? cancelButtonRef.current;
      },
    }),
    [initialFocusRef],
  );
  // Headless UI focuses with `preventScroll`, so bring the target into view
  // here. Children's refs are attached before this one runs.
  const scrollContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      const target = initialFocusRef?.current;
      if (!node || !target) return;
      const stopScrolling = keepScrolledToTop(node, target);
      // Headless UI skips initial focus on touch devices (to keep the
      // keyboard down); the target isn't an input, so focus it for screen
      // readers unless something inside already has focus.
      const frame = requestAnimationFrame(() => {
        if (target.isConnected && !node.contains(document.activeElement)) {
          target.focus({ preventScroll: true });
        }
      });
      return () => {
        cancelAnimationFrame(frame);
        stopScrolling();
      };
    },
    [initialFocusRef],
  );

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="fixed inset-0 z-modal overflow-y-auto"
      initialFocus={initialFocus}
      data-testid={testId}
    >
      <DialogBackdrop
        transition
        className="w-full bg-foreground-strong/40 fixed inset-0 z-0 transition-opacity duration-normal ease-out-strong data-[closed]:opacity-0 data-[leave]:duration-fast"
        onClick={() => setOpen(false)}
        onTouchStart={(e) => {
          // Prevent event from bubbling to DialogPanel
          e.stopPropagation();
          setOpen(false);
        }}
      />
      <div className="w-full fixed inset-0 overflow-y-auto z-10 pointer-events-none">
        <div className="w-full min-h-screen flex items-start sm:items-center justify-center pt-0">
          <DialogPanel
            transition
            className="w-full sm:w-auto flex justify-center items-center relative z-10 pointer-events-auto transition-modal data-[closed]:opacity-0 data-[closed]:translate-y-4 sm:data-[closed]:translate-y-0 sm:data-[closed]:scale-95 data-[leave]:duration-fast"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="w-full h-[100dvh] max-h-[100dvh] sm:max-h-[90vh] sm:h-auto flex flex-col sm:w-[500px] bg-background rounded-none sm:rounded-card overflow-hidden shadow-xl relative">
              <div className="sticky top-0 bg-background px-4 z-10 flex-shrink-0">
                <div className="relative min-h-[56px] flex items-center py-2">
                  <DialogTitle
                    as="h2"
                    className="flex-1 text-center body-normal font-semibold text-foreground-strong px-10 break-words"
                  >
                    {title}
                  </DialogTitle>
                  <Button
                    ref={cancelButtonRef}
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="absolute right-0 p-2 rounded-full"
                    aria-label={t("close")}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div
                ref={scrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4"
              >
                {children}
              </div>
              {actionButton && (
                <div className="flex-shrink-0 w-full flex justify-center items-end pt-4 px-4 border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      if (onActionButtonClick) {
                        const result = await onActionButtonClick();
                        // Do not close modal if the action returns false,
                        // allowing the modal to display an error state.
                        if (result === false) {
                          return;
                        }
                      }
                      setOpen(false);
                    }}
                    data-testid={testId ? `${testId}-action-button` : undefined}
                    className="w-full"
                    disabled={actionButtonDisabled}
                    data-analytics-action={actionButtonAnalyticsAction}
                  >
                    {actionButton}
                  </Button>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
