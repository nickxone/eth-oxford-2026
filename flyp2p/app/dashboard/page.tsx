"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers"; // 👈 Added ethers
import { PROOF_DATABASE } from "@/data/mockProofs"; // 👈 Added your proofs
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
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import { PageBanner } from "@/components/ui/page-banner";

// --- CONFIGURATION ---
const FLIGHT_SURETY_ADDRESS = "0xe7751281E60FB33A78F3ef6330742503FF7e49F1";

const CONTRACT_ABI = [
  "function claimPayout(tuple(bytes32[] merkleProof, tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, tuple(string url, string httpMethod, string headers, string queryParams, string body, string postProcessJq, string abiSignature) requestBody, tuple(bytes abiEncodedData) responseBody) data) proof) external",
];

// --- FONTS ---
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "600"],
});

// --- TYPES ---
type PolicyStatus = "active" | "processing" | "claimed" | "expired";
type CheckState = "idle" | "verifying" | "success" | "failure";

type Policy = {
  id: string;
  nftId: string;
  flightNumber: string; // Matches key in PROOF_DATABASE
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

export default function DashboardPage() {
  const { address, isConnected, connectWallet, isConnecting } = useWallet();
  const [txHash, setTxHash] = useState<string>("");

  // --- POLICIES DATA ---
  // Updated to match your Mock Proofs (BF1234 & QA999)
  const policies = useMemo<Policy[]>(
    () => [
      {
        id: "POL-2045",
        nftId: "NFT-84C2",
        flightNumber: "BF1234", // 🟢 Matches Success Proof
        flightDate: "2026-02-10",
        coverage: "0.01 C2FLR", // Updated currency
        premium: "0.001 C2FLR",
        trigger: "Payout if delay > 30 mins",
        scheduledArrival: "18:35",
        actualArrival: "22:05", // +210 mins
        liveStatus: "Delayed (+210m)",
        initialState: "idle",
      },
      {
        id: "POL-1981",
        nftId: "NFT-4F12",
        flightNumber: "QA999", // 🔴 Matches Failure Proof
        flightDate: "2026-02-12",
        coverage: "0.01 C2FLR",
        premium: "0.001 C2FLR",
        trigger: "Payout if delay > 30 mins",
        scheduledArrival: "09:15",
        actualArrival: "09:15",
        liveStatus: "On Time",
        initialState: "idle",
      },
      {
        id: "POL-1387",
        nftId: "NFT-4R02",
        flightNumber: "BA001",
        flightDate: "2025-04-22",
        coverage: "0.01 C2FLR",
        premium: "0.001 C2FLR",
        trigger: "Payout if delay > 30 mins",
        scheduledArrival: "09:15",
        actualArrival: "11:15",
        liveStatus: "Delayed (+120m)",
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

  // --- MAIN CLAIM LOGIC ---
  const handleCheck = async (policy: Policy) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    // 1. Set Loading State
    setCheckStates((prev) => ({ ...prev, [policy.id]: "verifying" }));

    try {
      // 2. Get Proof from Database
      // We look up the proof using the Flight Number (BF1234 / QA999)
      const proof = PROOF_DATABASE[policy.flightNumber];

      if (!proof) {
        throw new Error(
          `No attestation proof found for flight ${policy.flightNumber}`
        );
      }

      // 3. Connect to Contract
      if (!window.ethereum) throw new Error("MetaMask not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        FLIGHT_SURETY_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // 4. Send Transaction
      console.log(`Submitting proof for ${policy.flightNumber}...`);
      const tx = await contract.claimPayout(proof);

      console.log("Tx Sent:", tx.hash);
      await tx.wait(); // Wait for confirmation

      // 5. Success!
      setTxHash(tx.hash);
      setCheckStates((prev) => ({ ...prev, [policy.id]: "success" }));
    } catch (error: any) {
      console.error("Claim Error:", error);

      // Check if it was a Revert (Logic failure) vs Network Error
      const msg = error.reason || error.message || "";

      if (
        msg.includes("Claim Rejected") ||
        msg.includes("execution reverted")
      ) {
        // Contract rejected it (e.g. Not Delayed) -> This is a "Valid Failure"
        setCheckStates((prev) => ({ ...prev, [policy.id]: "failure" }));
      } else {
        // User rejected or network error -> Reset to allow retry
        alert("Transaction failed: " + (error.reason || "Check console"));
        setCheckStates((prev) => ({ ...prev, [policy.id]: "idle" }));
      }
    }
  };

  const formatAddress = (value?: string) => {
    if (!value) return "Not connected";
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const getDerivedStatus = (
    policy: Policy,
    checkState: CheckState
  ): PolicyStatus => {
    if (checkState === "verifying") return "processing";
    if (checkState === "success") return "claimed";
    if (checkState === "failure") return "expired";
    return "active";
  };

  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} min-h-screen overflow-x-hidden text-[#0c1018]`}
    >
      <main className="relative mx-auto flex w-full flex-col gap-8 px-6 pb-24 sm:px-12">
        <PageBanner image="/buy_page_banner.jpg" />
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <Badge className="w-fit bg-indigo-50 text-indigo-700">
              Claims Dashboard
            </Badge>
            <h1 className="font-[var(--font-orbitron)] text-3xl sm:text-4xl">
              My Policies
            </h1>
            <p className="max-w-2xl text-base text-[#3f4a59]">
              Track your flight status and claim instant payouts via Flare FDC.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">
                Wallet
              </p>
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
              const showResult =
                checkState === "success" || checkState === "failure";

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
                              Policy ID: {policy.id} • Coverage:{" "}
                              {policy.coverage}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border px-3 py-1 text-xs",
                                statusStyles[status]
                              )}
                            >
                              {status === "active"
                                ? "Active"
                                : status === "processing"
                                ? "Verifying..."
                                : status === "claimed"
                                ? "Paid Out"
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
                            <span>Live Status</span>
                            <span
                              className={`font-semibold ${
                                policy.liveStatus.includes("Delayed")
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {policy.liveStatus}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 shadow-sm">
                            <span>Trigger</span>
                            <span className="font-medium">
                              {policy.trigger}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          <div className="grid gap-3">
                            <Button
                              className="rounded-full w-full"
                              onClick={() => handleCheck(policy)}
                              disabled={
                                checkState === "verifying" ||
                                checkState === "success" ||
                                checkState === "failure"
                              }
                            >
                              {checkState === "verifying" ? (
                                <span className="flex items-center gap-2">
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  Verifying on Flare...
                                </span>
                              ) : checkState === "success" ? (
                                "Claim Processed ✅"
                              ) : checkState === "failure" ? (
                                "Not Eligible ❌"
                              ) : (
                                "Check Flight Status & Claim"
                              )}
                            </Button>
                          </div>

                          {showResult && (
                            <div
                              className={`relative overflow-hidden rounded-2xl p-4 shadow-md ${
                                checkState === "success"
                                  ? "bg-green-50"
                                  : "bg-gray-100"
                              }`}
                            >
                              {checkState === "success" ? (
                                <>
                                  <p className="text-sm font-bold text-green-800">
                                    💰 Payout Confirmed!
                                  </p>
                                  <p className="mt-1 text-xs text-green-700">
                                    The contract verified the delay proof from
                                    Flare Oracle and sent {policy.coverage} to
                                    your wallet.
                                  </p>
                                  {txHash && (
                                    <a
                                      href={`https://coston2-explorer.flare.network/tx/${txHash}`}
                                      target="_blank"
                                      className="mt-2 flex items-center gap-1 text-xs text-blue-600 underline"
                                    >
                                      View Transaction{" "}
                                      <ExternalLinkIcon className="h-3 w-3" />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-bold text-gray-800">
                                    ❌ Claim Rejected
                                  </p>
                                  <p className="mt-1 text-xs text-gray-600">
                                    The Oracle proof confirms this flight
                                    arrived On Time. No payout is due.
                                  </p>
                                </>
                              )}
                            </div>
                          )}
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
