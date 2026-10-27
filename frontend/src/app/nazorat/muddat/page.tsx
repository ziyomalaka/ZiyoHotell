"use client";

import { useEffect, useState } from "react";
import { api, downloadExcel } from "@/lib/api";
import { AddPaymentModal, type PayStay } from "@/components/AddPaymentModal";
import { EmptyState } from "@/components/EmptyState";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { PaymentDueTable, type PaymentDueData } from "@/components/PaymentDueTable";
import { SectorFilter } from "@/components/SectorFilter";

export default function SupervisorDuePage() {
  const [sector, setSector] = useState("");
  const [data, setData] = useState<PaymentDueData | null>(null);
  const [pay, setPay] = useState<PayStay | null>(null);

  function load(nextSector = sector) {
    const q = nextSector ? `?floor=${nextSector}` : "";
    return api<PaymentDueData>(`/api/v1/reception/reports/payment-due${q}`)
      .then(setData)
      .catch(() => setData(null));
  }
  useEffect(() => {
    load(sector);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SectorFilter scope="reception" value={sector} onChange={setSector} />
        <ExportExcelButton
          onClick={() =>
            downloadExcel(
              `/api/v1/reception/reports/export/excel?type=payment-due${sector ? `&floor=${sector}` : ""}`,
              "Yotoqxona_TolovMuddati.xlsx",
            )
          }
        />
        <p className="text-sm text-muted">Muddati yaqin va o‘tgan mijozlar yuqorida, rang bilan ajratilgan.</p>
      </div>
      <PaymentDueTable
        data={data}
        onPay={(r) =>
          setPay({
            id: r.stayId,
            type: r.type,
            monthlyPrice: r.monthlyPrice,
            paidDays: r.paidDays,
            startDate: r.startDate,
            customerName: r.fullName,
          })
        }
      />
      {data && !data.rows.length ? <EmptyState className="mt-4" text="Hozir yashovchi mijoz yo‘q." /> : null}
      {pay ? (
        <AddPaymentModal
          stay={pay}
          onClose={() => setPay(null)}
          onSaved={() => {
            setPay(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}
