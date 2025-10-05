"use client";

import { forwardRef, useEffect } from "react";
import { cn } from "@components/utils/cn";
import type { ModalProps } from "types/ui/primitives";

const ModalRoot = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, children, className }, ref) => {
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

      if (open) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className={cn(
            "bg-white relative max-h-[90vh] w-full max-w-md overflow-auto rounded-lg p-6 shadow-lg",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  },
);

ModalRoot.displayName = "ModalRoot";

const ModalHeader = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn("border-b border-bColor/50 p-component-md", className)}
    {...props}
  >
    {children}
  </div>
);

ModalHeader.displayName = "ModalHeader";

const ModalBody = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}) => (
  <div className={cn("p-component-md", className)} {...props}>
    {children}
  </div>
);

ModalBody.displayName = "ModalBody";

const ModalFooter = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn("border-t border-bColor/50 p-component-md", className)}
    {...props}
  >
    {children}
  </div>
);

ModalFooter.displayName = "ModalFooter";

const Modal = ModalRoot as typeof ModalRoot & {
  Root: typeof ModalRoot;
  Header: typeof ModalHeader;
  Body: typeof ModalBody;
  Footer: typeof ModalFooter;
};

Modal.Root = ModalRoot;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export { Modal };
