"""Generate a short two-tone ding for visual-paragraph cues.

Run once, commit the resulting WAV. Re-run only if the sound needs to change.
"""
import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 24000
DURATION = 0.6
FREQ_LOW = 880.0
FREQ_HIGH = 1320.0
DECAY = 5.0

out = Path(__file__).resolve().parent.parent / "audio" / "ding.wav"
out.parent.mkdir(parents=True, exist_ok=True)

n = int(SAMPLE_RATE * DURATION)
frames = bytearray()
for i in range(n):
    t = i / SAMPLE_RATE
    env = math.exp(-t * DECAY)
    s = (math.sin(2 * math.pi * FREQ_LOW * t) * 0.4
         + math.sin(2 * math.pi * FREQ_HIGH * t) * 0.2) * env
    frames += struct.pack("<h", int(s * 32767))

with wave.open(str(out), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SAMPLE_RATE)
    w.writeframes(bytes(frames))

print(f"wrote {out} ({len(frames)} bytes, {DURATION}s @ {SAMPLE_RATE}Hz)")
