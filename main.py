"""App Android in Python/Kivy per misurare la distanza GPS giornaliera."""

from datetime import datetime
from pathlib import Path

from kivy.app import App
from kivy.clock import Clock
from kivy.graphics import Color, RoundedRectangle
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.widget import Widget
from kivy.utils import platform
from plyer import gps

from distance_tracker import DailyDistanceTracker


BACKGROUND = (0.045, 0.065, 0.10, 1)
CARD = (0.085, 0.115, 0.16, 1)
TEXT = (0.94, 0.96, 1, 1)
MUTED = (0.60, 0.68, 0.76, 1)
GREEN = (0.16, 0.78, 0.53, 1)
RED = (0.93, 0.32, 0.32, 1)


class Card(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        with self.canvas.before:
            Color(*CARD)
            self._background = RoundedRectangle(
                pos=self.pos, size=self.size, radius=[dp(18)]
            )
        self.bind(pos=self._draw, size=self._draw)

    def _draw(self, *_args):
        self._background.pos = self.pos
        self._background.size = self.size


def make_label(text, size, color=TEXT, **kwargs):
    return Label(
        text=text,
        font_size=dp(size),
        color=color,
        halign="center",
        valign="middle",
        **kwargs,
    )


class DistanceApp(App):
    title = "Distanza giornaliera"

    def build(self):
        self.tracker = DailyDistanceTracker(Path(self.user_data_dir) / "distance.json")
        self.tracking = False
        self.gps_configured = False
        self.last_details = "In attesa del primo segnale GPS"
        self.last_status = "Premi AVVIA e concedi l’accesso alla posizione"

        root = BoxLayout(orientation="vertical", padding=dp(20), spacing=dp(16))
        with root.canvas.before:
            Color(*BACKGROUND)
            self._root_background = RoundedRectangle(pos=root.pos, size=root.size)
        root.bind(pos=self._draw_root, size=self._draw_root)

        root.add_widget(make_label("DISTANZA DI OGGI", 18, MUTED, size_hint_y=None, height=dp(30)))
        self.day_label = make_label("", 15, MUTED, size_hint_y=None, height=dp(24))
        root.add_widget(self.day_label)

        card = Card(
            orientation="vertical",
            padding=dp(20),
            spacing=dp(12),
            size_hint_y=None,
            height=dp(225),
        )
        self.distance_label = make_label("0 m", 52)
        card.add_widget(self.distance_label)
        self.details_label = make_label(self.last_details, 15, MUTED)
        card.add_widget(self.details_label)
        root.add_widget(card)

        self.status_label = make_label(self.last_status, 16, MUTED)
        root.add_widget(self.status_label)
        root.add_widget(Widget(size_hint_y=1))

        self.start_button = Button(
            text="AVVIA",
            font_size=dp(19),
            bold=True,
            background_normal="",
            background_color=GREEN,
            color=(0.02, 0.08, 0.06, 1),
            size_hint_y=None,
            height=dp(58),
        )
        self.start_button.bind(on_press=self.start_tracking)
        root.add_widget(self.start_button)

        self.stop_button = Button(
            text="PAUSA",
            font_size=dp(19),
            background_normal="",
            background_color=(0.20, 0.26, 0.34, 1),
            size_hint_y=None,
            height=dp(54),
        )
        self.stop_button.bind(on_press=self.stop_tracking)
        root.add_widget(self.stop_button)

        reset_button = Button(
            text="Azzera il totale di oggi",
            font_size=dp(15),
            background_normal="",
            background_color=(0, 0, 0, 0),
            color=RED,
            size_hint_y=None,
            height=dp(42),
        )
        reset_button.bind(on_press=self.reset_distance)
        root.add_widget(reset_button)
        return root

    def _draw_root(self, widget, *_args):
        self._root_background.pos = widget.pos
        self._root_background.size = widget.size

    def on_start(self):
        Clock.schedule_interval(self.refresh_ui, 1.0)
        self.refresh_ui()
        if platform == "android":
            from android.permissions import Permission, request_permissions

            request_permissions(
                [Permission.ACCESS_FINE_LOCATION, Permission.ACCESS_COARSE_LOCATION],
                self.on_permissions,
            )
        else:
            self.last_status = "Avvia l’app su Android per usare il GPS reale"
            self.refresh_ui()

    def on_permissions(self, _permissions, grants):
        if grants and all(grants):
            self.last_status = "Permesso concesso: premi AVVIA"
        else:
            self.last_status = "Senza posizione precisa l’app non può misurare"
        self.refresh_ui()

    def configure_gps(self):
        if self.gps_configured:
            return True
        try:
            gps.configure(on_location=self.on_location, on_status=self.on_gps_status)
            self.gps_configured = True
            return True
        except (NotImplementedError, RuntimeError) as error:
            self.last_status = f"GPS non disponibile: {error}"
            self.refresh_ui()
            return False

    def start_tracking(self, *_args):
        if self.tracking:
            return
        if platform != "android":
            self.last_status = "Il GPS del telefono richiede l’app Android"
            self.refresh_ui()
            return
        if not self.configure_gps():
            return
        try:
            gps.start(minTime=1000, minDistance=0)
            self.tracking = True
            self.last_status = "Misurazione attiva · cerca il segnale GPS"
        except (NotImplementedError, RuntimeError) as error:
            self.last_status = f"Impossibile avviare il GPS: {error}"
        self.refresh_ui()

    def stop_tracking(self, *_args):
        if self.gps_configured:
            try:
                gps.stop()
            except (NotImplementedError, RuntimeError):
                pass
        self.tracking = False
        self.tracker.save()
        self.last_status = "Misurazione in pausa"
        self.refresh_ui()

    def reset_distance(self, *_args):
        self.tracker.reset()
        self.last_details = "In attesa del primo segnale GPS"
        self.last_status = "Totale di oggi azzerato"
        self.refresh_ui()

    def on_location(self, **location):
        result = self.tracker.process_fix(
            latitude=float(location.get("lat", float("nan"))),
            longitude=float(location.get("lon", float("nan"))),
            accuracy_m=self._optional_float(location.get("accuracy")),
            timestamp=datetime.now().astimezone(),
        )
        latitude = location.get("lat")
        longitude = location.get("lon")
        accuracy = location.get("accuracy")
        if result.reason == "tratto_aggiunto":
            self.last_details = f"+{result.added_m:.1f} m · precisione ±{self._optional_float(accuracy) or 0:.0f} m"
        elif result.reason == "precisione_insufficiente":
            self.last_details = "Segnale impreciso: posizione non conteggiata"
        elif result.reason == "salto_gps_scartato":
            self.last_details = "Salto GPS anomalo scartato"
        elif latitude is not None and longitude is not None:
            self.last_details = f"{latitude:.5f}, {longitude:.5f}"
        Clock.schedule_once(lambda _dt: self.refresh_ui())

    def on_gps_status(self, status_type, status):
        self.last_status = f"GPS: {status}"
        Clock.schedule_once(lambda _dt: self.refresh_ui())

    @staticmethod
    def _optional_float(value):
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def refresh_ui(self, *_args):
        self.tracker.rollover_if_needed(datetime.now().astimezone())
        distance = self.tracker.total_m
        self.distance_label.text = (
            f"{distance / 1000:.2f} km" if distance >= 1000 else f"{distance:.0f} m"
        )
        self.day_label.text = datetime.now().strftime("%d/%m/%Y")
        self.details_label.text = self.last_details
        self.status_label.text = self.last_status
        self.start_button.disabled = self.tracking
        self.stop_button.disabled = not self.tracking

    def on_pause(self):
        # Questa versione misura deliberatamente solo con l’app in primo piano.
        self.stop_tracking()
        return True

    def on_stop(self):
        self.stop_tracking()


if __name__ == "__main__":
    DistanceApp().run()
