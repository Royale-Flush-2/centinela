import logging
from app.domain.interfaces import IAnomalyDetector, IVectorRepository
from app.domain.models import DataPoint, AnalysisResponse

logger = logging.getLogger(__name__)

class ClusteringService:
    def __init__(
        self,
        detector: IAnomalyDetector,
        vector_repo: IVectorRepository
    ):
        self.detector = detector
        self.vector_repo = vector_repo

    def process_data_point(self, point: DataPoint) -> AnalysisResponse:
        logger.info(f"ClusteringService: Evaluando dato estadístico para {point.client_id}")
        
        is_anomaly, vector = self.detector.is_anomaly(point)
        
        if not is_anomaly:
            return AnalysisResponse(
                status="normal",
                message="Dato normal según Isolation Forest."
            )
            
        logger.info(f"ClusteringService: ¡ANOMALÍA! {point.client_id}")
        
        neighbors = self.vector_repo.find_nearest_neighbors(
            vector=vector, 
            exclude_client_id=point.client_id, 
            k=3
        )
        
        return AnalysisResponse(
            status="anomaly_detected",
            message="Anomalía estadística detectada.",
            nearest_neighbors=neighbors
        )
