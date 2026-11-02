import json
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

from distance_tracker import DailyDistanceTracker, haversine_distance_m


class HaversineTests(unittest.TestCase):
    def test_one_thousandth_degree_latitude(self):
        distance = haversine_distance_m(45.0, 9.0, 45.001, 9.0)
        self.assertAlmostEqual(distance, 111.195, delta=0.02)

    def test_same_point(self):
        self.assertEqual(haversine_distance_m(45.0, 9.0, 45.0, 9.0), 0.0)


class TrackerTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.storage = Path(self.temporary_directory.name) / "distance.json"
        self.start = datetime(2026, 5, 10, 8, 0, 0)
        self.tracker = DailyDistanceTracker(self.storage)

    def tearDown(self):
        self.temporary_directory.cleanup()

    def add_fix(self, lat, lon, seconds=0, accuracy=5):
        return self.tracker.process_fix(
            lat, lon, accuracy, self.start + timedelta(seconds=seconds)
        )

    def test_first_fix_sets_reference_without_adding_distance(self):
        result = self.add_fix(45.0, 9.0)
        self.assertTrue(result.accepted)
        self.assertEqual(result.reason, "punto_iniziale")
        self.assertEqual(self.tracker.total_m, 0)

    def test_valid_movement_is_added_and_saved(self):
        self.add_fix(45.0, 9.0)
        result = self.add_fix(45.001, 9.0, seconds=100)
        self.assertTrue(result.accepted)
        self.assertEqual(result.reason, "tratto_aggiunto")
        self.assertAlmostEqual(self.tracker.total_m, 111.195, delta=0.02)
        saved = json.loads(self.storage.read_text(encoding="utf-8"))
        self.assertAlmostEqual(saved["total_m"], self.tracker.total_m)

    def test_small_gps_noise_is_not_added(self):
        self.add_fix(45.0, 9.0)
        result = self.add_fix(45.00001, 9.0, seconds=10)
        self.assertFalse(result.accepted)
        self.assertEqual(result.reason, "rumore_gps")
        self.assertEqual(self.tracker.total_m, 0)

    def test_inaccurate_fix_is_rejected(self):
        self.add_fix(45.0, 9.0)
        result = self.add_fix(45.001, 9.0, seconds=100, accuracy=100)
        self.assertFalse(result.accepted)
        self.assertEqual(result.reason, "precisione_insufficiente")
        self.assertEqual(self.tracker.total_m, 0)

    def test_impossible_jump_is_rejected(self):
        self.add_fix(45.0, 9.0)
        result = self.add_fix(46.0, 10.0, seconds=1)
        self.assertFalse(result.accepted)
        self.assertEqual(result.reason, "salto_gps_scartato")
        self.assertEqual(self.tracker.total_m, 0)

    def test_long_gap_starts_new_segment(self):
        self.add_fix(45.0, 9.0)
        result = self.add_fix(45.01, 9.0, seconds=1000)
        self.assertTrue(result.accepted)
        self.assertEqual(result.reason, "nuovo_segmento")
        self.assertEqual(self.tracker.total_m, 0)

    def test_midnight_resets_without_joining_days(self):
        self.add_fix(45.0, 9.0)
        self.add_fix(45.001, 9.0, seconds=100)
        next_day = self.start + timedelta(days=1)
        result = self.tracker.process_fix(45.002, 9.0, 5, next_day)
        self.assertEqual(result.reason, "punto_iniziale")
        self.assertEqual(self.tracker.total_m, 0)
        self.assertEqual(self.tracker.day, next_day.date().isoformat())

    def test_reload_preserves_saved_total(self):
        self.add_fix(45.0, 9.0)
        self.add_fix(45.001, 9.0, seconds=100)
        reloaded = DailyDistanceTracker(self.storage)
        self.assertAlmostEqual(reloaded.total_m, self.tracker.total_m)
        self.assertEqual(reloaded.day, self.tracker.day)

    def test_invalid_coordinates_are_rejected(self):
        result = self.add_fix(100.0, 9.0)
        self.assertFalse(result.accepted)
        self.assertEqual(result.reason, "coordinate_non_valide")

    def test_manual_reset(self):
        self.add_fix(45.0, 9.0)
        self.add_fix(45.001, 9.0, seconds=100)
        self.tracker.reset()
        self.assertEqual(self.tracker.total_m, 0)


if __name__ == "__main__":
    unittest.main()
