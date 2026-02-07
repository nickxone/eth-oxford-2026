import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ flight_id: string }> }
  ) {
  const { flight_id } = await params;
  return NextResponse.json({
    flight_id: flight_id,
    delay_minutes: 120,
    status: "Delayed",
  });
}
