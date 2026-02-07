"use client";

import * as React from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type ManageLiquidityTabsProps = {
  lockedFunds: number;
  walletBalance: number;
  defaultAsset?: string;
};

export function ManageLiquidityTabs({
  lockedFunds,
  walletBalance,
  defaultAsset = "USDC",
}: ManageLiquidityTabsProps) {
  const [depositAmount, setDepositAmount] = React.useState("");
  const [withdrawAmount, setWithdrawAmount] = React.useState("");
  const [asset, setAsset] = React.useState(defaultAsset);

  return (
    <Tabs defaultValue="deposit" className="w-full">
      <TabsList>
        <TabsTrigger value="deposit">Deposit</TabsTrigger>
        <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
      </TabsList>

      <TabsContent value="deposit">
        <Card className="border-0 bg-white/70 shadow-sm">
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
            <CardDescription>Fund the pool to underwrite flights.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1a2333]">
                Amount to Deposit
              </label>
              <input
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                placeholder="0.00"
                className="h-11 rounded-lg border border-[#dfe3ea] bg-transparent px-3 text-sm text-[#0c1018] shadow-sm outline-none transition focus:border-[#5fe3ff]"
              />
              <p className="text-xs text-[#6b7482]">
                Wallet Balance: {walletBalance} {asset}
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1a2333]">Asset</label>
              <select
                value={asset}
                onChange={(event) => setAsset(event.target.value)}
                className="h-11 rounded-lg border border-[#dfe3ea] bg-transparent px-3 text-sm text-[#0c1018] shadow-sm outline-none transition focus:border-[#5fe3ff]"
              >
                <option value="USDC">USDC</option>
                <option value="FBTC">FBTC</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-full">
                Approve
              </Button>
              <Button className="rounded-full">Deposit</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="withdraw">
        <Card className="border-0 bg-white/70 shadow-sm">
          <CardHeader>
            <CardTitle>Withdraw</CardTitle>
            <CardDescription>Remove available liquidity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#1a2333]">
                Amount to Withdraw
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  placeholder="0.00"
                  className="h-11 w-full rounded-lg border border-[#dfe3ea] bg-transparent px-3 text-sm text-[#0c1018] shadow-sm outline-none transition focus:border-[#5fe3ff]"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => setWithdrawAmount(String(walletBalance))}
                >
                  Max
                </Button>
              </div>
            </div>

            {lockedFunds > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Cannot withdraw locked funds (${lockedFunds} currently underwriting Flight BA123).
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button className="rounded-full" disabled={lockedFunds > 0}>
              Withdraw
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
