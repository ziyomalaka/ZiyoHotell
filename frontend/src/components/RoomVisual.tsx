import { StatusBadge } from "./StatusBadge";
import { genderLabel, occupancyLabel } from "@/lib/format";

export function BedIndicator({
  beds,
}: {
  beds: { occupancy?: unknown; occupied?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {beds.map((bed, i) => {
        const on = Boolean(bed.occupancy || bed.occupied);
        return (
          <span
            key={i}
            className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-navy" : "bg-transparent shadow-[inset_0_0_0_1.5px_#9aa7b8]"}`}
          />
        );
      })}
    </div>
  );
}

export function RoomCard({
  number,
  floor,
  gender,
  capacity,
  occupied,
  free,
  kind,
  status,
  beds,
  onClick,
  children,
}: {
  number: string;
  floor?: number | null;
  gender?: string | null;
  capacity: number;
  occupied: number;
  free: number;
  kind: string;
  status?: string;
  beds?: { occupancy?: unknown }[];
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const occupancy = status && status !== "ACTIVE" ? "inactive" : kind;
  const dots = beds?.length
    ? beds
    : Array.from({ length: capacity }, (_, i) => ({ occupancy: i < occupied }));
  const cls = "room-card w-full text-left";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tracking-wide text-navy">{number}</p>
          <p className="mt-0.5 text-xs text-muted">
            {floor ? `${floor}-qavat` : null}
            {floor && gender ? " · " : null}
            {gender ? genderLabel(gender) : null}
          </p>
        </div>
        <StatusBadge value={occupancy} label={occupancyLabel(occupancy)} />
      </div>
      <div className="mt-4">
        <BedIndicator beds={dots} />
        <p className="mt-3 text-sm text-muted">
          <span className="font-medium text-navy">{occupied} BAND</span>
          {" / "}
          {free} BO‘SH
        </p>
      </div>
      {children}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <article className={cls}>{body}</article>;
}

export function BedCard({
  number,
  occupied,
  guest,
  onClick,
}: {
  number: number;
  occupied: boolean;
  guest?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 border px-3 py-3 text-left transition duration-150 ${
        occupied ? "border-navy/15 bg-[#f4f7fb]" : "border-line bg-white hover:border-navy/30"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-navy">{number}-o‘rin</span>
        <span className="block truncate text-xs text-muted">{occupied ? guest || "BAND" : "BO‘SH"}</span>
      </span>
      <span className={`text-xs font-semibold ${occupied ? "text-navy" : "text-[#2d6a45]"}`}>
        {occupied ? "BAND" : "BO‘SH"}
      </span>
    </button>
  );
}
