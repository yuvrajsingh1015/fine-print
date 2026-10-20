import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}

/** Thin wrapper around <dialog>, which already handles focus and Escape. */
export default function Dialog({ open, title, onClose, children, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-line bg-bg p-0 text-body shadow-2xl"
    >
      <div className="p-6">
        <h2 id="dialog-title" className="text-lg font-semibold text-fg">
          {title}
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div>
      </div>
    </dialog>
  );
}
