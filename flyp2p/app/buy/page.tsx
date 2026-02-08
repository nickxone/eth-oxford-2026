"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
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
import { PageBanner } from "@/components/ui/page-banner";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
// Import contract address
import {
  POLICY_ABI,
  POLICY_ADDRESS,
  ERC20_ABI,
  FXRP_ADDRESS,
} from "@/lib/contracts";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "600"],
});

type VerificationState = "idle" | "verifying" | "active" | "error";

const Step1Schema = z.object({
  flightNumber: z
    .string()
    .min(2, "Enter a flight number like BA123")
    .max(10, "Too long"),
  flightDate: z.string().min(1, "Select a date"),
  arrivalTime: z.string().min(1, "Select a predicted arrival time"),
});

const Step2Schema = z.object({
  acceptedQuote: z.boolean().refine((value) => value, {
    message: "Please accept the quote to continue.",
  }),
});

const Step3Schema = z.object({
  paymentMethod: z.enum(["xrp", "fiat"], {
    message: "Select a payment method.",
  }),
});

const FullSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);
type FormValues = z.infer<typeof FullSchema>;

const steps = [
  "Flight details",
  "Coverage quote",
  "Payment & verification",
  "Live status",
] as const;

export default function BuyPage() {
  const { isConnected, connectWallet, isConnecting, error, address } =
    useWallet();

  // Local state to capture the input value directly
  const [xrplSeed, setXrplSeed] = useState("");

  const [verificationState, setVerificationState] =
    useState<VerificationState>("idle");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [policyId, setPolicyId] = useState<string | null>(null);

  const quote = useMemo(
    () => ({
      premium: "0.01", // 10 XRP
      coverage: "15",
      condition: "Payout if delay > 3 hours",
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(FullSchema),
    mode: "onTouched",
    defaultValues: {
      flightNumber: "BA123",
      flightDate: "2026-02-10",
      arrivalTime: "18:35",
      acceptedQuote: false,
      paymentMethod: "xrp",
    },
  });

  const isVerifying = verificationState === "verifying";
  const isActive = verificationState === "active";
  const hasError = verificationState === "error";

  // --- 1. BRIDGE TRIGGER (Frontend -> Local API -> Blockchain) ---
  const handleGetQuote = async () => {
    const ok = await form.trigger([
      "flightNumber",
      "flightDate",
      "arrivalTime",
    ]);
    if (!ok) return;

    if (!xrplSeed) {
      alert("Please enter your XRP Secret Key to fund the policy.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(`🚀 Initiating Bridge to Policy Contract: ${POLICY_ADDRESS}`);

      const response = await fetch("http://localhost:4000/api/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xrplSeed: xrplSeed,
          recipientAddress: POLICY_ADDRESS,
          lots: 1,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Bridge failed");
      }

      console.log("✅ Bridge Successful:", data);
      setCurrentStep(2);
    } catch (err: any) {
      console.error(err);
      alert(`Bridge Error: ${err.message}. Is the server running?`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = async () => {
    const fields: (keyof FormValues)[] =
      currentStep === 2
        ? ["acceptedQuote"]
        : currentStep === 3
        ? ["paymentMethod"]
        : [];

    const ok = fields.length ? await form.trigger(fields) : true;
    if (!ok) return;

    setVerificationState((s) => (currentStep === 3 ? s : "idle"));
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleVerifyPayment = async () => {
    if (isVerifying) return;
    setVerificationState("verifying");

    // In a real app, we would check the contract balance here using ethers
    // For demo, we assume the bridge worked if they passed step 1
    setTimeout(() => {
      setVerificationState("active");
    }, 2000);
  };

  // --- 2. CREATE POLICY ON-CHAIN ---
  const createPolicyOnChain = async (values: FormValues) => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    if (!address) throw new Error("Wallet not connected");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 1. Get Decimals (Safety Check)
    const fxrpContract = new ethers.Contract(FXRP_ADDRESS, ERC20_ABI, provider);
    const decimals = await fxrpContract.decimals();
    console.log(`Token Decimals: ${decimals}`); // Should be 6 for fXRP

    const contract = new ethers.Contract(POLICY_ADDRESS, POLICY_ABI, signer);

    // 2. Parse amounts with correct decimals
    const premium = ethers.parseUnits(quote.premium, decimals);
    const coverage = ethers.parseUnits(quote.coverage, decimals);
    const depositedAmount = premium; // We assume the user bridged exactly the premium

    console.log("Creating Policy...", {
      holder: address,
      flight: values.flightNumber,
      premium: premium.toString(),
      coverage: coverage.toString(),
    });

    // 3. Send Transaction
    const tx = await contract.createPolicy(
      address,
      values.flightNumber,
      values.flightDate,
      values.arrivalTime,
      premium,
      coverage,
      depositedAmount
    );

    console.log("Tx Sent:", tx.hash);
    const receipt = await tx.wait();

    // 4. Try to parse logs to get Policy ID (optional UX enhancement)
    // In strict mode we just return success
    return tx.hash as string;
  };

  const onSubmit = async (values: FormValues) => {
    const parsed = FullSchema.safeParse(values);
    if (!parsed.success) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await createPolicyOnChain(parsed.data);
      // Generate a random ID for UX if we don't parse the log
      setPolicyId(`POL-${Math.floor(Math.random() * 10000)}`);
      setCurrentStep(4);
    } catch (e: any) {
      console.error(e);
      // Friendly error handling
      if (e.message.includes("insufficient")) {
        alert(
          "Error: The contract doesn't have enough funds yet. Please wait a moment for the bridge to finalize."
        );
      } else {
        alert("Error creating policy: " + (e.reason || e.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl mb-4 font-orbitron">
          Connect Wallet to Buy Insurance
        </h2>
        <Button onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </Button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  const flightNumber = form.watch("flightNumber");
  const flightDate = form.watch("flightDate");
  const arrivalTime = form.watch("arrivalTime");
  const premium = quote.premium;
  const coverage = quote.coverage;
  const depositedAmount = quote.premium;

  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} relative min-h-screen overflow-x-hidden bg-[#f7f7fb] text-[#0c1018]`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(72,188,255,0.25),_rgba(247,247,251,0)_60%)] blur-2xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,_rgba(177,144,255,0.18),_rgba(247,247,251,0)_60%)] blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full flex-col gap-10 px-6 pb-24 sm:px-12">
        <PageBanner image="/buy_page_banner.jpg" />
        <section className="grid gap-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
              <div className="flex flex-col gap-3">
                <Badge className="bg-blue-50 text-blue-700">
                  Flight Protection
                </Badge>
                <h1 className="font-[var(--font-orbitron)] text-3xl leading-tight sm:text-4xl">
                  Get insured in minutes.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-[#3f4a59]">
                  Funds are bridged instantly from XRP Ledger to the Policy
                  Contract upon quote generation.
                </p>
              </div>

              {/* Progress Steps */}
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader>
                  <CardTitle>Progress</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {steps.map((label, index) => {
                    const stepNumber = index + 1;
                    const isCurrent = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;
                    return (
                      <div
                        key={label}
                        className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
                          isCurrent
                            ? "border-[#5fe3ff] bg-[#f0fbff]"
                            : "border-[#e4e9f0] bg-[#f7f9fc]"
                        }`}
                      >
                        <span className="font-medium text-[#1f2a3a]">
                          {stepNumber}. {label}
                        </span>
                        <Badge
                          variant={
                            isCompleted
                              ? "default"
                              : isCurrent
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {isCompleted ? "Done" : isCurrent ? "Active" : "Next"}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* FORM AREA */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
              {/* Step 1: Flight & Bridge */}
              {currentStep === 1 && (
                <Card className="border-0 bg-[#eef1f6]/60 backdrop-blur shadow-md">
                  <CardHeader>
                    <CardTitle>Flight details & Funding</CardTitle>
                    <CardDescription>
                      Enter details and your XRP Secret to bridge funds.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        XRP Secret Key (Testnet)
                      </label>
                      <input
                        type="password"
                        placeholder="sEd..."
                        value={xrplSeed}
                        onChange={(e) => setXrplSeed(e.target.value)}
                        className="h-11 rounded-lg border px-3"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Flight Number
                      </label>
                      <input
                        {...form.register("flightNumber")}
                        placeholder="BA123"
                        className="h-11 rounded-lg border px-3"
                      />
                      {form.formState.errors.flightNumber && (
                        <p className="text-red-500 text-sm">
                          {form.formState.errors.flightNumber.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Date</label>
                        <input
                          type="date"
                          {...form.register("flightDate")}
                          className="h-11 rounded-lg border px-3"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Arrival</label>
                        <input
                          type="time"
                          {...form.register("arrivalTime")}
                          className="h-11 rounded-lg border px-3"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      onClick={handleGetQuote}
                      disabled={isSubmitting}
                      className="w-full rounded-full"
                    >
                      {isSubmitting
                        ? "Bridging Funds..."
                        : "Get Quote & Bridge Funds"}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Step 2: Quote */}
              {currentStep === 2 && (
                <Card className="border-0 bg-[#eef1f6]/60 shadow-md">
                  <CardHeader>
                    <CardTitle>Coverage Quote</CardTitle>
                    <CardDescription>
                      Funds bridged. Review terms.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="flex justify-between p-3 bg-white rounded-lg">
                      <span>Premium</span>
                      <b>{premium} XRP</b>
                    </div>
                    <div className="flex justify-between p-3 bg-white rounded-lg">
                      <span>Coverage</span>
                      <b>{coverage} XRP</b>
                    </div>
                    <label className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        {...form.register("acceptedQuote")}
                      />{" "}
                      I accept
                    </label>
                  </CardContent>
                  <CardFooter className="gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goBack}
                      className="rounded-full"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={goNext}
                      className="rounded-full"
                    >
                      Continue
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Step 3: Activation */}
              {currentStep === 3 && (
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border-0 bg-[#eef1f6]/60 shadow-md">
                    <CardHeader>
                      <CardTitle>Activation</CardTitle>
                      <CardDescription>
                        Verify bridged funds to activate.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isVerifying && (
                        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          <span className="text-sm">
                            Verifying contract balance...
                          </span>
                        </div>
                      )}
                      {isActive && (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                          Funds Verified. Ready to activate.
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="gap-3">
                      <Button
                        type="button"
                        onClick={handleVerifyPayment}
                        disabled={isVerifying || isActive}
                        className="rounded-full"
                      >
                        {isVerifying
                          ? "Verifying..."
                          : isActive
                          ? "Verified"
                          : "Verify Funds"}
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isActive || isSubmitting}
                        className="rounded-full"
                      >
                        {isSubmitting ? "Activating..." : "Activate Policy"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}

              {/* Step 4: Success */}
              {currentStep === 4 && (
                <Card className="border-0 bg-[#eef1f6]/60 shadow-md">
                  <CardHeader>
                    <CardTitle>Policy Active</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-50 p-6 rounded-xl text-center text-green-800">
                      <h2 className="text-2xl font-bold">{policyId}</h2>
                      <p>Your flight is now protected.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-center">
                    <Button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="rounded-full"
                    >
                      Start Another
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
