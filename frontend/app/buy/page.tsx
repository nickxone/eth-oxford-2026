"use client";

import { useWallet } from "@/context/WalletContext";

export default function BuyPage() {
  const { isConnected, connectWallet, isConnecting, error } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl mb-4">Connect Wallet to Buy Insurance</h2>
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      {/* The actual Flight Form goes here */}
      <h1>Buy Flight Insurance</h1>
    </div>
  );
}
