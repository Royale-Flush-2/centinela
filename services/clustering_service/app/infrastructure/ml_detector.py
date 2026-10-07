import joblib
import numpy as np
import logging
from typing import Tuple, List
from app.domain.interfaces import IAnomalyDetector
from app.domain.models import DataPoint

logger = logging.getLogger(__name__)

class SklearnAnomalyDetector(IAnomalyDetector):
    def __init__(self, scaler_path: str = 'scaler.pkl', model_path: str = 'isolation_forest.pkl'):
        try:
            self.scaler = joblib.load(scaler_path)
            self.model = joblib.load(model_path)
            logger.info("SklearnAnomalyDetector: Modelos cargados exitosamente.")
        except Exception as e:
            logger.error(f"SklearnAnomalyDetector: Error cargando modelos: {e}")
            self.scaler = None
            self.model = None

    def is_anomaly(self, data: DataPoint) -> Tuple[bool, List[float]]:
        if self.scaler is None or self.model is None:
            raise RuntimeError("El modelo ML no está inicializado.")
            
        features = np.array([[data.saldo_vencido, data.max_dias_vencido, data.dias_pago_prom_120d]])
        scaled_features = self.scaler.transform(features)
        prediction = self.model.predict(scaled_features)[0]
        
        vector = scaled_features[0].tolist()
        anomaly = (prediction == -1)
        
        return anomaly, vector
