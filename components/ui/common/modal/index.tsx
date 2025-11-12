"use client";

import { Fragment, useRef } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import ArrowLeftIcon from "@heroicons/react/outline/ArrowLeftIcon";
import { ModalProps } from "types/props";

export default function Modal({
  open,
  setOpen,
  title,
  children,
  actionButton,
  onActionButtonClick,
}: ModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="fixed inset-0 z-modal overflow-y-auto"
      initialFocus={cancelButtonRef}
    >
      <div
        className="w-full bg-border opacity-60 fixed inset-0 z-0"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <div className="w-full fixed inset-0 overflow-y-auto z-10">
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
              <DialogPanel className="w-full flex justify-center items-center relative z-10">
                <div className="w-full h-screen sm:h-auto flex flex-col sm:w-[500px] bg-background rounded-none sm:rounded-lg shadow-xl relative">
                  <div className="sticky top-0 bg-background px-4 z-10">
                    <div className="relative min-h-12 flex items-center py-2">
                      <button
                        ref={cancelButtonRef}
                        onClick={() => setOpen(false)}
                        className="absolute left-2 p-3 focus:outline-none z-20"
                        aria-label="Tanca"
                      >
                        <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <DialogTitle
                        as="h3"
                        className="flex-1 text-center font-barlow uppercase italic font-semibold px-10 break-words"
                      >
                        {title}
                      </DialogTitle>
                    </div>
                  </div>
                  <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto overscroll-contain px-4"
                  >
                    {children}
                  </div>
                  {actionButton && (
                    <div className="flex-shrink-0 w-full flex justify-center items-end pt-4 px-4 border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                      <button
                        onClick={() => {
                          if (onActionButtonClick) {
                            onActionButtonClick();
                          }
                          setOpen(false);
                        }}
                        className="flex justify-center items-center gap-2 text-foreground-strong bg-background rounded-xl py-2 px-3 ease-in-out duration-300 border border-foreground-strong font-barlow uppercase font-semibold tracking-wide focus:outline-none hover:bg-primary hover:border-background hover:text-background"
                      >
                        {actionButton}
                      </button>
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
