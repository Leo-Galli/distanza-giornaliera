"""Calcolo e persistenza della distanza giornaliera basata su posizioni GPS."""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Optional


EARTH_RADIUS_M = 6_371_008.8


def haversine_distance_m(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Restituisce la distanza sulla superficie terrestre tra due coordinate."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


@dataclass(frozen=True)
class FixResult:
    """Esito dell'elaborazione di una posizione GPS."""

    accepted: bool
    added_m: float
    total_m: float
    reason: str


@dataclass(frozen=True)
class _LastFix:
    latitude: float
    longitude: float
    accuracy_m: Optional[float]
    timestamp: datetime


class DailyDistanceTracker:
    """Somma gli spostamenti GPS validi, separando automaticamente i giorni.

    Il salvataggio contiene soltanto il giorno e il totale: dopo un riavvio non
    viene unito con una linea retta l'ultimo punto precedente al primo nuovo.
    """

    def __init__(
        self,
        storage_path: str | Path,
        *,
        max_accuracy_m: float = 50.0,
        min_distance_m: float = 5.0,
        max_speed_mps: float = 70.0,
        max_gap_s: float = 300.0,
    ) -> None:
        self.storage_path = Path(storage_path)
        self.max_accuracy_m = max_accuracy_m
        self.min_distance_m = min_distance_m
        self.max_speed_mps = max_speed_mps
        self.max_gap_s = max_gap_s

        self._day = date.today().isoformat()
        self._total_m = 0.0
        self._last_fix: Optional[_LastFix] = None
        self.load()

    @property
    def day(self) -> str:
        return self._day

    @property
    def total_m(self) -> float:
        return self._total_m

    @staticmethod
    def _valid_coordinate(latitude: float, longitude: float) -> bool:
        return (
            math.isfinite(latitude)
            and math.isfinite(longitude)
            and -90.0 <= latitude <= 90.0
            and -180.0 <= longitude <= 180.0
        )

    def load(self) -> None:
        """Carica il totale se appartiene al giorno corrente."""
        if not self.storage_path.exists():
            return
        try:
            data = json.loads(self.storage_path.read_text(encoding="utf-8"))
            saved_day = str(data["day"])
            saved_total = float(data["total_m"])
            if not math.isfinite(saved_total) or saved_total < 0:
                raise ValueError("Totale non valido")
            self._day = saved_day
            self._total_m = saved_total
        except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
            # Un file danneggiato non deve impedire l'avvio dell'app.
            self._total_m = 0.0
            self._last_fix = None

    def save(self) -> None:
        """Salva in modo atomico il totale giornaliero."""
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = self.storage_path.with_suffix(
            self.storage_path.suffix + ".tmp"
        )
        payload = {"day": self._day, "total_m": self._total_m}
        temporary_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        os.replace(temporary_path, self.storage_path)

    def rollover_if_needed(self, now: datetime) -> bool:
        """Azzera il totale quando cambia il giorno locale."""
        current_day = now.date().isoformat()
        if current_day == self._day:
            return False
        self._day = current_day
        self._total_m = 0.0
        self._last_fix = None
        self.save()
        return True

    def reset(self) -> None:
        self._total_m = 0.0
        self._last_fix = None
        self.save()

    def process_fix(
        self,
        latitude: float,
        longitude: float,
        accuracy_m: Optional[float],
        timestamp: datetime,
    ) -> FixResult:
        """Elabora una posizione e aggiunge il tratto soltanto se plausibile."""
        self.rollover_if_needed(timestamp)

        if not self._valid_coordinate(latitude, longitude):
            return self._result(False, 0.0, "coordinate_non_valide")

        if accuracy_m is not None:
            if (
                not math.isfinite(accuracy_m)
                or accuracy_m <= 0
                or accuracy_m > self.max_accuracy_m
            ):
                return self._result(False, 0.0, "precisione_insufficiente")

        current_fix = _LastFix(latitude, longitude, accuracy_m, timestamp)
        previous = self._last_fix
        if previous is None:
            self._last_fix = current_fix
            return self._result(True, 0.0, "punto_iniziale")

        elapsed_s = (timestamp - previous.timestamp).total_seconds()
        if elapsed_s <= 0:
            return self._result(False, 0.0, "posizione_fuori_sequenza")

        segment_m = haversine_distance_m(
            previous.latitude, previous.longitude, latitude, longitude
        )

        # Dopo una lunga interruzione il percorso intermedio è sconosciuto:
        # si riparte dal nuovo punto senza inventare il tratto mancante.
        if elapsed_s > self.max_gap_s:
            self._last_fix = current_fix
            return self._result(True, 0.0, "nuovo_segmento")

        if segment_m / elapsed_s > self.max_speed_mps:
            # Aggiornare il riferimento permette di recuperare dopo un salto GPS.
            self._last_fix = current_fix
            return self._result(False, 0.0, "salto_gps_scartato")

        # Mezza accuratezza stimata riduce il rumore senza imporre soglie
        # eccessive; il riferimento resta fermo finché non c'è movimento reale.
        accuracy_threshold = (accuracy_m or 0.0) * 0.5
        threshold_m = max(self.min_distance_m, accuracy_threshold)
        if segment_m < threshold_m:
            return self._result(False, 0.0, "rumore_gps")

        self._total_m += segment_m
        self._last_fix = current_fix
        self.save()
        return self._result(True, segment_m, "tratto_aggiunto")

    def _result(self, accepted: bool, added_m: float, reason: str) -> FixResult:
        return FixResult(accepted, added_m, self._total_m, reason)
