"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { useWallet } from "@/context/WalletContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
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
  outcome: "payout" | "on-time";
  initialState?: CheckState;
};

const cardBase = "border-0 bg-[#eef1f6]/60 shadow-md";

const statusStyles: Record<PolicyStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processing: "border-amber-200 bg-amber-50 text-amber-700",
  claimed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
};

const confettiPieces = [
  { left: "12%", top: "12%", color: "bg-[#5fe3ff]", delay: "0s" },
  { left: "24%", top: "22%", color: "bg-[#7cfdb6]", delay: "0.1s" },
  { left: "40%", top: "10%", color: "bg-[#a478ff]", delay: "0.2s" },
  { left: "58%", top: "18%", color: "bg-[#5fe3ff]", delay: "0.15s" },
  { left: "70%", top: "8%", color: "bg-[#7cfdb6]", delay: "0.3s" },
  { left: "82%", top: "20%", color: "bg-[#a478ff]", delay: "0.25s" },
];

export default function DashboardPage() {
  const { address, isConnected, connectWallet, isConnecting } = useWallet();

  const policies = useMemo<Policy[]>(
    () => [
      {
        id: "POL-2045",
        nftId: "NFT-84C2",
        flightNumber: "BA123",
        flightDate: "2026-02-10",
        coverage: "200 USDC",
        premium: "10 USDC",
        trigger: "Payout if delay > 3 hours",
        scheduledArrival: "18:35",
        actualArrival: "20:02",
        liveStatus: "On-time so far",
        outcome: "payout",
        initialState: "idle",
      },
      {
        id: "POL-1981",
        nftId: "NFT-4F12",
        flightNumber: "EK002",
        flightDate: "2026-02-12",
        coverage: "150 USDC",
        premium: "8 USDC",
        trigger: "Payout if delay > 2 hours",
        scheduledArrival: "09:15",
        actualArrival: "09:12",
        liveStatus: "Arrived on time",
        outcome: "on-time",
        initialState: "failure",
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

  const handleCheck = (policy: Policy) => {
    setCheckStates((prev) => ({ ...prev, [policy.id]: "verifying" }));

    window.setTimeout(() => {
      setCheckStates((prev) => ({
        ...prev,
        [policy.id]: policy.outcome === "payout" ? "success" : "failure",
      }));
    }, 1400);
  };

  const formatAddress = (value?: string) => {
    if (!value) return "Not connected";
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const getDerivedStatus = (policy: Policy, checkState: CheckState): PolicyStatus => {
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

  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} min-h-screen text-[#0c1018]`}
    >
      <main className="relative mx-auto flex w-full flex-col gap-8 px-6 pb-24 sm:px-12">
        <PageBanner image="/buy_page_banner.jpg" />
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
          <section className="grid gap-6">
            {policies.map((policy) => {
              const checkState = checkStates[policy.id] ?? "idle";
              const status = getDerivedStatus(policy, checkState);
              const liveStatus = getLiveStatus(policy, checkState);
              const showResult = checkState === "success" || checkState === "failure";

              return (
                <Collapsible
                  key={policy.id} 
                  className={cn(cardBase, "rounded-xl")}
                >
                  <Card className="border-0 bg-transparent shadow-none">
                    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
                      <CollapsibleTrigger asChild>
                        <button className="group flex w-full items-start justify-between gap-4 text-left">
                          <div>
                            <CardTitle className="text-2xl font-semibold">
                              {policy.flightNumber}
                              <span className="ml-2 text-sm font-normal text-[#6b7482]">
                                {policy.flightDate}
                              </span>
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Policy ID: {policy.id} • Token: {policy.nftId}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
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
                            <ChevronDownIcon className="mt-1 h-4 w-4 text-[#6b7482] transition-transform group-data-[state=open]:rotate-180" />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="grid gap-6 text-sm text-[#1f2a3a] lg:grid-cols-[1fr_1.1fr]">
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 shadow-sm">
                            <span>Coverage</span>
                            <span className="font-semibold">{policy.coverage}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 shadow-sm">
                            <span>Trigger</span>
                            <span className="font-medium">{policy.trigger}</span>
                          </div>
                          {policy.premium ? (
                            <div className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 shadow-sm">
                              <span>Premium</span>
                              <span className="font-medium">{policy.premium}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-4">
                          <Collapsible
                            defaultOpen
                            className="rounded-2xl bg-white/70 px-2 py-2 shadow-sm"
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="group w-full justify-between px-3 py-2 text-xs uppercase tracking-[0.3em] text-[#6b7482]"
                              >
                                Flight Status
                                <ChevronDownIcon className="h-4 w-4 text-[#6b7482] transition-transform group-data-[state=open]:rotate-180" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="grid gap-3 px-3 pb-3 text-sm">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-[#6b7482]">Scheduled Arrival</p>
                                  <p className="font-semibold">{policy.scheduledArrival}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-[#6b7482]">Actual Arrival</p>
                                  <p className="font-semibold">
                                    {checkState === "idle" ? "TBD" : policy.actualArrival}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">{liveStatus}</Badge>
                            </CollapsibleContent>
                          </Collapsible>

                          <div className="grid gap-3">
                            <Button
                              className="rounded-full"
                              onClick={() => handleCheck(policy)}
                              disabled={checkState === "verifying"}
                            >
                              {checkState === "verifying"
                                ? "Verifying flight data via Flare..."
                                : checkState === "success" || checkState === "failure"
                                  ? "Check Again"
                                  : "Check Flight Status"}
                            </Button>
                            {checkState === "verifying" ? (
                              <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-[#3f4a59]">
                                Attestation submitted, waiting for proof...
                              </div>
                            ) : null}
                          </div>

                          {showResult ? (
                            <div className="relative overflow-hidden rounded-2xl bg-white/80 p-4 shadow-md">
                              {checkState === "success" ? (
                                <>
                                  <div className="pointer-events-none absolute inset-0">
                                    {confettiPieces.map((piece, index) => (
                                      <span
                                        key={`${policy.id}-confetti-${index}`}
                                        className={cn(
                                          "absolute h-2 w-2 rounded-sm animate-bounce",
                                          piece.color
                                        )}
                                        style={{
                                          left: piece.left,
                                          top: piece.top,
                                          animationDelay: piece.delay,
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-sm font-semibold text-[#0c1018]">
                                    Flight delayed! {policy.coverage} sent to your wallet.
                                  </p>
                                  <p className="mt-1 text-xs text-[#3f4a59]">
                                    Payout processed via Flare Data Connector.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-semibold text-[#0c1018]">
                                    Flight arrived on time. No payout due.
                                  </p>
                                  <p className="mt-1 text-xs text-[#3f4a59]">
                                    This policy has expired.
                                  </p>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
