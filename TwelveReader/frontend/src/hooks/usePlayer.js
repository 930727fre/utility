/**
 * Player state machine
 *
 * States: IDLE | GENERATING | PLAYING
 *
 * paragraphs: string[] — plain text, index is the stable identity
 * Sliding window: [N-1 kept] [N playing] [N+1 prefetch] [N+2 prefetch]
 *
 * Stop-after-play: when the backend returns `stop: true` for a paragraph
 * (image, table, or Kokoro failure), the player pauses instead of advancing.
 * User taps play to resume on the next paragraph.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { requestTTS, evictTTSCache, putBookmark } from '../api'

export function usePlayer(bookId, paragraphs) {
  const [state, setState] = useState('IDLE')
  const [currentIndex, setCurrentIndex] = useState(-1)

  const audioRef = useRef(new Audio())
  const prefetchAbortRef = useRef(false)
  const ttsUrlCacheRef = useRef(new Map())   // index → {url, stop}
  const cachedWindowRef = useRef(new Set())  // indices currently on server cache
  const transitioningRef = useRef(false)
  const mediaActionRef = useRef({})
  const stopAfterRef = useRef(false)         // whether currently-playing paragraph stops after ending

  // Save bookmark while playing
  useEffect(() => {
    if (state !== 'PLAYING' || currentIndex < 0) return
    putBookmark(bookId, currentIndex).catch(() => {})
  }, [currentIndex, state])

  // Sync external pause back to React state
  useEffect(() => {
    const audio = audioRef.current
    const onExternalPause = () => {
      if (transitioningRef.current) return
      setState(s => s === 'PLAYING' ? 'IDLE' : s)
    }
    audio.addEventListener('pause', onExternalPause)
    return () => audio.removeEventListener('pause', onExternalPause)
  }, [])

  // MediaSession: register action handlers once
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const h = mediaActionRef.current
    navigator.mediaSession.setActionHandler('play', () => h.resume?.())
    navigator.mediaSession.setActionHandler('pause', () => h.pause?.())
    navigator.mediaSession.setActionHandler('nexttrack', () => h.next?.())
    navigator.mediaSession.setActionHandler('previoustrack', () => h.prev?.())
    return () => {
      for (const action of ['play', 'pause', 'nexttrack', 'previoustrack'])
        navigator.mediaSession.setActionHandler(action, null)
    }
  }, [])

  // MediaSession: sync metadata on paragraph change
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const text = paragraphs[currentIndex]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: text?.slice(0, 80) ?? 'TwelveReader',
      artist: 'TwelveReader',
    })
  }, [currentIndex, paragraphs])

  // MediaSession: sync playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState =
      state === 'PLAYING' || state === 'GENERATING' ? 'playing' : 'paused'
  }, [state])

  const _advanceRef = useRef(null)
  const _startAtRef = useRef(null)

  const _playUrl = useCallback((url, index, stop) => {
    const audio = audioRef.current
    transitioningRef.current = true
    stopAfterRef.current = !!stop
    audio.pause()
    audio.src = url
    audio.onended = () => {
      if (stopAfterRef.current) {
        setState('IDLE')
      } else {
        _advanceRef.current?.(index)
      }
    }
    audio.onerror = () => _advanceRef.current?.(index)
    audio.play()
      .then(() => { transitioningRef.current = false })
      .catch(() => { transitioningRef.current = false })
  }, [])

  const _advance = useCallback((fromIndex) => {
    const next = fromIndex + 1
    if (next >= paragraphs.length) {
      setState('IDLE')
      setCurrentIndex(-1)
      return
    }
    _startAtRef.current?.(next)
  }, [paragraphs])

  const _prefetch = useCallback(async (fromIndex) => {
    prefetchAbortRef.current = false
    const targets = [fromIndex + 1, fromIndex + 2].filter(i => i < paragraphs.length)
    for (const i of targets) {
      if (prefetchAbortRef.current) break
      if (ttsUrlCacheRef.current.has(i)) continue
      try {
        const { url, stop } = await requestTTS(bookId, i)
        ttsUrlCacheRef.current.set(i, { url, stop: !!stop })
        cachedWindowRef.current.add(i)
      } catch (_) {}
    }
  }, [bookId, paragraphs])

  const _startAt = useCallback(async (index) => {
    if (index < 0 || index >= paragraphs.length) return

    // evict N-2 from sliding window
    if (index >= 2) {
      const evictIdx = index - 2
      if (cachedWindowRef.current.has(evictIdx)) {
        evictTTSCache(bookId, evictIdx).catch(() => {})
        ttsUrlCacheRef.current.delete(evictIdx)
        cachedWindowRef.current.delete(evictIdx)
      }
    }

    setState('GENERATING')
    setCurrentIndex(index)

    try {
      let entry = ttsUrlCacheRef.current.get(index)
      if (!entry) {
        const result = await requestTTS(bookId, index)
        entry = { url: result.url, stop: !!result.stop }
        ttsUrlCacheRef.current.set(index, entry)
        cachedWindowRef.current.add(index)
      }
      setState('PLAYING')
      _playUrl(entry.url, index, entry.stop)
      _prefetch(index)
    } catch (_) {
      setState('PLAYING')
      _playUrl('/audio/ding.wav', index, true)
    }
  }, [bookId, paragraphs, _playUrl, _prefetch])

  _advanceRef.current = _advance
  _startAtRef.current = _startAt

  const play = useCallback((index) => {
    prefetchAbortRef.current = true
    audioRef.current.pause()
    _startAt(index)
  }, [_startAt])

  const seekTo = useCallback((index) => {
    prefetchAbortRef.current = true
    stopAfterRef.current = false
    audioRef.current.pause()
    setState('IDLE')
    const toEvict = [...cachedWindowRef.current]
    cachedWindowRef.current.clear()
    ttsUrlCacheRef.current.clear()
    for (const i of toEvict) evictTTSCache(bookId, i).catch(() => {})
    _startAt(index)
  }, [bookId, _startAt])

  const pause = useCallback(() => {
    audioRef.current.pause()
    setState('IDLE')
  }, [])

  const resume = useCallback(() => {
    if (currentIndex < 0) return
    // Coming out of a ding-stopped paragraph → advance instead of replaying.
    if (stopAfterRef.current) {
      stopAfterRef.current = false
      const next = currentIndex + 1
      if (next >= paragraphs.length) {
        setCurrentIndex(-1)
        return
      }
      _startAtRef.current?.(next)
      return
    }
    const audio = audioRef.current
    if (!audio.src || audio.readyState === 0) {
      _startAtRef.current?.(currentIndex)
    } else {
      audio.play().catch(() => {})
      setState('PLAYING')
    }
  }, [currentIndex, paragraphs])

  const resumeFromBookmark = useCallback((index) => {
    if (index >= 0 && index < paragraphs.length) setCurrentIndex(index)
  }, [paragraphs])

  mediaActionRef.current.pause = pause
  mediaActionRef.current.resume = resume
  mediaActionRef.current.next = () => {
    const idx = currentIndex
    if (idx >= 0 && idx + 1 < paragraphs.length) _startAtRef.current?.(idx + 1)
  }
  mediaActionRef.current.prev = () => {
    const idx = currentIndex
    if (idx > 0) _startAtRef.current?.(idx - 1)
  }

  return { state, currentIndex, play, seekTo, pause, resume, resumeFromBookmark }
}
