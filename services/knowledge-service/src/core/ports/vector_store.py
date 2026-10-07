# knowledge-service/src/core/ports/vector_store.py
from abc import ABC, abstractmethod
from typing import List, Tuple
from langchain_core.documents import Document

class IVectorStore(ABC):
    @abstractmethod
    def add_documents(self, documents: List[Document], namespace: str) -> None:
        pass

    @abstractmethod
    def similarity_search(
        self, query: str, namespace: str, top_k: int = 3
    ) -> List[Tuple[Document, float]]:
        pass
