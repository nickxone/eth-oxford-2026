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
import { useWallet } from "@/context/WalletContext";
import { withdrawFxrpAmount } from "@/lib/helpers/pool";
import { approveFxrp, depositToPool } from "@/lib/helpers/writes";

type ManageLiquidityTabsProps = {
  walletBalance: string;
  poolBalance: string;
  defaultAsset?: string;
};

export function ManageLiquidityTabs({
  walletBalance,
  poolBalance,
  defaultAsset = "FXRP",
}: ManageLiquidityTabsProps) {
  const { address, isConnected, connectWallet, isConnecting } = useWallet();
  const [depositAmount, setDepositAmount] = React.useState("");
  const [withdrawAmount, setWithdrawAmount] = React.useState("");
  const [asset, setAsset] = React.useState(defaultAsset);
  const [approvedAmount, setApprovedAmount] = React.useState<string | null>(null);
  const [isApproving, setIsApproving] = React.useState(false);
  const [isDepositing, setIsDepositing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = React.useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);

  React.useEffect(() => {
    if (!address) {
      setApprovedAmount(null);
      return;
    }
    setApprovedAmount(null);
  }, [address, depositAmount]);

  const depositNumber = Number(depositAmount);
  const walletBalanceNumber = Number(walletBalance);
  const withdrawNumber = Number(withdrawAmount);

  const canDeposit = Boolean(
    depositAmount &&
      approvedAmount &&
      approvedAmount === depositAmount &&
      Number.isFinite(depositNumber) &&
      Number.isFinite(walletBalanceNumber) &&
      depositNumber > 0 &&
      depositNumber <= walletBalanceNumber
  );

  const handleApprove = async () => {
    setIsApproving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await approveFxrp(depositAmount);
      setApprovedAmount(depositAmount);
      setActionSuccess("Approval confirmed.");
    } catch (err: any) {
      setActionError(err?.message ?? "Approval failed.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    setIsDepositing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await depositToPool(depositAmount);
      setApprovedAmount(null);
      setActionSuccess("Deposit confirmed.");
    } catch (err: any) {
      setActionError(err?.message ?? "Deposit failed.");
    } finally {
      setIsDepositing(false);
    }
  };

  const canWithdraw = Number.isFinite(withdrawNumber) && withdrawNumber > 0;

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);
    try {
      await withdrawFxrpAmount(withdrawAmount);
      setWithdrawAmount("");
      setWithdrawSuccess("Withdrawal confirmed.");
    } catch (err: any) {
      setWithdrawError(err?.message ?? "Withdraw failed.");
    } finally {
      setIsWithdrawing(false);
    }
  };

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
                <option value="FXRP">FXRP</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isConnected ? (
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={connectWallet}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={handleApprove}
                    disabled={!depositAmount || isApproving}
                  >
                    {isApproving ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    className="rounded-full"
                    onClick={handleDeposit}
                    disabled={!canDeposit || isDepositing}
                  >
                    {isDepositing ? "Depositing..." : "Deposit"}
                  </Button>
                </>
              )}
            </div>

            {actionError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {actionError}
              </div>
            ) : null}
            {actionSuccess ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {actionSuccess}
              </div>
            ) : null}
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
                  onClick={() => setWithdrawAmount(String(poolBalance))}
                >
                  Max
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="rounded-full"
              disabled={!canWithdraw || isWithdrawing}
              onClick={handleWithdraw}
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </Button>
          </CardFooter>
          {withdrawError ? (
            <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {withdrawError}
            </div>
          ) : null}
          {withdrawSuccess ? (
            <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {withdrawSuccess}
            </div>
          ) : null}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
