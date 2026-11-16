#!/bin/zsh
# Screenshot della demo di BCW (build Debug di kubos5/BCW già installata sul simulatore acceso), in
# chiaro e in scuro, più la Dashboard nei dieci colori d'accento. Uso:
#   tools/shoot-ios.sh <cartella>            tutti
#   ONLY=accent tools/shoot-ios.sh <cartella> solo quelli il cui nome contiene "accent"
# Poi convertirli con cwebp (vedi README). Gli argomenti di avvio sono quelli di DEBUG descritti nel
# CLAUDE.md dell'app. Il simulatore di iOS 27 è lento ad avviare l'app: lo script aspetta finché lo
# screenshot non è più bianco.
OUT="$1"; mkdir -p "$OUT"
APP=com.bcw-classeviva.app
BASE=(-demoMode YES -BCWOnboarding NO -BCWVariant appStore -BCWPlus unlocked -appIconColor mattone)
shot() {
  local name=$1 wait=$2; shift 2
  if [[ -n "$ONLY" && "$name" != *$ONLY* ]]; then return; fi
  xcrun simctl terminate booted $APP >/dev/null 2>&1
  sleep 2
  xcrun simctl launch booted $APP "${BASE[@]}" "$@" >/dev/null
  sleep $wait
  local tries=0 size=0
  while (( tries < 25 )); do
    xcrun simctl io booted screenshot --type=png "$OUT/.probe.png" >/dev/null 2>&1
    size=$(stat -f %z "$OUT/.probe.png")
    if (( size > 130000 )); then break; fi
    sleep 2; (( tries++ ))
  done
  sleep 4
  xcrun simctl io booted screenshot --type=png "$OUT/$name.png" >/dev/null 2>&1 && echo "OK $name $(stat -f %z "$OUT/$name.png") tries=$tries"
}
xcrun simctl status_bar booted override --time "9:41" --batteryState discharging --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork wifi
for mode in light dark; do
  xcrun simctl ui booted appearance $mode
  m=${mode:0:1}
  shot $m-dashboard 12 -BCWLiquidGlass NO
  shot $m-grades 14 -BCWLiquidGlass NO -BCWTab grades
  shot $m-subject 16 -BCWLiquidGlass NO -BCWTab grades -BCWOpenSubject YES
  shot $m-timetable 14 -BCWLiquidGlass NO -BCWTab timetable -BCWTimetableDemo YES -BCWTimetableToday YES -BCWNowMinute 620 -timetableMode list
  shot $m-timetable-day 14 -BCWLiquidGlass NO -BCWTab timetable -BCWTimetableDemo YES -BCWTimetableToday YES -BCWNowMinute 620 -timetableMode day
  shot $m-you 14 -BCWLiquidGlass NO -BCWTab you
  shot $m-bacheca 14 -BCWLiquidGlass NO -BCWTab you -BCWOpenPage bacheca
  shot $m-appearance 12 -BCWLiquidGlass NO -BCWTab you -BCWOpenPage impostazioni-appearance
  shot $m-glass-dashboard 12 -BCWLiquidGlass YES
  for pair in "a23e2f:mattone" "c0661b:arancio" "9a7b12:oro" "2f7d55:verde" "1f7a80:petrolio" "2f6db5:blu" "5b5bb0:indaco" "8a4fb0:viola" "b8456f:rosa" "5f6b7a:ardesia"; do
    hex=${pair%%:*}; nm=${pair##*:}
    shot $m-accent-$nm 10 -BCWLiquidGlass NO -BCWAccent "#$hex"
  done
done
xcrun simctl ui booted appearance light
xcrun simctl launch booted $APP "${BASE[@]}" -BCWLiquidGlass NO >/dev/null
echo DONE
