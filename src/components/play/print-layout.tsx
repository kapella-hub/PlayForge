"use client";

interface PlayPrintData {
  name: string;
  formation: string;
  canvasData: string;
  notes?: string;
}

interface PrintLayoutProps {
  plays: PlayPrintData[];
  mode: "playbook" | "wristband";
}

/**
 * Print-friendly layout for playbooks and wristband cards.
 *
 * - **Playbook mode**: one play per page with full diagram, name, notes, and assignments.
 * - **Wristband mode**: compact 4-column x 4-row grid of mini play diagrams with names,
 *   sized to fit a standard wristband card.
 *
 * Wrap this component and trigger `window.print()` to print. The `@media print`
 * styles hide everything outside `.print-area` automatically.
 */
export function PrintLayout({ plays, mode }: PrintLayoutProps) {
  if (mode === "wristband") {
    return <WristbandLayout plays={plays} />;
  }
  return <PlaybookLayout plays={plays} />;
}

// ── Wristband ──────────────────────────────────────────────────────

function WristbandLayout({ plays }: { plays: PlayPrintData[] }) {
  // Chunk into pages of 16 (4x4)
  const pages: PlayPrintData[][] = [];
  for (let i = 0; i < plays.length; i += 16) {
    pages.push(plays.slice(i, i + 16));
  }

  return (
    <div className="print-area">
      {/* Screen-only info */}
      <p className="mb-4 text-xs text-zinc-500 print:hidden">
        Wristband layout -- {plays.length} play(s) across {pages.length} card(s).
        Press Ctrl+P to print.
      </p>

      {pages.map((page, pi) => (
        <div
          key={pi}
          className="mb-8 break-after-page border border-zinc-700 bg-white print:mb-0 print:border-none"
        >
          <div className="grid grid-cols-4 grid-rows-4">
            {Array.from({ length: 16 }).map((_, ci) => {
              const play = page[ci];
              return (
                <div
                  key={ci}
                  className="flex h-[1.8in] w-[2.2in] flex-col items-center justify-center border border-zinc-300 p-1 print:border-gray-400"
                >
                  {play ? (
                    <>
                      {play.canvasData ? (
                        <img
                          src={play.canvasData}
                          alt={play.name}
                          className="mb-0.5 h-[1.2in] w-auto object-contain"
                        />
                      ) : (
                        <div className="mb-0.5 flex h-[1.2in] w-full items-center justify-center bg-gray-100 text-[9px] text-gray-400">
                          No diagram
                        </div>
                      )}
                      <span className="text-center text-[9px] font-bold leading-tight text-black">
                        {play.name}
                      </span>
                      {play.formation && (
                        <span className="text-center text-[7px] text-gray-500">
                          {play.formation}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[8px] text-gray-300">--</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <style>{printStyles}</style>
    </div>
  );
}

// ── Playbook ───────────────────────────────────────────────────────

function PlaybookLayout({ plays }: { plays: PlayPrintData[] }) {
  return (
    <div className="print-area">
      <p className="mb-4 text-xs text-zinc-500 print:hidden">
        Playbook layout -- {plays.length} play(s), one per page. Press Ctrl+P to
        print.
      </p>

      {plays.map((play, i) => (
        <div
          key={i}
          className="mb-8 flex min-h-[9in] break-after-page flex-col border border-zinc-700 bg-white p-6 print:mb-0 print:border-none print:p-8"
        >
          {/* Title bar */}
          <div className="mb-4 border-b-2 border-black pb-2">
            <h1 className="text-xl font-bold text-black">{play.name}</h1>
            <p className="mt-0.5 text-sm text-gray-600">{play.formation}</p>
          </div>

          {/* Diagram */}
          <div className="flex flex-1 items-center justify-center">
            {play.canvasData ? (
              <img
                src={play.canvasData}
                alt={play.name}
                className="max-h-[5in] w-auto object-contain"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
                No diagram available
              </div>
            )}
          </div>

          {/* Notes / Assignments */}
          {play.notes && (
            <div className="mt-4 border-t border-gray-300 pt-3">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notes &amp; Assignments
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-black">
                {play.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-4 text-right text-[9px] text-gray-400">
            Play {i + 1} of {plays.length}
          </div>
        </div>
      ))}

      <style>{printStyles}</style>
    </div>
  );
}

// ── Shared print CSS ───────────────────────────────────────────────

const printStyles = `
@media print {
  /* Hide everything outside print area */
  body > *:not(.print-area),
  header, nav, footer, aside,
  [data-print-hide] {
    display: none !important;
  }

  .print-area {
    position: absolute;
    inset: 0;
  }

  @page {
    margin: 0.25in;
  }

  .break-after-page {
    page-break-after: always;
  }
}
`;
