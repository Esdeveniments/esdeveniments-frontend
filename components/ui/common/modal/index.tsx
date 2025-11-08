"use client";

import { Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
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

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="fixed inset-0 z-50 overflow-y-auto"
      initialFocus={cancelButtonRef}
    >
      <div
        className="w-full bg-border opacity-60 fixed inset-0"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <div className="w-full fixed inset-0 overflow-y-auto">
        <div className="w-full min-h-screen flex items-center justify-center py-4 md:py-8">
          <Transition.Root show={open} as={Fragment}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-70"
              leave="ease-in duration-200"
              leaveFrom="opacity-70"
              leaveTo="opacity-0"
            >
              <Dialog.Panel className="w-full flex justify-center items-center max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-4rem)]">
                <div className="w-full flex flex-col sm:w-[500px] bg-background rounded-lg shadow-xl relative max-h-full flex-shrink-0">
                  <div className="flex-shrink-0 relative pt-12 px-4">
                    <button
                      ref={cancelButtonRef}
                      onClick={() => setOpen(false)}
                      className="absolute top-0 left-2 p-3 focus:outline-none z-10"
                    >
                      <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <Dialog.Title
                      as="h3"
                      className="absolute top-0 left-0 right-0 p-3 text-center font-barlow uppercase italic font-semibold"
                    >
                      {title}
                    </Dialog.Title>
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain px-4">
                    {children}
                  </div>
                  {actionButton && (
                    <div className="flex-shrink-0 w-full flex justify-center items-end pt-4 pb-4 px-4 border-t border-border bg-background">
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
              </Dialog.Panel>
            </Transition.Child>
          </Transition.Root>
        </div>
      </div>
    </Dialog>
  );
}
