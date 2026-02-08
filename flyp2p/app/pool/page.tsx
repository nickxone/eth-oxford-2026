"use client";

import { useEffect, useMemo, useState } from "react";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { useWallet } from "@/context/WalletContext";
import {
  readFxrpBalance,
  readAvailableStakeOf,
  readPoolContracts,
} from "@/lib/helpers/pool";
import { readAllPolicies, PolicyReadout } from "@/lib/helpers/policy"; //
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActiveRiskTable } from "@/components/pool/active-risk-table";
import { ManageLiquidityTabs } from "@/components/pool/manage-liquidity-tabs";
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

const cardBase = "border-0 bg-[#eef1f6]/60 shadow-md";

export default function PoolPage() {
  const { address, isConnected, connectWallet, isConnecting } = useWallet();
  const [walletFxrpBalance, setWalletFxrpBalance] = useState<string>("0.0");
  const [allPolicies, setAllPolicies] = useState<PolicyReadout[]>([]); //
  const [availableStake, setAvailableStake] = useState<string>("0.0");
  const [poolReadout, setPoolReadout] = useState<{
    poolAvailable: string;
    poolTotalLocked: string;
    poolTotalShares: string;
    fxrpSymbol: string;
    walletPoolLiquidity?: string;
  } | null>(null);

  // Filter policies that are currently "Active"
  const activePolicies = useMemo(() => 
    allPolicies.filter(p => p.status === "Active"), 
    [allPolicies]
  ); //

  const stats = useMemo(() => {
    const symbol = "FXRP";
    return [
      {
        label: "Pool Available",
        value: poolReadout ? `${poolReadout.poolAvailable} ${symbol}` : "--",
        footer: "Available liquidity on-chain",
      },
      {
        label: "Total Locked",
        value: poolReadout ? `${poolReadout.poolTotalLocked} ${symbol}` : "--",
        footer: "Locked for active coverage",
      },
      {
        label: "Total Shares",
        value: poolReadout ? `${poolReadout.poolTotalShares} ${symbol}` : "--",
        footer: "Total pool shares minted",
      },
      {
        label: "My Liquidity",
        value: poolReadout?.walletPoolLiquidity
          ? `${poolReadout.walletPoolLiquidity} ${symbol}`
          : "--",
        footer: "Your FXRP deposited in pool",
      },
      {
        label: "Active Policies",
        value: `${activePolicies.length} Active`, // Dynamic count
        footer: "Current flights underwritten",
      },
      {
        label: "Earnings",
        value: `${availableStake} ${symbol}`,
        footer: "Available to withdraw",
      },
    ];
  }, [poolReadout, walletFxrpBalance, activePolicies, availableStake]);

  // Map contract policies to the RiskTable format
  const riskTableData = useMemo(() => 
    activePolicies.map(p => ({
      flight: p.flightRef,
      departure: new Date(p.startTimestamp * 1000).toLocaleString(), // Format timestamp
      locked: `${p.coverage} FXRP`,
      status: "Active" as const
    })), 
    [activePolicies, poolReadout]
  ); //

  // Effect to fetch all policies
  useEffect(() => {
    let cancelled = false;
    readAllPolicies() //
      .then((policies) => {
        if (!cancelled) setAllPolicies(policies);
      })
      .catch((err) => {
        console.error("Failed to fetch policies:", err);
        if (!cancelled) setAllPolicies([]);
      });
    return () => { cancelled = true; };
  }, []);

  const lockedFunds = 200;

  const formatAddress = (value?: string) => {
    if (!value) return "Not connected";
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

    useEffect(() => {
    let cancelled = false;
    if (!address) {
      setWalletFxrpBalance("0.0");
      return () => {
        cancelled = true;
      };
    }
    readFxrpBalance(address)
      .then((balance) => {
        if (!cancelled) setWalletFxrpBalance(balance);
      })
      .catch(() => {
        if (!cancelled) setWalletFxrpBalance("0.0");
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setAvailableStake("0.0");
      return () => {
        cancelled = true;
      };
    }
    readAvailableStakeOf(address)
      .then((value) => {
        if (!cancelled) setAvailableStake(value);
      })
      .catch(() => {
        if (!cancelled) setAvailableStake("0.0");
      }); 
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    readPoolContracts(address)
      .then((data) => {
        if (!cancelled) {
          setPoolReadout({
            poolAvailable: data.poolAvailable,
            poolTotalLocked: data.poolTotalLocked,
            poolTotalShares: data.poolTotalShares,
            fxrpSymbol: data.fxrpSymbol,
            walletPoolLiquidity: data.walletPoolLiquidity,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setPoolReadout(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} min-h-screen overflow-x-hidden text-[#0c1018]`}
    >
      <main className="relative mx-auto flex w-full flex-col gap-8 px-6 pb-24 sm:px-12">
        <PageBanner image="/pool_page_banner.jpg" />
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <Badge className="bg-orange-50 text-orange-700">Liquidity Pool</Badge>
            <h1 className="font-[var(--font-orbitron)] text-3xl sm:text-4xl">
              Liquidity Pool
            </h1>
            <p className="max-w-2xl text-base text-[#3f4a59]">
              Provide capital to underwrite flight risks and earn yield.
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

        <section className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="@container/card border-0">
              <CardHeader>
                <CardDescription className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">
                  {stat.label}
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stat.value}
                </CardTitle>
                <CardAction />
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm text-[#3f4a59]">
                <div className="line-clamp-1 flex gap-2 font-medium text-[#0c1018]">
                  {stat.footer}
                </div>
              </CardFooter>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className={cardBase}>
            <CardHeader>
              <CardTitle>Manage Liquidity</CardTitle>
              <CardDescription>Deposit or withdraw from the pool.</CardDescription>
            </CardHeader>
            <CardContent>
              <ManageLiquidityTabs
                lockedFunds={lockedFunds}
                walletBalance={walletFxrpBalance}
                poolBalance={poolReadout?.walletPoolLiquidity ?? "0.0"}
              />
            </CardContent>
            <CardFooter className="text-xs text-[#6b7482]">
              Transactions settle on-chain after Flare confirmation.
            </CardFooter>
          </Card>

          <Card className={cardBase}>
            <CardHeader>
              <CardTitle>Active Risk Exposure</CardTitle>
              <CardDescription>Underwritten flights using your capital.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveRiskTable data={riskTableData} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
