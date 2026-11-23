import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const source = vi.hoisted(() => ({ loadMatchData: vi.fn(), withAiSignals: vi.fn() }));
vi.mock("@/lib/p05/source", async (importOriginal) => ({ ...(await importOriginal<object>()), ...source }));

import { P05Matches } from "@/components/p05/P05Matches";
import { DEMO_DATA } from "@/lib/p05";

function renderMatches(studentId = "COOP-B001") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><P05Matches studentId={studentId} /></QueryClientProvider>);
}

describe("P05 Recommended tab", () => {
  beforeEach(() => {
    source.loadMatchData.mockReset();
    source.withAiSignals.mockReset();
  });

  it("falls back to the demo data and says so when the shared database cannot be reached", async () => {
    source.loadMatchData.mockRejectedValue(new Error("offline"));
    renderMatches();
    expect(await screen.findByText("Demo data — couldn’t reach the shared database.", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Layla’s matches" })).toBeInTheDocument();
    const top = screen.getByRole("heading", { name: "Top 3 for you" }).closest("section")!;
    expect(within(top).getAllByRole("listitem").filter((li) => li.querySelector("button"))).toHaveLength(3);
    expect(within(top).getAllByText("Can apply").length).toBeGreaterThan(0);
    expect(screen.getByText(/a person at the co-op office approves every placement/)).toBeInTheDocument();
  });

  it("shows live data with its counts when the shared database answers", async () => {
    source.loadMatchData.mockResolvedValue({ data: DEMO_DATA, source: { mode: "live", loadedAt: "2026-11-23T00:00:00Z", counts: { students: 6, listings: 6, skills: 14 } } });
    renderMatches("COOP-B006");
    expect(await screen.findByText(/Live from the shared BUS2010 database: 6 students, 6 published jobs/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Daniel’s matches" })).toBeInTheDocument();
    // D8: the remote-only student sees the on-site airport job as "Not a fit now", never hidden
    expect(screen.getAllByText("Not a fit now").length).toBeGreaterThan(0);
  });

  it("never shows a closed job as one to apply to", async () => {
    source.loadMatchData.mockRejectedValue(new Error("offline"));
    renderMatches();
    const all = (await screen.findByRole("heading", { name: /All \d+ jobs/ }, { timeout: 4000 })).closest("section")!;
    const closedRow = within(all).getByText("Airline Revenue Analytics Intern").closest("li")!;
    expect(within(closedRow).getByText("Closed")).toBeInTheDocument();
    expect(within(closedRow).getByText(/Applications closed on 1 Nov 2026/)).toBeInTheDocument();
  });
});
