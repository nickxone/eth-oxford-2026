"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { Wallet } from 'ethers';
import { error } from 'console';

declare global { interface Window { ethereum?: any; } }

interface WalletContextType {
    address: string | undefined;
    connectWallet: () => Promise<void>; 
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
    
export function WalletProvider({ children }: {children: ReactNode}) {
    const [address, setAddress] = useState<string | undefined>(undefined);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connectWallet = async () => {
        if (isConnecting) return;
        if (!window.ethereum) {
            alert("Install MetaMask");
            return;
        }
        setIsConnecting(true);
        setError(null);
        try {
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

            // Add binding to handle event change
            window.ethereum.on("accountsChanged", (accs: string[]) => {
                setAddress(accs.length > 0 ? accs[0] : undefined);
            })
        }
    }, []);
    
    return (
        <WalletContext.Provider value={{ address, connectWallet, isConnected: !!address, isConnecting, error }}>
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) throw new Error("useWallet Error");
    return context;
}


