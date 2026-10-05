"use client";

export type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  confirmation,
  onClose,
}: {
  confirmation: Confirmation | null;
  onClose: () => void;
}) {
  if (!confirmation) return null;

  return (
    <div
      className="overlay !fixed !inset-0 !z-[70] !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-[min(440px,calc(100vw-40px))] rounded-2xl border border-[#313943] bg-[#111419] shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <div className="border-b border-[#283039] px-6 py-5">
          <p className="eyebrow">CONFIRMAÇÃO</p>
          <h2 className="mt-1 text-xl font-bold" id="confirmation-title">
            {confirmation.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#aebbc4]">
            {confirmation.description}
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-5">
          <button className="secondary !px-3 !py-2 !text-xs" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md border border-[#B91C1C] bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#991B1B]"
            onClick={() => {
              confirmation.onConfirm();
              onClose();
            }}
          >
            {confirmation.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
