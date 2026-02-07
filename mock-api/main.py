import ngrok
import uvicorn
import os
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

@app.get("/status/{flight_id}")
async def get_status(flight_id: str):
    return {"flightId": flight_id, "delay_minutes": 210, "status": "Delayed"}

if __name__ == "__main__":
    # This creates the tunnel automatically
    # Requires NGROK_AUTHTOKEN in your .env file
    listener = ngrok.forward(8000, authtoken_from_env=True)
    print(f"\n🚀 FDC PUBLIC URL: {listener.url()}\n")
    
    uvicorn.run(app, host="127.0.0.1", port=8000)