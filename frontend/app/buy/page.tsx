"use client";

import { useMemo, useState } from "react";
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
});

const Step2Schema = z.object({
  // you can add user-selectable coverage fields later (tier, coverage amount, etc.)
  acceptedQuote: z.literal(true, {
    errorMap: () => ({ message: "Please accept the quote to continue." }),
  }),
});

const Step3Schema = z.object({
  paymentMethod: z.enum(["xrp", "fiat"], { message: "Select a payment method." }),
  // demo fields, replace with your real inputs later
  paymentReference: z.string().min(3, "Enter the memo/reference used."),
});

const FullSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);
type FormValues = z.infer<typeof FullSchema>;

const steps = ["Flight details", "Coverage quote", "Payment & verification", "Live status"] as const;

export default function BuyPage() {
  const { isConnected, connectWallet, isConnecting, error } = useWallet();

  const [verificationState, setVerificationState] =
    useState<VerificationState>("idle");

  const [currentStep, setCurrentStep] = useState(1);

  const quote = useMemo(
    () => ({
      premium: "£5",
      coverage: "£150",
      condition: "Payout if delay > 3 hours",
    }),
    []
  );

  // Per-step resolver (only validates current step)
  const stepResolver = useMemo(() => {
    if (currentStep === 1) return zodResolver(Step1Schema);
    if (currentStep === 2) return zodResolver(Step2Schema);
    if (currentStep === 3) return zodResolver(Step3Schema);
    // step 4 is display-only
    return zodResolver(FullSchema);
  }, [currentStep]);

  const form = useForm<FormValues>({
    resolver: stepResolver,
    mode: "onTouched",
    defaultValues: {
      flightNumber: "BA123",
      flightDate: "2026-02-10",
      acceptedQuote: false,
      paymentMethod: "xrp",
      paymentReference: "12345",
    },
  });

  const isVerifying = verificationState === "verifying";
  const isActive = verificationState === "active";
  const hasError = verificationState === "error";

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

  const goNext = async () => {
    // Validate only fields relevant to the step
    const fields: (keyof FormValues)[] =
      currentStep === 1
        ? ["flightNumber", "flightDate"]
        : currentStep === 2
        ? ["acceptedQuote"]
        : currentStep === 3
        ? ["paymentMethod", "paymentReference"]
        : [];

    const ok = fields.length ? await form.trigger(fields) : true;
    if (!ok) return;

    setVerificationState((s) => (currentStep === 3 ? s : "idle"));
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleVerifyPayment = () => {
    if (isVerifying) return;
    setVerificationState("verifying");

    window.setTimeout(() => {
      // demo: assume success
      setVerificationState("active");
    }, 1200);
  };

  const onSubmit = async (values: FormValues) => {
    // Final validation on everything
    const parsed = FullSchema.safeParse(values);
    if (!parsed.success) return;

    // call your API (example)
    await fetch("/api/policy/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.data,
        quote,
        verificationState,
      }),
    });

    setCurrentStep(4);
  };

  const flightNumber = form.watch("flightNumber");
  const flightDate = form.watch("flightDate");

  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} relative min-h-screen overflow-x-hidden bg-[#f7f7fb] text-[#0c1018]`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(72,188,255,0.25),_rgba(247,247,251,0)_60%)] blur-2xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,_rgba(177,144,255,0.18),_rgba(247,247,251,0)_60%)] blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full flex-col gap-10 px-6 pb-24 sm:px-12">
        <PageBanner
          image="/buy_page_banner.jpg"
        />
        <section className="grid gap-6">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
              <div className="flex flex-col gap-3">
                <Badge className="bg-blue-50 text-blue-700">Flight Protection</Badge>
                <h1 className="font-[var(--font-orbitron)] text-3xl leading-tight sm:text-4xl">
                  Get insured in minutes with instant crypto payout for flight delays.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-[#3f4a59]">
                  Lock coverage on-chain, fund with fiat or crypto, and verify your payment through Flare Data Connector.
                </p>
              </div>

              {/* Progress */}
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader>
                  <CardTitle>Progress</CardTitle>
                  <CardDescription>Complete each step in order.</CardDescription>
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
                          variant={isCompleted ? "default" : isCurrent ? "secondary" : "outline"}
                        >
                          {isCompleted ? "Done" : isCurrent ? "Active" : "Next"}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* SINGLE FORM WRAPS ALL STEPS */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
              {/* Step 1 */}
              {currentStep === 1 ? (
                <Card className="border-0 bg-[#eef1f6]/60 backdrop-blur shadow-md">
                  <CardHeader>
                    <CardTitle>Flight details</CardTitle>
                    <CardDescription>Enter your flight to calculate a quote.</CardDescription>
                  </CardHeader>

                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-[#1a2333]">
                        Airline code + flight number
                      </label>
                      <input
                        {...form.register("flightNumber")}
                        placeholder="BA123"
                        className="h-11 rounded-lg border border-[#dfe3ea] bg-transparent px-3 text-sm text-[#0c1018] shadow-sm outline-none transition focus:border-[#5fe3ff]"
                      />
                      {form.formState.errors.flightNumber?.message ? (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.flightNumber.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-[#1a2333]">Flight date</label>
                      <input
                        type="date"
                        {...form.register("flightDate")}
                        className="h-11 rounded-lg border border-[#dfe3ea] bg-transparent px-3 text-sm text-[#0c1018] shadow-sm outline-none transition focus:border-[#5fe3ff]"
                      />
                      {form.formState.errors.flightDate?.message ? (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.flightDate.message}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-wrap gap-3">
                    <Button type="button" className="rounded-full" onClick={goNext}>
                      Get Quote
                    </Button>
                  </CardFooter>
                </Card>
              ) : null}

              {/* Step 2 */}
              {currentStep === 2 ? (
                <Card className="border-0 bg-[#eef1f6]/60 shadow-md">
                  <CardHeader>
                    <CardTitle>Coverage quote</CardTitle>
                    <CardDescription>Review your protection.</CardDescription>
                  </CardHeader>

                  <CardContent className="grid gap-4 text-sm text-[#1f2a3a]">
                    <div className="flex items-center justify-between rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                      <span>Premium</span>
                      <span className="text-base font-semibold text-[#0c1018]">
                        {quote.premium}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                      <span>Coverage amount</span>
                      <span className="text-base font-semibold text-[#0c1018]">
                        {quote.coverage}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">
                        Condition
                      </p>
                      <p className="mt-2 font-medium text-[#0c1018]">{quote.condition}</p>
                    </div>

                    <label className="flex items-center gap-2 rounded-xl border border-[#e4e9f0] bg-transparent px-4 py-3">
                      <input type="checkbox" {...form.register("acceptedQuote")} />
                      <span>I accept this quote</span>
                    </label>
                    {form.formState.errors.acceptedQuote?.message ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.acceptedQuote.message}
                      </p>
                    ) : null}
                  </CardContent>

                  <CardFooter className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" className="rounded-full" onClick={goBack}>
                      Back
                    </Button>
                    <Button type="button" className="rounded-full" onClick={goNext}>
                      Continue to Payment
                    </Button>
                  </CardFooter>
                </Card>
              ) : null}

              {/* Step 3 */}
              {currentStep === 3 ? (
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border-0 bg-[#eef1f6]/60 shadow-md">
                    <CardHeader>
                      <CardTitle>Payment & verification</CardTitle>
                      <CardDescription>
                        Send funds, then verify on Flare to activate coverage.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-4">
                      {/* Payment method */}
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-[#1a2333]">
                          Payment method
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <label className="flex items-center gap-2 rounded-full border px-4 py-2">
                            <input
                              type="radio"
                              value="xrp"
                              {...form.register("paymentMethod")}
                            />
                            XRP
                          </label>
                          <label className="flex items-center gap-2 rounded-full border px-4 py-2">
                            <input
                              type="radio"
                              value="fiat"
                              {...form.register("paymentMethod")}
                            />
                            Fiat (UK bank transfer)
                          </label>
                        </div>
                        {form.formState.errors.paymentMethod?.message ? (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.paymentMethod.message}
                          </p>
                        ) : null}
                      </div>

                      {/* Instructions (same as yours) */}
                      <div className="rounded-xl border border-dashed border-[#cfd6df] bg-[#f7f9fc] p-4 text-sm text-[#1f2a3a]">
                        <p className="font-semibold">Hackathon demo</p>
                        <p>Send 10 XRP to address `rFooBar...` with memo `12345`.</p>
                      </div>
                      <div className="rounded-xl border border-dashed border-[#cfd6df] bg-[#f7f9fc] p-4 text-sm text-[#1f2a3a]">
                        <p className="font-semibold">Bank transfer (UK)</p>
                        <p>Sort code: 11-22-33</p>
                        <p>Account number: 12345678</p>
                      </div>

                      {/* Reference input */}
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-[#1a2333]">
                          Memo / reference used
                        </label>
                        <input
                          {...form.register("paymentReference")}
                          className="h-11 rounded-lg border border-[#dfe3ea] bg-transparent px-3 text-sm text-[#0c1018] shadow-sm outline-none transition focus:border-[#5fe3ff]"
                          placeholder="12345"
                        />
                        {form.formState.errors.paymentReference?.message ? (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.paymentReference.message}
                          </p>
                        ) : null}
                      </div>

                      {isVerifying ? (
                        <div className="flex items-center gap-3 rounded-lg border border-[#dde4ee] bg-white px-3 py-2 text-sm text-[#3f4a59]">
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#5fe3ff]" />
                          Verifying payment on Flare Network...
                        </div>
                      ) : null}

                      {hasError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          Payment not found, please check amount and retry.
                        </div>
                      ) : null}
                    </CardContent>

                    <CardFooter className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={goBack}
                      >
                        Back
                      </Button>

                      <Button
                        type="button"
                        className="rounded-full"
                        onClick={handleVerifyPayment}
                        disabled={isVerifying}
                      >
                        {isVerifying ? "Verifying..." : "Verify Payment"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setVerificationState("error")}
                      >
                        Simulate Error
                      </Button>

                      {/* Final submit */}
                      <Button type="submit" variant="secondary" className="rounded-full">
                        Submit & Continue
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="border-0 bg-[#eef1f6]/60 shadow-md">
                    <CardHeader>
                      <CardTitle>Coverage snapshot</CardTitle>
                      <CardDescription>Always-visible summary.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm text-[#1f2a3a]">
                      <div className="flex items-center justify-between rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                        <span>Flight</span>
                        <span className="text-base font-semibold text-[#0c1018]">
                          {flightNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                        <span>Date</span>
                        <span className="text-base font-semibold text-[#0c1018]">
                          {flightDate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                        <span>Premium</span>
                        <span className="text-base font-semibold text-[#0c1018]">
                          {quote.premium}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                        <span>Coverage</span>
                        <span className="text-base font-semibold text-[#0c1018]">
                          {quote.coverage}
                        </span>
                      </div>
                      <div className="rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">
                          Condition
                        </p>
                        <p className="mt-2 font-medium text-[#0c1018]">
                          {quote.condition}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter>
                    </CardFooter>
                  </Card>
                </div>
              ) : null}

              {/* Step 4 (display-only) */}
              {currentStep === 4 ? (
                <Card className="border-0 bg-[#eef1f6]/60 shadow-md">
                  <CardHeader>
                    <CardTitle>Live status</CardTitle>
                    <CardDescription>Policy lifecycle tracker.</CardDescription>
                  </CardHeader>

                  <CardContent className="grid gap-4 text-sm text-[#1f2a3a]">
                    <div className="flex items-center justify-between rounded-lg border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-2">
                      <span>Quote created</span>
                      <Badge variant="secondary">Ready</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-2">
                      <span>Payment verification</span>
                      <Badge variant={isVerifying ? "default" : "outline"}>
                        {isVerifying ? "In progress" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-[#e4e9f0] bg-[#f7f9fc] px-4 py-2">
                      <span>Coverage active</span>
                      <Badge variant={isActive ? "default" : "outline"}>
                        {isActive ? "Live" : "Awaiting"}
                      </Badge>
                    </div>

                    <div className="grid gap-2 rounded-xl border border-[#e4e9f0] bg-[#f7f9fc] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">
                          Flight
                        </span>
                        <span className="font-medium text-[#0c1018]">{flightNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">
                          Date
                        </span>
                        <span className="font-medium text-[#0c1018]">{flightDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.3em] text-[#6b7482]">
                          Coverage
                        </span>
                        <span className="font-medium text-[#0c1018]">{quote.coverage}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" className="rounded-full" onClick={goBack}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() => {
                        form.reset();
                        setVerificationState("idle");
                        setCurrentStep(1);
                      }}
                    >
                      Start another quote
                    </Button>
                  </CardFooter>
                </Card>
              ) : null}
            </form>
          </div>

        </section>
      </main>
    </div>
  );
}
