from concurrent.futures import ProcessPoolExecutor
from datetime import datetime
from pathlib import Path
import plistlib
import shutil
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from build_state import ipa_info, publish, reserve


class BuildStateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state = self.root / "git-common" / "subeye-ios"
        self.output = self.root / "builds" / "ios"

    def archive(self, number):
        path = self.output / str(number) / "SubEye.xcarchive/Info.plist"
        path.parent.mkdir(parents=True)
        path.write_bytes(plistlib.dumps({"ApplicationProperties": {"CFBundleIdentifier": "cc.subeye.app", "CFBundleVersion": str(number)}}))

    def ipa(self, number, widget_number=None):
        path = self.root / f"{number}.ipa"
        with zipfile.ZipFile(path, "w") as ipa:
            for name, identifier, build in [
                ("Payload/SubEye.app/Info.plist", "cc.subeye.app", number),
                ("Payload/SubEye.app/PlugIns/SubEyeWidget.appex/Info.plist", "cc.subeye.app.widget", widget_number or number),
            ]:
                ipa.writestr(name, plistlib.dumps({"CFBundleIdentifier": identifier, "CFBundleShortVersionString": "6.0.0", "CFBundleVersion": str(build)}))
        return path

    def test_bootstraps_from_archives_and_survives_deleted_builds(self):
        self.archive(3)
        self.assertEqual(reserve(self.state, self.output, 1), 4)
        shutil.rmtree(self.output)
        self.assertEqual(reserve(self.state, self.output, 1), 5)

    def test_concurrent_builds_reserve_distinct_numbers(self):
        with ProcessPoolExecutor(max_workers=4) as pool:
            jobs = [pool.submit(reserve, self.state, self.output, 1) for _ in range(12)]
            self.assertEqual(sorted(job.result() for job in jobs), list(range(1, 13)))

    def test_failed_build_reservation_is_not_reused_and_override_advances_counter(self):
        self.assertEqual(reserve(self.state, self.output, 1), 1)
        self.assertEqual(reserve(self.state, self.output, 1), 2)
        self.assertEqual(reserve(self.state, self.output, 1, 40), 40)
        with self.assertRaises(ValueError):
            reserve(self.state, self.output, 1, 40)
        self.assertEqual(reserve(self.state, self.output, 1), 41)

    def test_corrupt_state_fails_instead_of_resetting(self):
        reserve(self.state, self.output, 1)
        (self.state / "build-number").write_text("broken")
        with self.assertRaises(ValueError):
            reserve(self.state, self.output, 1)

    def test_older_parallel_export_cannot_replace_newer_ipa(self):
        destination = self.output / "SubEye.ipa"
        newer, latest = publish(self.state, self.ipa(5), destination, "6.0.0", 5)
        self.assertTrue(latest)
        older, latest = publish(self.state, self.ipa(4), destination, "6.0.0", 4)
        self.assertFalse(latest)
        self.assertEqual(ipa_info(newer), ("6.0.0", 5))
        self.assertEqual(ipa_info(older), ("6.0.0", 4))
        self.assertEqual(ipa_info(destination), ("6.0.0", 5))

    def test_reexport_in_the_same_minute_preserves_each_named_ipa(self):
        destination = self.output / "SubEye.ipa"
        source = self.ipa(4)
        with patch("build_state.datetime") as clock:
            clock.now.return_value = datetime(2026, 9, 16, 15, 30)
            first, _ = publish(self.state, source, destination, "6.0.0", 4)
            second, _ = publish(self.state, source, destination, "6.0.0", 4)
        self.assertEqual(first.name, "subeye-6.0.0-build4-20260916-1530.ipa")
        self.assertEqual(second.name, "subeye-6.0.0-build4-20260916-1530-2.ipa")
        self.assertEqual(first.read_bytes(), source.read_bytes())
        self.assertEqual(second.read_bytes(), source.read_bytes())

    def test_invalid_export_preserves_previous_good_ipa(self):
        destination = self.output / "SubEye.ipa"
        publish(self.state, self.ipa(4), destination, "6.0.0", 4)
        previous = destination.read_bytes()
        with self.assertRaises(ValueError):
            publish(self.state, self.ipa(5, widget_number=4), destination, "6.0.0", 5)
        self.assertEqual(destination.read_bytes(), previous)

    def test_exporting_an_external_archive_advances_the_local_counter(self):
        reserve(self.state, self.output, 1)
        publish(self.state, self.ipa(50), self.output / "SubEye.ipa", "6.0.0", 50)
        self.assertEqual(reserve(self.state, self.output, 1), 51)


if __name__ == "__main__":
    unittest.main()
