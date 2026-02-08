import ngrok
import uvicorn
from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

# --- PRE-GENERATED FLIGHT DATA ---
FLIGHT_DATA = {
    # CASE 1: ELIGIBLE FOR PAYOUT (Status="Delayed", Minutes >= 30)
    "BF1234": {"delay_minutes": 210, "status": "Delayed"},  # The Main Demo
    "BA001": {"delay_minutes": 45, "status": "Delayed"},  # Just above threshold
    "LH888": {"delay_minutes": 120, "status": "Delayed"},  # Solid delay
    # CASE 2: REJECTED - DELAY TOO SHORT (Status="Delayed", Minutes < 30)
    "AF777": {"delay_minutes": 15, "status": "Delayed"},  # "Almost"
    "KL002": {"delay_minutes": 29, "status": "Delayed"},  # Heartbreak case
    # CASE 3: REJECTED - ON TIME (Status="On Time", Minutes=0)
    "QA999": {"delay_minutes": 0, "status": "On Time"},
    "US101": {
        "delay_minutes": 5,
        "status": "On Time",
    },  # Small taxi delay, still "On Time"
}


@app.get("/status/{flight_id}")
async def get_status(flight_id: str):
    # Normalise input to uppercase to avoid case-sensitivity issues
    fid = flight_id.upper()

    # Return pre-set data if it exists
    if fid in FLIGHT_DATA:
        data = FLIGHT_DATA[fid]
        return {
            "flightId": fid,
            "delay_minutes": data["delay_minutes"],
            "status": data["status"],
        }

    # Default Fallback: Assume everything else is perfectly On Time
    return {"flightId": fid, "delay_minutes": 0, "status": "On Time"}


if __name__ == "__main__":
    # Setup Ngrok Tunnel
    try:
        listener = ngrok.forward(8000, authtoken_from_env=True)
        print(f"\n==================================================")
        print(f"🚀 FDC PUBLIC URL: {listener.url()}")
        print(f"==================================================")
        print(f"📋 Available Flight Endpoints for Proof Generation:")
        for fid, data in FLIGHT_DATA.items():
            outcome = (
                "✅ PAYOUT"
                if data["delay_minutes"] >= 30 and data["status"] == "Delayed"
                else "❌ REJECT"
            )
            print(
                f"   - {fid}: {data['status']} ({data['delay_minutes']}m) -> {outcome}"
            )
        print(f"==================================================\n")

        # Start Server
        uvicorn.run(app, host="127.0.0.1", port=8000)
    except Exception as e:
        print(f"\n❌ Error starting Ngrok: {e}")
        print("Make sure NGROK_AUTHTOKEN is in your .env file.\n")
