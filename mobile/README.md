# StudyAir Mobile — Native React Mobile App

A companion native mobile application for **StudyAir** built with React Native and Expo.

---

## 📱 Features

1. **Today's Focus Dashboard**:
   - Focus metrics (Sessions, Focus hours, Completed tasks).
   - Direct launch to active Pomodoro session.
   - Target exam countdown cards.
2. **Interactive Time-Blocking Calendar**:
   - 7-Day horizontal week selector.
   - Hourly time-blocking grid (08:00 – 20:00).
   - Auto-schedule and manual block creation modal.
   - Subject color coding & cognitive load tags (`HIGH`, `MEDIUM`, `LOW`).
3. **Syllabus Deconstructor**:
   - Subjects breakdown with completion percentage bars.
   - Atomic study units with duration and cognitive load badges.
   - Checkbox completion toggles.
   - Add/delete subjects and units natively.
4. **⚡ Multimodal Gemini AI Vision Scanner**:
   - Ingest course outlines, lecture timetables, or handwritten notes.
   - Live laser scanning animation.
   - Extracted units editor with toggle checkboxes.
   - 1-Click "Import & Auto-Schedule" directly into your calendar.
5. **Pomodoro Focus Timer & SM-2 Spaced Repetition**:
   - Fullscreen countdown timer with progress status.
   - Play, pause, reset, and finish controls.
   - SuperMemo SM-2 confidence rating modal (Again, Hard, Good, Easy) on session completion.

---

## 🚀 Running the Mobile App Locally

### Prerequisites
- Node.js (v18+)
- Expo CLI: `npm install -g expo-cli` (optional, can use `npx expo`)

### Launch in Development
```bash
cd mobile

# Start the Expo development server
npx expo start
```

### Options:
- **Scan with Expo Go**: Open the **Expo Go** app on your physical iPhone or Android device and scan the displayed QR code.
- **iOS Simulator** (macOS): Press `i` in the terminal to launch the iOS simulator.
- **Android Emulator**: Press `a` in the terminal to launch the Android emulator.
- **Web Preview**: Press `w` in the terminal to test in your desktop browser.

---

## 🎨 Design System
- Pure React Native primitives (`View`, `Text`, `Pressable`, `ScrollView`, `Modal`, `SafeAreaView`) with strict `StyleSheet.create()` styling.
- Theme tokens defined in `src/theme.ts` matching StudyAir's deep ambient slate, indigo, and violet palette.
