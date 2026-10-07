import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Any, Dict
from src.core.ports.database import IDatabase
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger("centinela.strategist", settings.log_level)

class PostgresAdapter(IDatabase):
    def __init__(self, database_url: str):
        self.database_url = database_url

    def _get_connection(self):
        conn = psycopg2.connect(self.database_url)
        conn.set_session(readonly=True, autocommit=True)
        return conn

    def calculate_action_impact(self, action_type: str, parameters: Dict[str, Any], current_margin_cop: float) -> float:
        strategies = {
            "revert_discount": self._calc_revert_discount,
            "block_rep": self._calc_block_rep,
            "inventory_transfer": self._calc_inventory_transfer,
            "emergency_purchase": self._calc_emergency_purchase,
        }
        strategy = strategies.get(action_type)
        if strategy is None:
            logger.warning(f"Unknown action_type: {action_type}, returning 0")
            return 0.0
        return strategy(parameters, current_margin_cop)

    def _calc_revert_discount(self, params: Dict[str, Any], margin: float) -> float:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT pd.cantidad, pd.precio_lista, pd.descuento_pct, pd.valor_neto
                    FROM centinela.pedidos_detalle pd
                    WHERE pd.pedido_id = %s
                    """,
                    (params.get("pedido_id"),),
                )
                rows = cur.fetchall()
                if not rows:
                    return 0.0
                new_discount = params.get("new_discount_pct", 0.0)
                recovery = sum(
                    (float(r["cantidad"]) * float(r["precio_lista"]) * (1 - new_discount / 100)) - float(r["valor_neto"])
                    for r in rows
                )
                return round(recovery, 2)
        finally:
            conn.close()

    def _calc_block_rep(self, params: Dict[str, Any], margin: float) -> float:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT COALESCE(SUM(v.descuento_en_exceso), 0) AS total
                    FROM centinela.v_descuentos_fuera_politica v
                    WHERE v.vendedor_id = %s
                    """,
                    (params.get("vendedor_id"),),
                )
                row = cur.fetchone()
                return float(row["total"]) if row else 0.0
        finally:
            conn.close()

    def _calc_inventory_transfer(self, params: Dict[str, Any], margin: float) -> float:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT lp.precio_lista, cp.costo_unitario
                    FROM centinela.lista_precios lp
                    JOIN centinela.costos_proveedor cp ON lp.sku = cp.sku
                    WHERE lp.sku = %s
                    ORDER BY lp.fecha_vigencia DESC, cp.fecha_vigencia DESC LIMIT 1
                    """,
                    (params.get("sku"),),
                )
                row = cur.fetchone()
                if not row:
                    return 0.0
                qty = params.get("quantity", 0)
                return round(qty * (float(row["precio_lista"]) - float(row["costo_unitario"])), 2)
        finally:
            conn.close()

    def _calc_emergency_purchase(self, params: Dict[str, Any], margin: float) -> float:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT lp.precio_lista, cp.costo_unitario
                    FROM centinela.lista_precios lp
                    JOIN centinela.costos_proveedor cp ON lp.sku = cp.sku
                    WHERE lp.sku = %s
                    ORDER BY lp.fecha_vigencia DESC, cp.fecha_vigencia DESC LIMIT 1
                    """,
                    (params.get("sku"),),
                )
                row = cur.fetchone()
                if not row:
                    return 0.0
                qty = params.get("quantity", 0)
                premium = params.get("cost_premium_pct", 10.0)
                emergency_cost = float(row["costo_unitario"]) * (1 + premium / 100)
                return round(qty * (float(row["precio_lista"]) - emergency_cost), 2)
        finally:
            conn.close()
