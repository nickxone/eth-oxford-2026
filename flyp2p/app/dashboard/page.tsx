"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { PROOF_DATABASE } from "@/data/mockProofs";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { useWallet } from "@/context/WalletContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PageBanner } from "@/components/ui/page-banner";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "600"],
});

type PolicyStatus = "active" | "processing" | "claimed" | "expired";
type CheckState = "idle" | "verifying" | "success" | "failure";
type PolicyFilter = "all" | PolicyStatus;

type Policy = {
  id: string;
  nftId: string;
  flightNumber: string;
  flightDate: string;
  coverage: string;
  premium?: string;
  trigger: string;
  scheduledArrival: string;
  actualArrival: string;
  liveStatus: string;
  initialState?: CheckState;
};

const cardBase = "border-0 bg-[#eef1f6]/60 shadow-md";

const statusStyles: Record<PolicyStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processing: "border-amber-200 bg-amber-50 text-amber-700",
  claimed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
};

// --- CONFIGURATION ---
const FLIGHT_SURETY_ADDRESS = "0xe7751281E60FB33A78F3ef6330742503FF7e49F1";

const CONTRACT_ABI = [
  "function claimPayout(tuple(bytes32[] merkleProof, tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, tuple(string url, string httpMethod, string headers, string queryParams, string body, string postProcessJq, string abiSignature) requestBody, tuple(bytes abiEncodedData) responseBody) data) proof) external",
];

