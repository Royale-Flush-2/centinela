import psycopg2
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import joblib
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5433") # We mapped it to 5433
DB_USER = os.getenv("DB_USER", "centinela_user")
DB_PASS = os.getenv("DB_PASS", "centinela_password")
DB_NAME = os.getenv("DB_NAME", "centinela")

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        dbname=DB_NAME
    )

def train_and_save():
    logger.info("Conectando a la base de datos...")
    conn = get_connection()
    
    # Extraemos características de la vista v_cartera_cliente
    # Usaremos: saldo_vencido, max_dias_vencido, dias_pago_prom_120d
    query = """
    SET search_path TO centinela;
    SELECT cliente_id, 
           COALESCE(saldo_vencido, 0) as f1, 
           COALESCE(max_dias_vencido, 0) as f2, 
           COALESCE(dias_pago_prom_120d, 0) as f3
    FROM centinela.v_cartera_cliente
    """
    
    # Use context manager for cursor to set search_path
    cursor = conn.cursor()
    cursor.execute("SET search_path TO centinela;")
    
    df = pd.read_sql(query, conn)
    logger.info(f"Datos extraídos: {len(df)} clientes.")
    
    features = df[['f1', 'f2', 'f3']].values
    
    logger.info("Entrenando StandardScaler...")
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)
    
    logger.info("Entrenando IsolationForest...")
    # Entrenamos con una contaminación esperada baja (ej. 5% de anomalías)
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(scaled_features)
    
    # Guardar los modelos a disco
    joblib.dump(scaler, 'scaler.pkl')
    joblib.dump(model, 'isolation_forest.pkl')
    logger.info("Modelos guardados en scaler.pkl y isolation_forest.pkl")
    
    # Insertar los vectores normalizados en PostgreSQL
    logger.info("Guardando vectores en pgvector...")
    cursor = conn.cursor()
    
    # Limpiamos tabla anterior
    cursor.execute("TRUNCATE TABLE centinela.cliente_vectores;")
    
    # Insertamos
    insert_query = "INSERT INTO centinela.cliente_vectores (cliente_id, embedding) VALUES (%s, %s)"
    
    count = 0
    for idx, row in df.iterrows():
        client_id = row['cliente_id']
        vector = scaled_features[idx].tolist()
        cursor.execute(insert_query, (client_id, vector))
        count += 1
        
    conn.commit()
    cursor.close()
    conn.close()
    
    logger.info(f"Proceso finalizado. {count} vectores guardados exitosamente.")

if __name__ == "__main__":
    train_and_save()
