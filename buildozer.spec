[app]
title = Distanza giornaliera
package.name = distanzagiornaliera
package.domain = org.example
source.dir = .
source.include_exts = py,png,jpg,kv,atlas,json
version = 1.0
requirements = python3,kivy,plyer
orientation = portrait
fullscreen = 0
android.permissions = ACCESS_COARSE_LOCATION,ACCESS_FINE_LOCATION
android.api = 33
android.minapi = 23
android.archs = arm64-v8a
p4a.branch = master

[buildozer]
log_level = 2
warn_on_root = 1
