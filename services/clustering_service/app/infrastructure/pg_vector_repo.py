import psycopg2
import logging
from typing import List
from app.domain.interfaces import IVectorRepository
from app.domain.models import Neighbor

logger = logging.getLogger(__name__)

class PgVectorRepository(IVectorRepository):
    def __init__(self, dsn: str):
        self.dsn = dsn

    def _get_connection(self):
        return psycopg2.connect(self.dsn)

    def find_nearest_neighbors(self, vector: List[float], exclude_client_id: str, k: int = 3) -> List[Neighbor]:
        neighbors = []
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            query = """
            SELECT cliente_id, embedding <-> %s::vector AS distance
            FROM centinela.cliente_vectores
            WHERE cliente_id != %s
            ORDER BY distance ASC
            LIMIT %s;
            """
            cursor.execute(query, (vector, exclude_client_id, k))
            results = cursor.fetchall()
            
            for row in results:
                neighbors.append(Neighbor(
                    client_id=row[0],
                    distance=float(row[1])
                ))
                
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f"PgVectorRepository: Error consultando pgvector: {e}")
            
        return neighbors
