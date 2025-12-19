from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    GenerateRequest, GenerateResponse,
    ChatRequest, ChatResponse,
    ConversationResponse, ProviderListResponse
)
from app.services.llm_service import llm_service
from app.services.database_service import db_service
from typing import List

router = APIRouter()


@router.get("/providers", response_model=ProviderListResponse)
async def get_providers():
    """Get list of available LLM and database providers"""
    return ProviderListResponse(
        llm_providers=llm_service.list_providers(),
        database_providers=db_service.list_databases()
    )


@router.post("/generate", response_model=GenerateResponse)
async def generate_text(request: GenerateRequest):
    """Generate text using specified LLM provider"""
    try:
        kwargs = {}
        if request.model:
            kwargs["model"] = request.model
        if request.temperature:
            kwargs["temperature"] = request.temperature
        if request.max_tokens:
            kwargs["max_tokens"] = request.max_tokens
        
        text = await llm_service.generate(request.provider, request.prompt, **kwargs)
        return GenerateResponse(
            text=text,
            provider=request.provider,
            model=request.model
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating text: {str(e)}")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat completion with message history"""
    try:
        kwargs = {}
        if request.model:
            kwargs["model"] = request.model
        if request.temperature:
            kwargs["temperature"] = request.temperature
        if request.max_tokens:
            kwargs["max_tokens"] = request.max_tokens
        
        # Convert messages to dict format
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        response_text = await llm_service.chat(request.provider, messages, **kwargs)
        
        conversation_id = None
        if request.save_to_db:
            # Add assistant response to messages
            messages.append({"role": "assistant", "content": response_text})
            conversation_id = await db_service.save_conversation(
                request.db_type,
                request.user_id,
                request.provider,
                messages
            )
        
        return ChatResponse(
            message=response_text,
            provider=request.provider,
            conversation_id=conversation_id,
            model=request.model
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in chat: {str(e)}")


@router.get("/conversations/{db_type}/{user_id}", response_model=List[ConversationResponse])
async def list_conversations(db_type: str, user_id: str, limit: int = 10):
    """List conversations for a user"""
    try:
        conversations = await db_service.list_conversations(db_type, user_id, limit)
        return [ConversationResponse(**conv) for conv in conversations]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing conversations: {str(e)}")


@router.get("/conversations/{db_type}/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(db_type: str, conversation_id: str):
    """Get a specific conversation"""
    try:
        conversation = await db_service.get_conversation(db_type, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return ConversationResponse(**conversation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting conversation: {str(e)}")