export default function DashboardPage() {
  const { address, isConnected, connectWallet, isConnecting } = useWallet();
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});

  const policies = useMemo<Policy[]>(
    () => [
      {
        id: "POL-2045",
        nftId: "NFT-84C2",
        flightNumber: "BF1234",
        flightDate: "2026-02-10",
        coverage: "0.01 C2FLR",
        premium: "0.001 C2FLR",
        trigger: "Payout if delay > 30 mins",
        scheduledArrival: "18:35",
        actualArrival: "22:05",
        liveStatus: "Delayed (+210m)",
        initialState: "idle",
      },
      {
        id: "POL-1981",
        nftId: "NFT-4F12",
        flightNumber: "QA999",
        flightDate: "2026-02-12",
        coverage: "0.01 C2FLR",
        premium: "0.001 C2FLR",
        trigger: "Payout if delay > 30 mins",
        scheduledArrival: "09:15",
        actualArrival: "09:15",
        liveStatus: "On Time",
        initialState: "idle",
      },
    ],
    []
  );

  const [checkStates, setCheckStates] = useState<Record<string, CheckState>>(
    () =>
      policies.reduce((acc, policy) => {
        acc[policy.id] = policy.initialState ?? "idle";
        return acc;
      }, {} as Record<string, CheckState>)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PolicyFilter>("all");

  const handleCheck = async (policy: Policy) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    setCheckStates((prev) => ({ ...prev, [policy.id]: "verifying" }));

    try {
      const proof = PROOF_DATABASE[policy.flightNumber];

      if (!proof) {
        throw new Error(
          `No attestation proof found for flight ${policy.flightNumber}`
        );
      }

      if (!window.ethereum) throw new Error("MetaMask not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        FLIGHT_SURETY_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const tx = await contract.claimPayout(proof);
      await tx.wait();

      setTxHashes((prev) => ({ ...prev, [policy.id]: tx.hash }));
      setCheckStates((prev) => ({ ...prev, [policy.id]: "success" }));
    } catch (error: any) {
      const msg = error.reason || error.message || "";

      if (msg.includes("Claim Rejected") || msg.includes("execution reverted")) {
        setCheckStates((prev) => ({ ...prev, [policy.id]: "failure" }));
      } else {
        alert("Transaction failed: " + (error.reason || "Check console"));
        setCheckStates((prev) => ({ ...prev, [policy.id]: "idle" }));
      }
    }
  };

  const formatAddress = (value?: string) => {
    if (!value) return "Not connected";
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const getDerivedStatus = (checkState: CheckState): PolicyStatus => {
    if (checkState === "verifying") return "processing";
    if (checkState === "success") return "claimed";
    if (checkState === "failure") return "expired";
    return "active";
  };

  const getLiveStatus = (policy: Policy, checkState: CheckState) => {
    if (checkState === "verifying") return "Landed - Checking status...";
    if (checkState === "success") return "Delay confirmed - payout triggered";
    if (checkState === "failure") return "Arrived on time";
    return policy.liveStatus;
  };

  const statusCounts = useMemo(() => {
    const counts: Record<PolicyFilter, number> = {
      all: policies.length,
      active: 0,
      processing: 0,
      claimed: 0,
      expired: 0,
    };
    policies.forEach((policy) => {
      const status = getDerivedStatus(checkStates[policy.id] ?? "idle");
      counts[status] += 1;
    });
    return counts;
  }, [policies, checkStates]);

  const filteredPolicies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return policies.filter((policy) => {
      const checkState = checkStates[policy.id] ?? "idle";
      const status = getDerivedStatus(checkState);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        policy.id,
        policy.nftId,
        policy.flightNumber,
        policy.flightDate,
        policy.coverage,
        policy.premium ?? "",
        policy.trigger,
        policy.scheduledArrival,
        policy.actualArrival,
        policy.liveStatus,
        status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [policies, checkStates, statusFilter, searchQuery]);

  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} min-h-screen overflow-x-hidden text-[#0c1018]`}
    >
      <main className="relative mx-auto flex w-full flex-col gap-8 px-6 pb-24 sm:px-12">
        <PageBanner image="/dashboard_page_banner.jpg" />
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <Badge className="w-fit bg-indigo-50 text-indigo-700">Claims Dashboard</Badge>
            <h1 className="font-[var(--font-orbitron)] text-3xl sm:text-4xl">
              My Policies
            </h1>
            <p className="max-w-2xl text-base text-[#3f4a59]">
              Track your flight status and claim instant payouts.
            </p>
          </div>
  
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">Wallet</p>
              <p className="text-sm font-medium text-[#0c1018]">
                {formatAddress(address)}
              </p>
            </div>
            {!isConnected ? (
              <Button
                size="sm"
                className="rounded-full"
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            ) : null}
          </div>
        </section>

        {policies.length === 0 ? (
          <Card className={cn(cardBase, "text-center")}>
            <CardHeader>
              <CardTitle>No active policies found</CardTitle>
              <CardDescription>
                Buy coverage to track flights and claim payouts.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button asChild className="rounded-full">
                <Link href="/buy">Buy Insurance</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <section className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-[#6b7482]">
                  Policies
                </p>
                <p className="text-sm text-[#3f4a59]">
                  {policies.length}{" "}
                  {policies.length === 1 ? "policy" : "policies"} connected to
                  your wallet.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit">
                Live flight monitoring
              </Badge>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-white/70 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as PolicyFilter)}>
                    <TabsList variant="line" className="flex-wrap">
                      <TabsTrigger value="all">
                        All
                        <Badge variant="secondary">{statusCounts.all}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="active">
                        Active
                        <Badge variant="secondary">{statusCounts.active}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="processing">
                        Processing
                        <Badge variant="secondary">{statusCounts.processing}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="claimed">
                        Claimed
                        <Badge variant="secondary">{statusCounts.claimed}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="expired">
                        Expired
                        <Badge variant="secondary">{statusCounts.expired}</Badge>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search flight, policy, status, or trigger"
                    className="h-10 w-full shadow-sm rounded-lg bg-transparent px-3 text-sm text-[#0c1018] outline-none transition focus:border-[#5fe3ff] lg:max-w-sm"
                  />
                </div>
                <p className="text-xs text-[#6b7482]">
                  Showing {filteredPolicies.length} of {policies.length} policies.
                </p>
              </div>
              <div className="overflow-auto">
                <Table className="min-w-[1100px] text-sm">
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Flight</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Arrival</TableHead>
                      <TableHead>Live Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPolicies.map((policy) => {
                      const checkState = checkStates[policy.id] ?? "idle";
                      const status = getDerivedStatus(checkState);
                      const liveStatus = getLiveStatus(policy, checkState);
                      const txHash = txHashes[policy.id];
                      const hasProof = Boolean(
                        PROOF_DATABASE[policy.flightNumber]
                      );

                      return (
                        <TableRow key={policy.id} className="align-top">
                          <TableCell>
                            <p className="font-semibold">{policy.flightNumber}</p>
                            <p className="text-xs text-[#6b7482]">
                              {policy.flightDate}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold">{policy.coverage}</p>
                            {policy.premium ? (
                              <p className="text-xs text-[#6b7482]">
                                Premium {policy.premium}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-[#1f2a3a]">
                            {policy.trigger}
                          </TableCell>
                          <TableCell>
                            <div className="grid gap-1 text-xs text-[#6b7482]">
                              <p>
                                Scheduled{" "}
                                <span className="font-semibold text-[#0c1018]">
                                  {policy.scheduledArrival}
                                </span>
                              </p>
                              <p>
                                Actual{" "}
                                <span className="font-semibold text-[#0c1018]">
                                  {checkState === "idle"
                                    ? "TBD"
                                    : policy.actualArrival}
                                </span>
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{liveStatus}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("border px-3 py-1 text-xs", statusStyles[status])}
                            >
                              {status === "active"
                                ? "Active"
                                : status === "processing"
                                  ? "Processing"
                                  : status === "claimed"
                                    ? "Claimed"
                                    : "Expired"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {checkState === "verifying" ? (
                              <div className="text-xs text-[#3f4a59]">
                                Attestation submitted, waiting for proof...
                              </div>
                            ) : checkState === "success" ? (
                              <div>
                                <p className="font-semibold text-[#0c1018]">
                                  Flight delayed! {policy.coverage} sent.
                                </p>
                                <p className="text-xs text-[#3f4a59]">
                                  Payout processed via Flare Data Connector.
                                </p>
                                {txHash ? (
                                  <a
                                    href={`https://coston2-explorer.flare.network/tx/${txHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 underline"
                                  >
                                    View transaction
                                  </a>
                                ) : null}
                              </div>
                            ) : checkState === "failure" ? (
                              <div>
                                <p className="font-semibold text-[#0c1018]">
                                  Arrived on time. No payout due.
                                </p>
                                <p className="text-xs text-[#3f4a59]">
                                  This policy has expired.
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-[#6b7482]">
                                Run a check to confirm payout eligibility.
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-2">
                              <Button
                                size="sm"
                                className="rounded-full"
                                onClick={() => handleCheck(policy)}
                                disabled={
                                  checkState === "verifying" ||
                                  checkState === "success" ||
                                  checkState === "failure"
                                }
                              >
                                {checkState === "verifying"
                                  ? "Verifying..."
                                  : checkState === "success"
                                    ? "Claimed"
                                    : checkState === "failure"
                                      ? "Not Eligible"
                                      : "Check Status"}
                              </Button>
                              <span className="text-xs text-[#6b7482]">
                                {hasProof ? "Proof available" : "No proof found"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!filteredPolicies.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-sm text-[#6b7482]"
                        >
                          No matching policies found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
