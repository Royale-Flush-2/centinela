from app.core.config import settings
from app.infrastructure.http_clustering_client import HttpClusteringClient
from app.services.lookout_service import LookoutService

clustering_client = HttpClusteringClient(clustering_url=settings.clustering_url)
lookout_service = LookoutService(clustering_client=clustering_client)

def get_lookout_service() -> LookoutService:
    return lookout_service
