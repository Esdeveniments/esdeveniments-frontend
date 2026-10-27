"use client";

import { Fragment, useRef } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { ModalProps } from "types/props";
import Button from "@components/ui/common/button";

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
}: ModalProps) {
  const t = useTranslations("Components.Modal");
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="fixed inset-0 z-modal overflow-y-auto"
      initialFocus={cancelButtonRef}
      data-testid={testId}
    >
      <div
        className="w-full bg-foreground-strong/40 fixed inset-0 z-0"
        aria-hidden="true"
        onClick={() => setOpen(false)}
        onTouchStart={(e) => {
          // Prevent event from bubbling to DialogPanel
          e.stopPropagation();
          setOpen(false);
        }}
      />
      <div className="w-full fixed inset-0 overflow-y-auto z-10 pointer-events-none">
        <div className="w-full min-h-screen flex items-start sm:items-center justify-center pt-0">
          <Transition show={open} as={Fragment}>
            <Transition.Child
              as={Fragment}
              enter="transition-modal"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0"
              enterTo="opacity-100 translate-y-0"
              leave="transition-modal"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0"
            >
              <DialogPanel
                className="w-full sm:w-auto flex justify-center items-center relative z-10 pointer-events-auto"
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
                        className="absolute right-0 p-2.5 rounded-full"
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
            </Transition.Child>
          </Transition>
        </div>
      </div>
    </Dialog>
  );
}
