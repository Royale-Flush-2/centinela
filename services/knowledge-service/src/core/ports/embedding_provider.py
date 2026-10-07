# knowledge-service/src/core/ports/embedding_provider.py
from abc import ABC, abstractmethod

class IEmbeddingProvider(ABC):
    @abstractmethod
    def get_embeddings_model(self):
        """Return the embeddings model instance for use with LangChain."""
        pass
