import { Client, dropsToXrp, Wallet } from "xrpl";
import { FXRPCollateralReservationInstruction, FXRPTransferInstruction } from "@flarenetwork/smart-accounts-encoder";
import { sendXrplPayment } from "./utils/xrpl";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { publicClient } from "./utils/client";
import type { Address, Log } from "viem";
import {
    getInstructionFee,
    getOperatorXrplAddresses,
    getPersonalAccountAddress,
    MASTER_ACCOUNT_CONTROLLER_ADDRESS,
} from "./utils/smart-accounts";
import type { CollateralReservedEventType, FxrpTransferredEventType } from "./utils/event-types";
import { getContractAddressByName } from "./utils/flare-contract-registry";
import { getFxrpBalance, getFxrpDecimals } from "./utils/fassets";

// --- HELPER FUNCTIONS ---

async function reserveCollateral({
    collateralReservationInstruction,
    personalAccountAddress,
    xrplClient,
    xrplWallet,
}: {
    collateralReservationInstruction: FXRPCollateralReservationInstruction;
    personalAccountAddress: string;
    xrplClient: Client;
    xrplWallet: Wallet;
}) {
    const operatorXrplAddress = (await getOperatorXrplAddresses())[0] as string;

    const encodedInstruction = collateralReservationInstruction.encode();
    const instructionFee = await getInstructionFee(encodedInstruction);
    console.log("Instruction fee:", instructionFee);

    const collateralReservationTransaction = await sendXrplPayment({
        destination: operatorXrplAddress,
        amount: instructionFee,
        memos: [{ Memo: { MemoData: encodedInstruction.slice(2) } }],
        wallet: xrplWallet,
        client: xrplClient,
    });
    console.log("Collateral reservation TX:", collateralReservationTransaction.result.hash);

    let collateralReservationEvent: CollateralReservedEventType | undefined;
    let collateralReservationEventFound = false;

    const assetManagerFXRPAddress = await getContractAddressByName("AssetManagerFXRP");

    const unwatchCollateralReserved = publicClient.watchContractEvent({
        address: assetManagerFXRPAddress,
        abi: coston2.iAssetManagerAbi,
        eventName: "CollateralReserved",
        onLogs: (logs) => {
            for (const log of logs) {
                collateralReservationEvent = log as CollateralReservedEventType;
                if (collateralReservationEvent.args.minter.toLowerCase() !== personalAccountAddress.toLowerCase()) {
                    continue;
                }
                collateralReservationEventFound = true;
                break;
            }
        },
    });

    console.log("Waiting for CollateralReserved event...");
    while (!collateralReservationEventFound) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Poll faster (3s)
    }
    unwatchCollateralReserved();

    return collateralReservationEvent;
}

async function sendMintPayment({
    collateralReservationEvent,
    xrplClient,
    xrplWallet,
}: {
    collateralReservationEvent: CollateralReservedEventType;
    xrplClient: Client;
    xrplWallet: Wallet;
}) {
    const valueUBA = collateralReservationEvent.args.valueUBA;
    const feeUBA = collateralReservationEvent.args.feeUBA;
    const paymentAddress = collateralReservationEvent.args.paymentAddress;
    const paymentReference = collateralReservationEvent.args.paymentReference;
    const collateralReservationId = collateralReservationEvent.args.collateralReservationId;

    const mintTransaction = await sendXrplPayment({
        destination: paymentAddress,
        amount: dropsToXrp(valueUBA + feeUBA),
        memos: [{ Memo: { MemoData: paymentReference.slice(2) } }],
        wallet: xrplWallet,
        client: xrplClient,
    });
    console.log("Mint payment TX:", mintTransaction.result.hash);

    let mintingExecutedEvent: Log | undefined;
    let mintingExecutedEventFound = false;

    const assetManagerFXRPAddress = await getContractAddressByName("AssetManagerFXRP");

    console.log("Waiting for MintingExecuted event...");
    const unwatchMintingExecuted = publicClient.watchContractEvent({
        address: assetManagerFXRPAddress,
        abi: coston2.iAssetManagerAbi,
        eventName: "MintingExecuted",
        onLogs: (logs) => {
            for (const log of logs) {
                if (log.args.collateralReservationId !== collateralReservationId) {
                    continue;
                }
                mintingExecutedEvent = log;
                mintingExecutedEventFound = true;
                return;
            }
        },
    });

    while (!mintingExecutedEventFound) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    unwatchMintingExecuted();

    return mintingExecutedEvent;
}

