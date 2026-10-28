"""Adds the localized InfoPlist.strings (en, es) to the generated Xcode project.

Usage: python3 scripts/localize-ios.py ios/App
Copies ios-resources/<lang>.lproj into ios/App/App and registers them as a
variant group in the App target's resources.
"""
import re
import shutil
import sys
from pathlib import Path

LANGS = ["en", "es"]
ROOT = Path(__file__).resolve().parent.parent
app_dir = Path(sys.argv[1])
pbx = app_dir / "App.xcodeproj" / "project.pbxproj"

for lang in LANGS:
    shutil.copytree(ROOT / "ios-resources" / f"{lang}.lproj", app_dir / "App" / f"{lang}.lproj", dirs_exist_ok=True)

s = pbx.read_text()
if "InfoPlist.strings" in s:
    sys.exit(0)

ids = iter(f"C0FFEE{n:018X}" for n in range(1, 100))
group_id, build_id = next(ids), next(ids)
file_ids = {lang: next(ids) for lang in LANGS}


def insert_after(marker, text):
    global s
    i = s.index(marker) + len(marker)
    s = s[:i] + text + s[i:]


insert_after("/* Begin PBXBuildFile section */\n",
             f"\t\t{build_id} /* InfoPlist.strings in Resources */ = {{isa = PBXBuildFile; fileRef = {group_id} /* InfoPlist.strings */; }};\n")
insert_after("/* Begin PBXFileReference section */\n", "".join(
    f'\t\t{fid} /* {lang} */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = {lang}; path = {lang}.lproj/InfoPlist.strings; sourceTree = "<group>"; }};\n'
    for lang, fid in file_ids.items()))
insert_after("/* Begin PBXVariantGroup section */\n",
             f"\t\t{group_id} /* InfoPlist.strings */ = {{\n\t\t\tisa = PBXVariantGroup;\n\t\t\tchildren = (\n"
             + "".join(f"\t\t\t\t{fid} /* {lang} */,\n" for lang, fid in file_ids.items())
             + '\t\t\t);\n\t\t\tname = InfoPlist.strings;\n\t\t\tsourceTree = "<group>";\n\t\t};\n')

# Same group and build phase as LaunchScreen.storyboard.
s = re.sub(r"(\n(\s*)\w+ /\* LaunchScreen\.storyboard \*/,\n)",
           lambda m: m.group(1) + f"{m.group(2)}{group_id} /* InfoPlist.strings */,\n", s, count=1)
s = re.sub(r"(\n(\s*)\w+ /\* LaunchScreen\.storyboard in Resources \*/,\n)",
           lambda m: m.group(1) + f"{m.group(2)}{build_id} /* InfoPlist.strings in Resources */,\n", s, count=1)
s = re.sub(r"(knownRegions = \(\n(\s*)en,\n)", lambda m: m.group(1) + f"{m.group(2)}es,\n", s, count=1)

pbx.write_text(s)
