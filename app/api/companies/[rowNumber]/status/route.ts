import { NextResponse } from "next/server";
import { updateCompanyRow } from "@/lib/sheetsWrite";
import { canTransition, getAllowedNextStatuses, isValidStatus } from "@/lib/status";
import { getCached, setCached } from "@/lib/cache";
import { WRITE_BACK_CONFIGURED } from "@/lib/config";
import { SheetDataResponse, UpdateCompanyStatusResponse } from "@/types";

const CACHE_KEY = "sheet-data";

export async function PATCH(request: Request, { params }: { params: { rowNumber: string } }) {
  const rowNumber = Number(params.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    return NextResponse.json({ error: "Invalid row number." }, { status: 400 });
  }

  let body: { crmStatus?: string; notes?: string; fromStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const { crmStatus, notes, fromStatus } = body;

  if (crmStatus === undefined && notes === undefined) {
    return NextResponse.json({ error: "Provide at least one of crmStatus or notes." }, { status: 400 });
  }

  if (crmStatus !== undefined) {
    if (!isValidStatus(crmStatus)) {
      return NextResponse.json({ error: `"${crmStatus}" is not a recognized status.` }, { status: 400 });
    }

    if (fromStatus && isValidStatus(fromStatus) && !canTransition(fromStatus, crmStatus)) {
      return NextResponse.json(
        {
          error: `Cannot move from ${fromStatus} to ${crmStatus}.`,
          detail: `Allowed next statuses from ${fromStatus}: ${getAllowedNextStatuses(fromStatus).join(", ")}`,
        },
        { status: 409 }
      );
    }
  }

  if (!WRITE_BACK_CONFIGURED) {
    const response: UpdateCompanyStatusResponse = {
      success: false,
      persisted: false,
      lastUpdated: new Date().toISOString(),
      message: "Google Sheets write-back isn't configured — this change was not saved.",
    };
    return NextResponse.json(response, { status: 200 });
  }

  try {
    const lastUpdated = new Date().toISOString();
    await updateCompanyRow(rowNumber, { crmStatus, notes, lastUpdatedIso: lastUpdated });

    // Patch the in-memory cache so the dashboard reflects this change
    // immediately without waiting for the next 10-minute refresh.
    const cached = getCached<SheetDataResponse>(CACHE_KEY, Number.MAX_SAFE_INTEGER);
    if (cached) {
      const patched: SheetDataResponse = {
        ...cached.value,
        companies: cached.value.companies.map((c) =>
          c.rowNumber === rowNumber
            ? {
                ...c,
                crmStatus: crmStatus !== undefined && isValidStatus(crmStatus) ? crmStatus : c.crmStatus,
                notes: notes !== undefined ? notes : c.notes,
                lastUpdated,
              }
            : c
        ),
      };
      setCached(CACHE_KEY, patched);
    }

    const response: UpdateCompanyStatusResponse = { success: true, persisted: true, lastUpdated };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save the status change.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
