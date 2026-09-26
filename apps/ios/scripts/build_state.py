import argparse
import contextlib
from datetime import datetime
import fcntl
import os
from pathlib import Path
import plistlib
import re
import shutil
import tempfile
import zipfile


def build_number(value):
    if not re.fullmatch(r"[1-9][0-9]*", str(value)):
        raise ValueError(f"Invalid build number: {value!r}")
    return int(value)


@contextlib.contextmanager
def locked(state_dir):
    state_dir.mkdir(parents=True, exist_ok=True)
    with (state_dir / "lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def save_number(counter, number):
    with tempfile.NamedTemporaryFile(mode="w", dir=counter.parent, delete=False) as file:
        temp_path = Path(file.name)
        try:
            file.write(f"{number}\n")
            file.flush()
            os.fsync(file.fileno())
            os.replace(temp_path, counter)
        finally:
            temp_path.unlink(missing_ok=True)


def reserve(state_dir, output_dir, initial, requested=None):
    with locked(state_dir):
        counter = state_dir / "build-number"
        last = build_number(initial) - 1
        if counter.exists():
            # A damaged counter must stop the build, never silently reuse numbers.
            last = max(last, build_number(counter.read_text().strip()))
        for path in output_dir.glob("*/SubEye.xcarchive/Info.plist"):
            with path.open("rb") as file:
                info = plistlib.load(file).get("ApplicationProperties", {})
            if info.get("CFBundleIdentifier") == "cc.subeye.app":
                last = max(last, build_number(info["CFBundleVersion"]))
        number = build_number(requested) if requested is not None else last + 1
        if number <= last:
            raise ValueError(f"Build {number} was already reserved or archived; choose a number above {last}, or use --export-only.")
        save_number(counter, number)
        return number


def ipa_info(path):
    with zipfile.ZipFile(path) as ipa:
        app = plistlib.loads(ipa.read("Payload/SubEye.app/Info.plist"))
        widget = plistlib.loads(ipa.read("Payload/SubEye.app/PlugIns/SubEyeWidget.appex/Info.plist"))
    if app.get("CFBundleIdentifier") != "cc.subeye.app" or widget.get("CFBundleIdentifier") != "cc.subeye.app.widget":
        raise ValueError("IPA has the wrong app or widget identity.")
    version = app["CFBundleShortVersionString"]
    number = build_number(app["CFBundleVersion"])
    if widget["CFBundleShortVersionString"] != version or build_number(widget["CFBundleVersion"]) != number:
        raise ValueError("IPA app and widget versions differ.")
    return version, number


def publish(state_dir, source, destination, version, number):
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
        raise ValueError(f"Invalid marketing version: {version!r}")
    expected = (version, build_number(number))
    if ipa_info(source) != expected:
        raise ValueError("Exported IPA does not match the archive version/build.")
    with locked(state_dir):
        counter = state_dir / "build-number"
        last = build_number(counter.read_text().strip()) if counter.exists() else 0
        save_number(counter, max(last, expected[1]))
        destination.parent.mkdir(parents=True, exist_ok=True)
        stem = f"subeye-{version}-build{expected[1]}-{datetime.now():%Y%m%d-%H%M}"
        artifact = destination.parent / f"{stem}.ipa"
        suffix = 2
        while artifact.exists():
            artifact = destination.parent / f"{stem}-{suffix}.ipa"
            suffix += 1
        atomic_copy(source, artifact, replace=False)
        # Parallel builds may finish out of order; retain the newest successful IPA.
        if destination.exists() and ipa_info(destination)[1] > expected[1]:
            return artifact, False
        atomic_copy(source, destination, replace=True)
        return artifact, True


def atomic_copy(source, destination, replace):
    with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as file:
        temp_path = Path(file.name)
    try:
        shutil.copyfile(source, temp_path)
        if replace:
            os.replace(temp_path, destination)
        else:
            os.link(temp_path, destination)
    finally:
        temp_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state-dir", required=True, type=Path)
    commands = parser.add_subparsers(dest="command", required=True)
    reserve_parser = commands.add_parser("reserve")
    reserve_parser.add_argument("--output-dir", required=True, type=Path)
    reserve_parser.add_argument("--initial", required=True, type=build_number)
    reserve_parser.add_argument("--requested", type=build_number)
    publish_parser = commands.add_parser("publish")
    publish_parser.add_argument("--source", required=True, type=Path)
    publish_parser.add_argument("--destination", required=True, type=Path)
    publish_parser.add_argument("--version", required=True)
    publish_parser.add_argument("--number", required=True, type=build_number)
    args = parser.parse_args()
    try:
        if args.command == "reserve":
            print(reserve(args.state_dir, args.output_dir, args.initial, args.requested))
        else:
            artifact, latest = publish(args.state_dir, args.source, args.destination, args.version, args.number)
            print(f"Transporter IPA: {artifact}")
            if latest:
                print(f"Latest build copy: {args.destination}")
            else:
                print(f"A newer build remains at {args.destination}.")
    except (ValueError, OSError, KeyError, plistlib.InvalidFileException, zipfile.BadZipFile) as error:
        parser.exit(1, f"Error: {error}\n")


if __name__ == "__main__":
    main()
