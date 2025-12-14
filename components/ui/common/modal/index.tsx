"use client";

import { Fragment, useRef } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import { ArrowLeftIcon } from "@heroicons/react/outline";
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
  testId,
}: ModalProps) {
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
        className="w-full bg-border opacity-60 fixed inset-0 z-0"
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
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-70"
              leave="ease-in duration-200"
              leaveFrom="opacity-70"
              leaveTo="opacity-0"
            >
              <DialogPanel
                className="flex justify-center items-center relative z-10 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="w-full h-[100dvh] max-h-[100dvh] sm:max-h-[90vh] sm:h-auto flex flex-col sm:w-[500px] bg-background rounded-none sm:rounded-lg shadow-xl relative">
                  <div className="sticky top-0 bg-background px-4 z-10 flex-shrink-0">
                    <div className="relative min-h-12 flex items-center py-2">
                      <Button
                        ref={cancelButtonRef}
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="absolute left-2 p-3 z-20 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        aria-label="Tanca"
                      >
                        <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                      </Button>
                      <DialogTitle
                        as="h3"
                        className="flex-1 text-center font-barlow uppercase font-semibold px-10 break-words"
                      >
                        {title}
                      </DialogTitle>
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
                        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={actionButtonDisabled}
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
