"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClassName?: string;
}

export default function Modal({ open, onClose, title, children, widthClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative z-10 w-full ${widthClassName ?? "max-w-2xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl border bg-white shadow-xl dark:border-white/10 dark:bg-neutral-900 text-gray-900 dark:text-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
            <div className="text-lg font-semibold">
              {title}
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
            >
              ✕
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}


