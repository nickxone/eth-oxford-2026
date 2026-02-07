"use client";

import { useMemo } from "react";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { useWallet } from "@/context/WalletContext";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
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
import { cn } from "@/lib/utils";
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

type RiskItem = {
  flight: string;
  departure: string;
  locked: string;
  status: "Active" | "Resolving";
};

const cardBase = "border-0 bg-[#eef1f6]/60 shadow-md";

export default function PoolPage() {
  const { address, isConnected, connectWallet, isConnecting } = useWallet();

  const stats = useMemo(
    () => [
      {
        label: "Total Value Locked",
        value: "$10,000 USDC",
        trend: "+8.2%",
        direction: "up" as const,
        footer: "TVL growing month over month",
      },
      {
        label: "Active Policies",
        value: "12 Active Policies",
        trend: "+3",
        direction: "up" as const,
        footer: "New flights underwritten today",
      },
      {
        label: "APY",
        value: "5%",
        trend: "-0.4%",
        direction: "down" as const,
        footer: "Premiums softer this week",
      },
      {
        label: "My Liquidity",
        value: "500 USDC",
        trend: "+50 USDC",
        direction: "up" as const,
        footer: "Deposits added this cycle",
      },
      {
        label: "Pool Share",
        value: "5% Share",
        trend: "+0.3%",
        direction: "up" as const,
        footer: "Ownership increased",
      },
      {
        label: "Earnings",
        value: "+$25 Earned",
        trend: "+$3",
        direction: "up" as const,
        footer: "Premiums accrued to date",
      },
    ],
    []
  );

  const risks = useMemo<RiskItem[]>(
    () => [
      { flight: "BA123", departure: "Feb 10, 14:00", locked: "$200", status: "Active" },
      { flight: "EK002", departure: "Feb 12, 09:15", locked: "$150", status: "Active" },
      { flight: "SQ318", departure: "Feb 13, 21:40", locked: "$120", status: "Resolving" },
    ],
    []
  );

  const lockedFunds = 200;

  const formatAddress = (value?: string) => {
    if (!value) return "Not connected";
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} min-h-screen text-[#0c1018]`}
    >
      <main className="relative mx-auto flex w-full flex-col gap-8 px-6 pb-24 sm:px-12">
        <PageBanner image="/buy_page_banner.jpg" />
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
                <CardAction>
                  <Badge variant="outline">
                    {stat.direction === "up" ? <IconTrendingUp /> : <IconTrendingDown />}
                    {stat.trend}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm text-[#3f4a59]">
                <div className="line-clamp-1 flex gap-2 font-medium text-[#0c1018]">
                  {stat.footer}
                  {stat.direction === "up" ? (
                    <IconTrendingUp className="size-4" />
                  ) : (
                    <IconTrendingDown className="size-4" />
                  )}
                </div>
                <div className="text-xs text-[#6b7482]">
                  Updated moments ago
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
              <ManageLiquidityTabs lockedFunds={lockedFunds} walletBalance={1000} />
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
              <ActiveRiskTable data={risks} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
