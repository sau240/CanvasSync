import os
import traceback
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

# Support both OPENAI_API_KEY and OPEN_API_KEY
api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatPayload(BaseModel):
    messages: list[ChatMessage]


@router.get("/chat-health")
async def chat_health():
    return {
        "status": "online",
        "service": "CanvasSync Chatbot API",
        "api_key_configured": bool(os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_API_KEY")),
    }


@router.post("/chat")
async def chat_with_ai(payload: ChatPayload):
    try:
        global client
        if not client:
            current_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_API_KEY")
            if current_key:
                client = OpenAI(api_key=current_key)
            else:
                raise HTTPException(
                    status_code=500,
                    detail="OpenAI API key is missing. Please set OPENAI_API_KEY or OPEN_API_KEY in your .env file.",
                )

        formatted_messages = [
            {"role": msg.role, "content": msg.content} for msg in payload.messages
        ]

        system_prompt = {
            "role": "system",
            "content": (
                "You are the helpful AI customer support assistant for CanvasSync, "
                "a modern real-time collaborative document and canvas design platform. "
                "Help users with questions about creating rooms, drawing tools, layers, "
                "real-time collaboration, exporting, and account management. Keep answers concise, clear, and friendly."
            ),
        }
        formatted_messages.insert(0, system_prompt)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=formatted_messages,
        )
        reply = response.choices[0].message.content
        return {"reply": reply}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with AI Server: {str(e)}",
        )


app = FastAPI(title="CanvasSync AI Support Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "CanvasSync Chatbot API",
        "api_key_configured": bool(os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_API_KEY")),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("chat_bot:app", host="0.0.0.0", port=5000, reload=True)