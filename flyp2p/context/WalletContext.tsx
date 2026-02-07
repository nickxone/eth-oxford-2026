"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { Wallet } from 'ethers';
import { error } from 'console';

declare global { interface Window { ethereum?: any; } }

interface WalletContextType {
    address: string | undefined;
    connectWallet: () => Promise<void>; 
    switchToCoston2: () => Promise<void>;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

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
    
export function WalletProvider({ children }: {children: ReactNode}) {
    const [address, setAddress] = useState<string | undefined>(undefined);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const switchToCoston2 = async () => {
        if (!window.ethereum) {
            setError("Install MetaMask");
            return;
        }
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
                const message = err?.message ?? "Failed to switch network";
                setError(message);
                throw err;
            }
        }
    };

    const connectWallet = async () => {
        if (isConnecting) return;
        if (!window.ethereum) {
            alert("Install MetaMask");
            return;
        }
        setIsConnecting(true);
        setError(null);
        try {
            await switchToCoston2();
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            setAddress(accounts[0]);
        } catch (err: any) {
            const message = err?.message ?? "Wallet connection failed";
            setError(message);
        } finally {
            setIsConnecting(false);
        }
    };

    useEffect(() => {
        // Autoconnect if already trusted 
        if (window.ethereum) {
            window.ethereum.request({ method: "eth_accounts" })
                .then((accounts: string[]) => {
                    if (accounts.length > 0) setAddress(accounts[0]);
                });

            // Ensure we are on Coston2 on load
            const provider = new ethers.BrowserProvider(window.ethereum);
            provider.getNetwork().then((network) => {
                if (network.chainId !== 114n) {
                    switchToCoston2().catch(() => undefined);
                }
            });

            // Add binding to handle event change
            window.ethereum.on("accountsChanged", (accs: string[]) => {
                setAddress(accs.length > 0 ? accs[0] : undefined);
            });

            window.ethereum.on("chainChanged", (chainId: string) => {
                if (chainId !== COSTON2.chainId) {
                    switchToCoston2().catch(() => undefined);
                }
            });
        }
    }, []);
    
    return (
        <WalletContext.Provider value={{ address, connectWallet, switchToCoston2, isConnected: !!address, isConnecting, error }}>
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) throw new Error("useWallet Error");
    return context;
}