async function transfer({
    transferInstruction,
    personalAccountAddress,
    recipientAddress, // 👈 Added argument
    xrplClient,
    xrplWallet,
}: {
    transferInstruction: FXRPTransferInstruction;
    personalAccountAddress: string;
    recipientAddress: string; // 👈 Added type
    xrplClient: Client;
    xrplWallet: Wallet;
}) {
    const operatorXrplAddress = (await getOperatorXrplAddresses())[0] as string;

    const encodedInstruction = transferInstruction.encode();
    const instructionFee = await getInstructionFee(encodedInstruction);
    console.log("Instruction fee:", instructionFee);

    const transferTransaction = await sendXrplPayment({
        destination: operatorXrplAddress,
        amount: instructionFee,
        memos: [{ Memo: { MemoData: encodedInstruction.slice(2) } }],
        wallet: xrplWallet,
        client: xrplClient,
    });
    console.log("Transfer TX:", transferTransaction.result.hash);

    let fXrpTransferredEvent: FxrpTransferredEventType | undefined;
    let fXrpTransferredEventFound = false;

    const unwatchFxrpTransferred = publicClient.watchContractEvent({
        address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
        abi: coston2.iMasterAccountControllerAbi,
        eventName: "FXrpTransferred",
        onLogs: (logs) => {
            for (const log of logs) {
                fXrpTransferredEvent = log as FxrpTransferredEventType;
                // Verify both sender and recipient match
                if (
                    fXrpTransferredEvent.args.personalAccount.toLowerCase() !== personalAccountAddress.toLowerCase() ||
                    fXrpTransferredEvent.args.to.toLowerCase() !== recipientAddress.toLowerCase()
                ) {
                    continue;
                }
                fXrpTransferredEventFound = true;
                break;
            }
        },
    });

    console.log("Waiting for FXrpTransferred event...");
    while (!fXrpTransferredEventFound) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    unwatchFxrpTransferred();

    return fXrpTransferredEvent;
}

// --- EXPORTED MAIN FUNCTION ---

export async function bridgeXrpToFxrp(xrplSeed: string, recipientAddress: string, lots: number = 1) {
    console.log(`\n🌉 STARTING BRIDGE: ${lots} Lot(s) -> ${recipientAddress}`);

    const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
    await xrplClient.connect();
    const xrplWallet = Wallet.fromSeed(xrplSeed);

    // 1. Setup Personal Account
    const personalAccountAddress = await getPersonalAccountAddress(xrplWallet.address);
    console.log("Personal Account:", personalAccountAddress);

    // 2. Reserve Collateral (Step 1 of Minting)
    const collateralReservationData = {
        walletId: 0,
        value: lots, // Number of lots (1 lot = 10 XRP usually)
        agentVaultId: 1,
    };

    const collateralReservationInstruction = new FXRPCollateralReservationInstruction(collateralReservationData);

    const collateralReservationEvent = await reserveCollateral({
        collateralReservationInstruction,
        personalAccountAddress,
        xrplClient,
        xrplWallet,
    });

    if (!collateralReservationEvent) throw new Error("CollateralReserved event not found");

    // 3. Send Payment (Step 2 of Minting)
    // This returns the event which tells us EXACTLY how much was minted
    const mintingExecutedEvent: any = await sendMintPayment({
        collateralReservationEvent,
        xrplClient,
        xrplWallet,
    });

    const mintedAmount = mintingExecutedEvent.args.mintedAmountUBA;
    console.log(`✅ Minted ${mintedAmount} UBA`);

    // 4. Transfer to Recipient (Flare -> Recipient)
    // We use the exact minted amount for the transfer
    const transferData = {
        walletId: 0,
        value: Number(mintedAmount), // This is a BigInt (10000000n)
        recipientAddress: recipientAddress.slice(2),
    };

    const transferInstruction = new FXRPTransferInstruction(transferData);

    const transferEvent = await transfer({
        transferInstruction,
        personalAccountAddress,
        recipientAddress, // Pass it down
        xrplClient,
        xrplWallet,
    });

    console.log(`🚀 Bridge Complete! Sent to ${recipientAddress}`);

    await xrplClient.disconnect();
    return {
        success: true,
        mintTx: mintingExecutedEvent.transactionHash,
        transferTx: transferEvent?.transactionHash,
    };
}
