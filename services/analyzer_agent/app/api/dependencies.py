from app.services.analyzer_service import AnalyzerService

analyzer_service = AnalyzerService()

def get_analyzer_service() -> AnalyzerService:
    return analyzer_service
