# knowledge-service/src/adapters/huggingface_embedding_adapter.py
from langchain_huggingface import HuggingFaceEmbeddings
from core.ports.embedding_provider import IEmbeddingProvider
from core.config import settings

class HuggingFaceEmbeddingAdapter(IEmbeddingProvider):
    def __init__(self, model_name: str | None = None):
        self._model = HuggingFaceEmbeddings(
            model_name=model_name or settings.embedding_model
        )

    def get_embeddings_model(self):
        return self._model
