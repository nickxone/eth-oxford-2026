import Link from "next/link";
import { Space_Grotesk, Orbitron } from "next/font/google";
import { Navbar } from "@/components/ui/navbar";
import { CoverageCapsule } from "@/components/landing/coverage_capsule";
import { Button } from "@/components/ui/button"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "600"],
});

export default function Home() {
  return (
    <div
      className={`${spaceGrotesk.variable} ${orbitron.variable} min-h-screen overflow-x-hidden bg-[#f7f7fb] text-[#0c1018]`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(72,188,255,0.25),_rgba(247,247,251,0)_60%)] blur-2xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,_rgba(177,144,255,0.18),_rgba(247,247,251,0)_60%)] blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full flex-col gap-16 px-12 pb-24 pt-5 sm:pt-5">
        <header className="flex items-center justify-center">
          {/* <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[conic-gradient(from_210deg,_#5fe3ff,_#7cfdb6,_#a478ff,_#5fe3ff)] p-[1px]">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#f7f7fb] font-[var(--font-orbitron)] text-sm tracking-[0.2em]">
                FP
              </div>
            </div>
            <div>
              <p className="font-[var(--font-orbitron)] text-xs uppercase tracking-[0.35em] text-[#5a6472]">
                FlyP2P
              </p>
              <p className="text-sm text-[#2a3240]">P2P Flight Insurance</p>
            </div>
          </div> */}
          <div className="hidden sm:block">
            <Navbar />
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <h1 className="font-[var(--font-orbitron)] text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Autonomous flight cover that settles in minutes.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#3f4a59] sm:text-lg">
              FlyP2P is a minimalist, future-forward insurance layer on Flare. Pool
              capital with travelers, lock coverage on-chain, and trigger payouts
              automatically from flight status data.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/buy">
                <Button className="rounded-full cursor-pointer">Launch Coverage</Button>
              </Link>
              <Button variant="outline" className="rounded-full cursor-pointer">View Protocol Deck</Button>
            </div>
          </div>

          <CoverageCapsule />
        </section>

      </main>
    </div>
  );
}
