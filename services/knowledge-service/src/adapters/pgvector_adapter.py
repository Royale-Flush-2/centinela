# knowledge-service/src/adapters/pgvector_adapter.py
from typing import List, Tuple
from langchain_core.documents import Document
from langchain_postgres import PGVector
from core.ports.vector_store import IVectorStore
from core.ports.embedding_provider import IEmbeddingProvider

class PGVectorAdapter(IVectorStore):
    def __init__(self, embedding_provider: IEmbeddingProvider, database_url: str):
        self._embedding_provider = embedding_provider
        self._database_url = database_url

    def _get_store(self, namespace: str) -> PGVector:
        return PGVector(
            embeddings=self._embedding_provider.get_embeddings_model(),
            collection_name=namespace,
            connection=self._database_url,
            use_jsonb=True,
        )

    def add_documents(self, documents: List[Document], namespace: str) -> None:
        store = self._get_store(namespace)
        store.add_documents(documents)

    def similarity_search(
        self, query: str, namespace: str, top_k: int = 3
    ) -> List[Tuple[Document, float]]:
        store = self._get_store(namespace)
        return store.similarity_search_with_score(query, k=top_k)
