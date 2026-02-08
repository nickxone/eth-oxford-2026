import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Image from "next/image"

export function CoverageCapsule() {
  return (
    <Card className="relative overflow-hidden rounded-3xl border border-[#e2e6ee] bg-white/80 shadow-sm backdrop-blur pt-0">
      <div className="relative h-32 overflow-hidden">
        <Image
          src="/singapore.jpg"
          alt="Singapore"
          width={800}
          height={400}
          className="relative z-20 h-full w-full object-cover brightness-60"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-[#5a6472]">
            Coverage Capsule
          </CardTitle>
          <span className="rounded-full border border-[#d7dbe3] px-3 py-1 text-xs text-[#5a6472]">
            Live
          </span>
        </div>
        <CardDescription className="text-xs text-[#7a8493]">
          Parametric protection for real-time flight delays.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-2xl border border-[#e2e6ee] bg-white p-4">
          <p className="text-xs text-[#7a8493]">Trip</p>
          <p className="mt-2 text-lg">Oxford → Dubai</p>
          <p className="text-sm text-[#5a6472]">Delay &gt; 90 min</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#e2e6ee] bg-white p-4">
            <p className="text-xs text-[#7a8493]">Premium</p>
            <p className="mt-2 text-lg">5 XRP</p>
          </div>
          <div className="rounded-2xl border border-[#e2e6ee] bg-white p-4">
            <p className="text-xs text-[#7a8493]">Payout</p>
            <p className="mt-2 text-lg">75 XRP</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-[#e2e6ee] bg-white p-4">
          <div>
            <p className="text-xs text-[#7a8493]">Flight status</p>
            <p className="mt-2 text-sm text-[#5a6472]">
              Awaiting departure
            </p>
          </div>
          <div className="h-10 w-10 rounded-full border border-[#cfd5e0] bg-[radial-gradient(circle,_rgba(72,188,255,0.45),_rgba(247,247,251,0)_65%)]" />
        </div>
      </CardContent>
    </Card>
  )
}
