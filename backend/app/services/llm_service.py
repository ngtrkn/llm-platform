from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import openai
import google.generativeai as genai
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from a prompt"""
        pass
    
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Chat completion with message history"""
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI LLM Provider"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.client = openai.OpenAI(api_key=api_key or settings.OPENAI_API_KEY)
    
    async def generate(self, prompt: str, model: str = "gpt-3.5-turbo", **kwargs) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            **kwargs
        )
        return response.choices[0].message.content
    
    async def chat(self, messages: List[Dict[str, str]], model: str = "gpt-3.5-turbo", **kwargs) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        return response.choices[0].message.content


class GeminiProvider(LLMProvider):
    """Google Gemini LLM Provider"""
    
    def __init__(self, api_key: Optional[str] = None):
        genai.configure(api_key=api_key or settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def generate(self, prompt: str, **kwargs) -> str:
        response = self.model.generate_content(prompt, **kwargs)
        return response.text
    
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        # Convert messages format for Gemini
        chat = self.model.start_chat(history=[])
        last_message = messages[-1]["content"]
        response = chat.send_message(last_message, **kwargs)
        return response.text


class AzureOpenAIProvider(LLMProvider):
    """Azure OpenAI LLM Provider"""
    
    def __init__(self, endpoint: Optional[str] = None, api_key: Optional[str] = None, api_version: Optional[str] = None):
        self.endpoint = endpoint or settings.AZURE_OPENAI_ENDPOINT
        self.api_key = api_key or settings.AZURE_OPENAI_API_KEY
        self.api_version = api_version or settings.AZURE_OPENAI_API_VERSION
        self.client = openai.AzureOpenAI(
            azure_endpoint=self.endpoint,
            api_key=self.api_key,
            api_version=self.api_version
        )
    
    async def generate(self, prompt: str, model: str = "gpt-35-turbo", **kwargs) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            **kwargs
        )
        return response.choices[0].message.content
    
    async def chat(self, messages: List[Dict[str, str]], model: str = "gpt-35-turbo", **kwargs) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        return response.choices[0].message.content


class LLMService:
    """Service to manage multiple LLM providers"""
    
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available providers based on config"""
        if settings.OPENAI_API_KEY:
            self.providers["openai"] = OpenAIProvider()
        
        if settings.GEMINI_API_KEY:
            self.providers["gemini"] = GeminiProvider()
        
        if settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_API_KEY:
            self.providers["azure"] = AzureOpenAIProvider()
    
    async def generate(self, provider: str, prompt: str, **kwargs) -> str:
        """Generate text using specified provider"""
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} not available")
        return await self.providers[provider].generate(prompt, **kwargs)
    
    async def chat(self, provider: str, messages: List[Dict[str, str]], **kwargs) -> str:
        """Chat completion using specified provider"""
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} not available")
        return await self.providers[provider].chat(messages, **kwargs)
    
    def list_providers(self) -> List[str]:
        """List available providers"""
        return list(self.providers.keys())


llm_service = LLMService()
