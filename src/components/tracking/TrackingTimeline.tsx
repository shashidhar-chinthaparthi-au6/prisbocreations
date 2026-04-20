"use client";

import { format } from "date-fns";
import { FLOW_STAGES, STAGES, type TrackingStage, flowStageIndex } from "@/lib/trackingStatus";
import type { TrackEventRow } from "@/types/track-payload";
import { TrackingStepDot } from "@/components/tracking/TrackingStepDot";
import { TrackingSubEvents } from "@/components/tracking/TrackingSubEvents";
import { RTONotice } from "@/components/tracking/RTONotice";

const GRAY = "#D3D1C7";
const INK = "#1A1A1A";
const MUTED = "#6B6560";
const AMBER = "#C47A2B";

function stageMeta(stage: TrackingStage) {
  return STAGES.find((s) => s.stage === stage);
}

function formatWhen(iso: string | undefined, future: boolean) {
  if (future || !iso) return "—";
  try {
    return format(new Date(iso), "d MMM · h:mm a");
  } catch {
    return "—";
  }
}

/** Latest event ISO per flow stage (for labels). */
function latestEventIsoForStage(events: TrackEventRow[], stage: TrackingStage): string | undefined {
  const inStage = events.filter((e) => e.stage === stage);
  if (!inStage.length) return undefined;
  return inStage.reduce((a, b) => (new Date(a.eventAt) > new Date(b.eventAt) ? a : b)).eventAt;
}

export function TrackingTimeline({
  currentStage,
  events,
  estimatedDelivery,
}: {
  currentStage: TrackingStage;
  events: TrackEventRow[];
  estimatedDelivery: string | null;
}) {
  if (currentStage === "CANCELLED") {
    return (
      <div>
        <p className="text-sm font-medium text-[#991B1B]">This order was cancelled.</p>
        <RTONotice variant="cancelled" />
      </div>
    );
  }

  if (currentStage === "RTO") {
    const flowDone = FLOW_STAGES.filter((s) => flowStageIndex(s) <= flowStageIndex("SHIPPED"));
    const rtoRows = [...events].filter((e) => e.stage === "RTO").sort(
      (a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
    );
    return (
      <div>
        <ol className="relative m-0 list-none p-0">
          {flowDone.map((stage, i) => {
            const meta = stageMeta(stage);
            const when = latestEventIsoForStage(events, stage);
            const last = i === flowDone.length - 1;
            return (
              <li key={stage} className="relative pb-8 pl-8 last:pb-0">
                {!last ? (
                  <div
                    className="absolute bottom-0 left-[6px] top-[14px] w-0.5 -translate-x-1/2"
                    style={{ backgroundColor: AMBER }}
                    aria-hidden
                  />
                ) : null}
                <div className="absolute left-0 top-0">
                  <TrackingStepDot state="done" />
                </div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: INK }}>
                      {meta?.label ?? stage}
                    </p>
                    <p className="text-[13px]" style={{ color: MUTED }}>
                      {meta?.description}
                      {latestEventIsoForStage(events, stage) ? (
                        <>
                          {" "}
                          ·{" "}
                          {events.find((e) => e.stage === stage && e.location)?.location ?? ""}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-xs" style={{ color: MUTED }}>
                    {formatWhen(when, false)}
                  </p>
                </div>
              </li>
            );
          })}
          <li className="relative pb-8 pl-8 last:pb-0">
            <div
              className="absolute bottom-0 left-[6px] top-[14px] w-0.5 -translate-x-1/2"
              style={{ borderLeft: `2px dashed ${GRAY}`, background: "transparent" }}
              aria-hidden
            />
            <div className="absolute left-0 top-0">
              <TrackingStepDot state="error" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#991B1B]">Delivery failed</p>
                <p className="text-[13px]" style={{ color: MUTED }}>
                  Unable to deliver — returning to sender
                </p>
              </div>
            </div>
          </li>
          {rtoRows.map((row, i) => {
            const last = i === rtoRows.length - 1;
            return (
              <li key={`${row.eventAt}-${row.status}`} className="relative pb-8 pl-8 last:pb-0">
                {!last ? (
                  <div
                    className="absolute bottom-0 left-[6px] top-[14px] w-0.5 -translate-x-1/2"
                    style={{ backgroundColor: AMBER }}
                    aria-hidden
                  />
                ) : null}
                <div className="absolute left-0 top-0">
                  <TrackingStepDot state="done" />
                </div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: INK }}>
                      {row.description?.trim() || row.status}
                    </p>
                    {row.location ? (
                      <p className="text-[13px]" style={{ color: MUTED }}>
                        {row.location}
                      </p>
                    ) : null}
                  </div>
                  <p className="whitespace-nowrap text-xs" style={{ color: MUTED }}>
                    {formatWhen(row.eventAt, false)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <RTONotice variant="rto" />
      </div>
    );
  }

  const curIdx = flowStageIndex(currentStage);
  const effectiveIdx = curIdx >= 0 ? curIdx : 0;

  return (
    <ol className="relative m-0 list-none p-0">
      {FLOW_STAGES.map((stage, i) => {
        const meta = stageMeta(stage);
        const done = i < effectiveIdx;
        const current = i === effectiveIdx;
        const future = i > effectiveIdx;
        const dotState = future ? "future" : current ? "current" : "done";
        const whenIso = latestEventIsoForStage(events, stage);
        const subRows = events.filter((e) => e.stage === stage).sort(
          (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime(),
        );
        const last = i === FLOW_STAGES.length - 1;
        const segmentSolid = i < effectiveIdx;
        return (
          <li key={stage} className="relative pb-8 pl-8 last:pb-0">
            {!last ? (
              <div
                className="absolute bottom-0 left-[6px] top-[14px] w-0.5 -translate-x-1/2"
                style={
                  segmentSolid
                    ? { backgroundColor: AMBER }
                    : { borderLeft: `2px dashed ${GRAY}`, background: "transparent" }
                }
                aria-hidden
              />
            ) : null}
            <div className="absolute left-0 top-0">
              <TrackingStepDot state={dotState} />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${future ? "text-[#9C9890]" : current ? "" : ""}`}
                  style={{ color: current ? AMBER : future ? undefined : INK }}
                >
                  {meta?.label ?? stage}
                </p>
                <p className="text-[13px]" style={{ color: MUTED }}>
                  {current
                    ? subRows[0]?.location?.trim() ||
                      subRows[0]?.description?.trim() ||
                      meta?.description
                    : future
                      ? meta?.description
                      : meta?.description}
                </p>
                {current ? <TrackingSubEvents rows={subRows} /> : null}
                {last && future && estimatedDelivery ? (
                  <p className="mt-1 text-xs" style={{ color: MUTED }}>
                    Estimated {estimatedDelivery}
                  </p>
                ) : null}
              </div>
              <p className="whitespace-nowrap text-xs" style={{ color: MUTED }}>
                {formatWhen(whenIso, future)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
