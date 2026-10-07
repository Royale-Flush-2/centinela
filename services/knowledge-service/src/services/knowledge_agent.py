import pymupdf as fitz  # PyMuPDF
from typing import Any, Dict, List, Tuple
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from core.ports.vector_store import IVectorStore
from core.config import settings
from core.logging import get_logger

logger = get_logger("centinela.knowledge-service", settings.log_level)

class KnowledgeAgent:
    def __init__(self, vector_store: IVectorStore):
        self.vector_store = vector_store
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=150, length_function=len, is_separator_regex=False
        )

    def ingest_pdf(self, file_bytes: bytes, filename: str, namespace: str) -> int:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        full_text = "".join(page.get_text("text") + "\n\n" for page in doc)
        chunks = self.splitter.split_text(full_text)
        documents = [
            Document(
                page_content=chunk,
                metadata={"source": filename, "chunk_index": i},
            )
            for i, chunk in enumerate(chunks)
        ]
        self.vector_store.add_documents(documents, namespace)
        logger.info(f"Ingested {len(documents)} chunks from {filename}")
        return len(documents)

    def ingest_audit_log(
        self, text: str, namespace: str, metadata: Dict[str, Any]
    ) -> None:
        doc = Document(page_content=text, metadata=metadata)
        self.vector_store.add_documents([doc], namespace)
        logger.info(f"Ingested audit log entry: {metadata.get('alert_id')}")

    def search(
        self, query: str, namespace: str, top_k: int = 3
    ) -> List[Tuple[Document, float]]:
        return self.vector_store.similarity_search(query, namespace, top_k)
