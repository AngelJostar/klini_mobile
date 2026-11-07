"""Inspect an IPA for missing embedded frameworks and unresolved Expo Core symbols.

Standard library only. Does not print device identifiers or signing material.
Usage: python scripts/verify-ios-linkage.py path/to/Klini.ipa
"""
import json
import plistlib
import struct
import sys
import zipfile


def inspect_macho(data):
    if data[:4] == b"\xca\xfe\xba\xbe":
        for index in range(struct.unpack_from(">I", data, 4)[0]):
            cpu, _, offset, size, _ = struct.unpack_from(">IIIII", data, 8 + index * 20)
            if cpu == 0x0100000C:  # arm64
                data = data[offset:offset + size]
                break
    if data[:4] != b"\xcf\xfa\xed\xfe":
        raise ValueError("Expected an arm64 Mach-O image")
    defined, required, libraries = set(), set(), []
    command_offset = 32
    for _ in range(struct.unpack_from("<I", data, 16)[0]):
        command, size = struct.unpack_from("<II", data, command_offset)
        if command == 2:  # LC_SYMTAB
            symoff, count, stroff, _ = struct.unpack_from(
                "<IIII", data, command_offset + 8)
            for index in range(count):
                string_index, kind, _, description, _ = struct.unpack_from(
                    "<IBBHQ", data, symoff + index * 16)
                if not string_index or not kind & 1 or kind & 0xE0:
                    continue
                start = stroff + string_index
                end = data.find(b"\0", start)
                symbol = data[start:end].decode("utf-8", errors="replace")
                if kind & 0x0E == 0x0E:  # N_SECT, external definition
                    defined.add(symbol)
                elif kind & 0x0E == 0 and not description & 0x40:
                    required.add(symbol)  # strong N_UNDF; ignore weak imports
        elif command in (0xC, 0x8000001F):  # load/re-export; weak dylibs are optional
            name_offset = struct.unpack_from("<I", data, command_offset + 8)[0]
            start = command_offset + name_offset
            libraries.append(data[start:data.find(b"\0", start)].decode("utf-8"))
        command_offset += size
    return defined, required, libraries


def verify(path):
    with zipfile.ZipFile(path) as archive:
        files = set(archive.namelist())
        info_path = next(name for name in files if name.startswith("Payload/")
                         and name.count("/") == 2 and name.endswith("/Info.plist"))
        root = info_path.rsplit("/", 1)[0]
        info = plistlib.loads(archive.read(info_path))
        images = {"app": root + "/" + info["CFBundleExecutable"]}
        for name in files:
            if name.startswith(root + "/Frameworks/") and name.count("/") == 4 and name.endswith("/Info.plist"):
                framework = plistlib.loads(archive.read(name))
                images[name.split("/")[-2]] = name.rsplit("/", 1)[0] + "/" + framework["CFBundleExecutable"]
        definitions, imports, missing_libraries = set(), {}, []
        for image, path in sorted(images.items()):
            defined, required, libraries = inspect_macho(archive.read(path))
            definitions.update(defined)
            imports[image] = {symbol for symbol in required if "ExpoModulesCore" in symbol}
            for library in libraries:
                if library.startswith("@rpath/") and root + "/Frameworks/" + library[7:] not in files:
                    missing_libraries.append({"image": image, "library": library})
        unresolved = {image: sorted(symbols - definitions) for image, symbols in imports.items()
                      if symbols - definitions}
        return {"bundle": info.get("CFBundleIdentifier"), "build": info.get("CFBundleVersion"),
                "embeddedFrameworks": len(images) - 1,
                "missingEmbeddedLibraries": missing_libraries,
                "unresolvedExpoCoreImports": unresolved,
                "passed": not missing_libraries and not unresolved}


if __name__ == "__main__":
    result = verify(sys.argv[1])
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["passed"] else 1)
