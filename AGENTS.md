# Project Guidance

## User Preferences

- Free creative subject; extreme typographic tension, rich color layering and refined micro-interactions
- Three.js, animation libraries and Lucide icons are welcome
- Every control and animation state must be truly interactive; no TODO or fake buttons
- Polish easing curves and state feedback to the highest level
- Interface copy in Chinese mixed with English display type
- Keep existing instrument, visuals and design language intact when adding features
- Refined easing curves and state feedback

## Accepted Requirements

- 一个代表最高前端与视觉水准的交互式网页作品（创意编程艺术/粒子沙盒/合成器方向）
- 极致的排版张力、色彩层次与细腻的微交互
- 所有控件、按钮、数据流和动画状态都真实可交互，没有 TODO 或静态假按钮
- 精细打磨的动效曲线和状态反馈
- 增加更多有趣的可玩性功能（节奏挑战游戏、调式切换、鼓组、跟弹模式）
- 可以播放并切换不同的音乐曲目
- 上传自己的歌曲，生成对应的演奏音乐
- 用这首上传的歌作为内置示范曲目，加进「我的曲目」，不用上传就能直接听到生成的演奏

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- RESONANCE app is client-side only: three.js particle field in src/frontend/src/visual/field.ts and shaders.ts, Web Audio engine in src/frontend/src/audio/engine.ts, presets/palettes/shapes in src/frontend/src/lib/instrument.ts, main screen in src/frontend/src/components/Instrument.tsx.
- Set data-palette on html to swap palette tokens (neon, gold, aurora, ice); WebGL mirrors them as literal colors with THREE.ColorManagement.enabled=false.
- getApiDoc lives in src/backend/mixins/api-doc.mo as ApiDocMixin(), included from main.mo after Expose.
- Global CSS reduced-motion rules do not cover motion/react animations; use useReducedMotion separately.
- Keep animate-fade-up off elements that translate for positioning; its fill-mode transform overrides translate classes.
- Track library lives in lib/tracks.ts with SongPlayer in audio/song.ts and useTrackPlayer hook; drums in audio/drums.ts; scales in lib/scales.ts; rhythm game logic in lib/game.ts with RhythmGame.tsx and GameResults.tsx; best scores in localStorage.
- Rhythm game pauses by suspending the AudioContext, which freezes song.position(); CSS orb rings pause via animation-play-state paused.
- RhythmGame swaps song.onEnd inside its setup effect and restores the previous handler on unmount.
- Global reduced-motion rule makes fill-both keyframes ending at opacity 0 (count-in, judge-pop) vanish instantly; check end frames.
- animate-ring-shrink reads its duration from an inline --ring-duration CSS variable; ember and sakura palettes need matching WebGL literal colours.
- Song upload feature: analysis in src/frontend/src/audio/analyze.ts (analyzeSong, validateFile, AnalysisError), FFT in lib/fft.ts, user tracks in lib/userTracks.ts (arrangeUserTrack, cached per record in a WeakMap; leadAbs keeps lead degrees relative to the tonic) persisted in localStorage, hooks useUserTracks and useSongAnalysis, UI in UploadZone.tsx, AnalysisResult.tsx, UserTrackList.tsx inside TrackPanel.
- useTrackPlayer(song, library, onTrackStart) selects by id over TRACKS plus user tracks; edits reload the playing track and deleting falls back to track 0.
- Local e2e tester cannot reach the hidden upload file input and has no audio fixtures, so song upload flows stay unverified in browser tests.
- Demo track: precomputed SongAnalysis in lib/demoTrack.ts (DEMO_ID 'demo-track', DEMO_TRACK, named 共振示范, D major 89 BPM); library is [...TRACKS, DEMO_TRACK, ...userTracks]; demo row in UserTrackList sits outside p.tracks.map with offset=TRACKS.length; MP3 copied to public/assets/audio/demo.mp3 but only the generated performance plays.
- Demo melody length must equal bars*16 (1424) to stay aligned.
- E2E flows: the app opens on an entry gate with the button 点击进入 启动声音; every flow and every reload needs that press before the instrument UI is visible.
