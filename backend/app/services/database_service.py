from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility
from app.core.config import settings
import json
from datetime import datetime

Base = declarative_base()


# PostgreSQL Models
class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    provider = Column(String)
    messages = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)


class DatabaseProvider(ABC):
    """Abstract base class for database providers"""
    
    @abstractmethod
    async def save_conversation(self, user_id: str, provider: str, messages: List[Dict]) -> str:
        """Save a conversation"""
        pass
    
    @abstractmethod
    async def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """Get a conversation by ID"""
        pass
    
    @abstractmethod
    async def list_conversations(self, user_id: str, limit: int = 10) -> List[Dict]:
        """List conversations for a user"""
        pass


class PostgreSQLProvider(DatabaseProvider):
    """PostgreSQL Database Provider"""
    
    def __init__(self):
        if not all([settings.POSTGRES_HOST, settings.POSTGRES_USER, settings.POSTGRES_PASSWORD, settings.POSTGRES_DB]):
            raise ValueError("PostgreSQL configuration incomplete")
        
        self.engine = create_engine(
            f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
            f"{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    async def save_conversation(self, user_id: str, provider: str, messages: List[Dict]) -> str:
        session = self.SessionLocal()
        try:
            conversation = Conversation(
                user_id=user_id,
                provider=provider,
                messages=json.dumps(messages)
            )
            session.add(conversation)
            session.commit()
            session.refresh(conversation)
            return str(conversation.id)
        finally:
            session.close()
    
    async def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        session = self.SessionLocal()
        try:
            conversation = session.query(Conversation).filter(Conversation.id == int(conversation_id)).first()
            if conversation:
                return {
                    "id": conversation.id,
                    "user_id": conversation.user_id,
                    "provider": conversation.provider,
                    "messages": json.loads(conversation.messages),
                    "created_at": conversation.created_at.isoformat()
                }
            return None
        finally:
            session.close()
    
    async def list_conversations(self, user_id: str, limit: int = 10) -> List[Dict]:
        session = self.SessionLocal()
        try:
            conversations = session.query(Conversation).filter(
                Conversation.user_id == user_id
            ).order_by(Conversation.created_at.desc()).limit(limit).all()
            
            return [{
                "id": conv.id,
                "user_id": conv.user_id,
                "provider": conv.provider,
                "messages": json.loads(conv.messages),
                "created_at": conv.created_at.isoformat()
            } for conv in conversations]
        finally:
            session.close()


class MongoDBProvider(DatabaseProvider):
    """MongoDB Database Provider"""
    
    def __init__(self):
        if not settings.MONGODB_URL:
            raise ValueError("MongoDB URL not configured")
        
        self.client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.client[settings.MONGODB_DB]
        self.collection = self.db.conversations
    
    async def save_conversation(self, user_id: str, provider: str, messages: List[Dict]) -> str:
        conversation = {
            "user_id": user_id,
            "provider": provider,
            "messages": messages,
            "created_at": datetime.utcnow()
        }
        result = await self.collection.insert_one(conversation)
        return str(result.inserted_id)
    
    async def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        from bson import ObjectId
        conversation = await self.collection.find_one({"_id": ObjectId(conversation_id)})
        if conversation:
            conversation["id"] = str(conversation["_id"])
            del conversation["_id"]
            conversation["created_at"] = conversation["created_at"].isoformat()
        return conversation
    
    async def list_conversations(self, user_id: str, limit: int = 10) -> List[Dict]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        conversations = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            doc["created_at"] = doc["created_at"].isoformat()
            conversations.append(doc)
        return conversations


class MilvusProvider:
    """Milvus Vector Database Provider for embeddings"""
    
    def __init__(self):
        connections.connect(
            alias="default",
            host=settings.MILVUS_HOST,
            port=settings.MILVUS_PORT
        )
        self.collection_name = settings.MILVUS_COLLECTION
        self._create_collection_if_not_exists()
    
    def _create_collection_if_not_exists(self):
        """Create collection if it doesn't exist"""
        if not utility.has_collection(self.collection_name):
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
                FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1536)
            ]
            schema = CollectionSchema(fields, "Embeddings collection")
            Collection(name=self.collection_name, schema=schema)
    
    async def insert_embedding(self, text: str, embedding: List[float]) -> int:
        """Insert text and embedding"""
        collection = Collection(self.collection_name)
        data = [{"text": text, "embedding": embedding}]
        result = collection.insert(data)
        collection.flush()
        return result.primary_keys[0]
    
    async def search_similar(self, query_embedding: List[float], top_k: int = 5) -> List[Dict]:
        """Search for similar embeddings"""
        collection = Collection(self.collection_name)
        collection.load()
        
        search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            output_fields=["text"]
        )
        
        return [{"id": hit.id, "text": hit.entity.get("text"), "distance": hit.distance} 
                for hit in results[0]]


class DatabaseService:
    """Service to manage multiple database providers"""
    
    def __init__(self):
        self.providers: Dict[str, DatabaseProvider] = {}
        self.milvus: Optional[MilvusProvider] = None
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available database providers"""
        try:
            self.providers["postgres"] = PostgreSQLProvider()
        except Exception as e:
            print(f"PostgreSQL not available: {e}")
        
        try:
            self.providers["mongodb"] = MongoDBProvider()
        except Exception as e:
            print(f"MongoDB not available: {e}")
        
        try:
            self.milvus = MilvusProvider()
        except Exception as e:
            print(f"Milvus not available: {e}")
    
    async def save_conversation(self, db_type: str, user_id: str, provider: str, messages: List[Dict]) -> str:
        """Save conversation to specified database"""
        if db_type not in self.providers:
            raise ValueError(f"Database {db_type} not available")
        return await self.providers[db_type].save_conversation(user_id, provider, messages)
    
    async def get_conversation(self, db_type: str, conversation_id: str) -> Optional[Dict]:
        """Get conversation from specified database"""
        if db_type not in self.providers:
            raise ValueError(f"Database {db_type} not available")
        return await self.providers[db_type].get_conversation(conversation_id)
    
    async def list_conversations(self, db_type: str, user_id: str, limit: int = 10) -> List[Dict]:
        """List conversations from specified database"""
        if db_type not in self.providers:
            raise ValueError(f"Database {db_type} not available")
        return await self.providers[db_type].list_conversations(user_id, limit)
    
    def list_databases(self) -> List[str]:
        """List available database providers"""
        return list(self.providers.keys())


db_service = DatabaseService()
