"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import {
  type PoolReadout,
  readPoolContracts,
} from "@/lib/helpers/pool";
import { approveFxrp, depositToPool } from "@/lib/helpers/writes";

const COSTON2 = {
  chainId: "0x72", // 114
  chainName: "Flare Coston2",
  rpcUrls: ["https://coston2-api.flare.network/ext/C/rpc"],
  nativeCurrency: {
    name: "Coston2 Flare",
    symbol: "C2FLR",
    decimals: 18,
  },
  blockExplorerUrls: ["https://coston2-explorer.flare.network"],
};

export default function Coston2TestPage() {
  const { address, isConnected, connectWallet, isConnecting } = useWallet();
  const [walletChainId, setWalletChainId] = useState<string | null>(null);
  const [readout, setReadout] = useState<PoolReadout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [depositAmount, setDepositAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const switchToCoston2 = useCallback(async () => {
    if (!window.ethereum) {
      setError("No injected wallet found (MetaMask).");
      return;
    }
    setError(null);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: COSTON2.chainId }],
      });
    } catch (err: any) {
      if (err?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [COSTON2],
        });
      } else {
        throw err;
      }
    }
  }, []);

  const checkWalletNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setError("No injected wallet found (MetaMask).");
      return;
    }
    setError(null);
    const provider = new (await import("ethers")).ethers.BrowserProvider(
      window.ethereum
    );
    const network = await provider.getNetwork();
    setWalletChainId(network.chainId.toString());
  }, []);

  const readContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await readPoolContracts(address);
      setReadout(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to read contracts.");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const handleDeposit = useCallback(async () => {
    setIsWriting(true);
    setError(null);
    setTxStatus(null);
    try {
      const approveReceipt = await approveFxrp(depositAmount);
      setTxStatus(`Approval confirmed in tx ${approveReceipt?.hash ?? ""}`.trim());
      const depositReceipt = await depositToPool(depositAmount);
      setTxStatus(`Deposit confirmed in tx ${depositReceipt?.hash ?? ""}`.trim());
    } catch (err: any) {
      setError(err?.message ?? "Deposit failed.");
    } finally {
      setIsWriting(false);
    }
  }, [depositAmount]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Coston2 Contract Test</h1>
        <p className="text-sm text-muted-foreground">
          Quick smoke test to confirm RPC connectivity and contract reads.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        {!isConnected ? (
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <div className="text-sm">
            Connected: <span className="font-mono">{address}</span>
          </div>
        )}
        <button
          className="rounded-md border border-black px-4 py-2 text-sm"
          onClick={switchToCoston2}
        >
          Switch to Coston2
        </button>
        <button
          className="rounded-md border border-black px-4 py-2 text-sm"
          onClick={checkWalletNetwork}
        >
          Check Wallet Network
        </button>
        <button
          className="rounded-md border border-black px-4 py-2 text-sm"
          onClick={readContracts}
          disabled={isLoading}
        >
          {isLoading ? "Reading..." : "Read Contracts"}
        </button>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <input
          className="w-28 rounded-md border border-black px-3 py-2 text-sm"
          value={depositAmount}
          onChange={(event) => setDepositAmount(event.target.value)}
          placeholder="Amount"
        />
        <button
          className="rounded-md border border-black px-4 py-2 text-sm"
          onClick={handleDeposit}
          disabled={isWriting}
        >
          {isWriting ? "Depositing..." : "Deposit to Pool"}
        </button>
        <span className="text-xs text-muted-foreground">
          Requires FXRP approval first.
        </span>
      </section>

      {walletChainId ? (
        <div className="text-sm">
          Wallet chain id: <span className="font-mono">{walletChainId}</span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {txStatus ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {txStatus}
        </div>
      ) : null}

      <section className="rounded-lg border border-gray-200 p-4 text-sm">
        <div className="grid gap-2">
          <div>
            RPC chain id:{" "}
            <span className="font-mono">{readout?.rpcChainId ?? "-"}</span>
          </div>
          <div>
            RPC latest block:{" "}
            <span className="font-mono">{readout?.rpcBlock ?? "-"}</span>
          </div>
          <div>
            FXRP symbol/decimals:{" "}
            <span className="font-mono">
              {readout?.fxrpSymbol ?? "-"} /{" "}
              {readout?.fxrpDecimals ?? "-"}
            </span>
          </div>
          <div>
            Pool available liquidity:{" "}
            <span className="font-mono">{readout?.poolAvailable ?? "-"}</span>
          </div>
          <div>
            Pool total locked:{" "}
            <span className="font-mono">{readout?.poolTotalLocked ?? "-"}</span>
          </div>
          <div>
            Pool total shares:{" "}
            <span className="font-mono">{readout?.poolTotalShares ?? "-"}</span>
          </div>
          <div>
            Wallet FXRP balance:{" "}
            <span className="font-mono">{readout?.walletFxrpBalance ?? "-"}</span>
          </div>
          <div>
            Wallet FXRP allowance to pool:{" "}
            <span className="font-mono">
              {readout?.walletFxrpAllowance ?? "-"}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
