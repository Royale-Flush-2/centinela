from app.core.config import settings
from app.infrastructure.ml_detector import SklearnAnomalyDetector
from app.infrastructure.pg_vector_repo import PgVectorRepository
from app.services.clustering_service import ClusteringService

detector = SklearnAnomalyDetector(scaler_path='scaler.pkl', model_path='isolation_forest.pkl')

vector_repo = PgVectorRepository(dsn=settings.DATABASE_URL)

clustering_service = ClusteringService(
    detector=detector,
    vector_repo=vector_repo
)

def get_clustering_service() -> ClusteringService:
    return clustering_service
