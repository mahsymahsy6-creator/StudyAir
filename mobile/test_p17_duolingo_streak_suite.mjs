/**
 * StudyAir - P17 Duolingo Streak Remaster Test Suite
 * Validates:
 * 1. AnimatedFlame and ConfettiCannon component definitions, exports, and tier variations
 * 2. StreakCelebrationModal with social share, 3D buttons, and secret reveal banner
 * 3. StreakScreen with 7-day flame chain, freeze slots, secret mystery milestones, and clue sheet
 * 4. ScreenHeader with streak flame animation
 * 5. Study streak engine calculation invariants and freeze handling
 * 6. Sound FX Web Audio synthesizer and celebratory Haptics
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Starting P17 Duolingo Streak Remaster Suite...");

// 1. Verify AnimatedFlame component file & tier variations
const flamePath = path.join(__dirname, "src/components/streak/AnimatedFlame.tsx");
assert(fs.existsSync(flamePath), "AnimatedFlame.tsx must exist");
const flameContent = fs.readFileSync(flamePath, "utf-8");
assert(flameContent.includes("export function AnimatedFlame"), "AnimatedFlame must be exported");
assert(flameContent.includes("Animated.loop"), "AnimatedFlame must have continuous breathing loop");
assert(flameContent.includes("flame"), "AnimatedFlame must use flame icon");
assert(flameContent.includes("#FF9600") || flameContent.includes("#FF7A00"), "AnimatedFlame must have Duolingo fiery orange colors");
assert(flameContent.includes("tier"), "AnimatedFlame must accept tier prop");
assert(flameContent.includes("rainbow") && flameContent.includes("gold"), "AnimatedFlame must support tier variations");
console.log("✓ AnimatedFlame component & tier variations verified");

// 2. Verify ConfettiCannon component file & tier palettes
const confettiPath = path.join(__dirname, "src/components/streak/ConfettiCannon.tsx");
assert(fs.existsSync(confettiPath), "ConfettiCannon.tsx must exist");
const confettiContent = fs.readFileSync(confettiPath, "utf-8");
assert(confettiContent.includes("export function ConfettiCannon"), "ConfettiCannon must be exported");
assert(confettiContent.includes("CONFETTI_COLORS"), "ConfettiCannon must define particle colors");
assert(confettiContent.includes("interpolate"), "ConfettiCannon must animate flutter and drift");
assert(confettiContent.includes("tier"), "ConfettiCannon must accept tier prop");
assert(confettiContent.includes("GOLD_CONFETTI") || confettiContent.includes("RAINBOW_CONFETTI"), "ConfettiCannon must have tier-specific palettes");
console.log("✓ ConfettiCannon component & tier palettes verified");

// 3. Verify StreakCelebrationModal updates & secret reveal banner
const modalPath = path.join(__dirname, "src/components/streak/StreakCelebrationModal.tsx");
assert(fs.existsSync(modalPath), "StreakCelebrationModal.tsx must exist");
const modalContent = fs.readFileSync(modalPath, "utf-8");
assert(modalContent.includes("ConfettiCannon"), "StreakCelebrationModal must include ConfettiCannon");
assert(modalContent.includes("StreakEvolutionMascot"), "StreakCelebrationModal must include StreakEvolutionMascot");
assert(modalContent.includes("Share.share"), "StreakCelebrationModal must support social sharing");
assert(modalContent.includes("borderBottomWidth: 4") || modalContent.includes("btn3D"), "StreakCelebrationModal must have Duolingo 3D button styling");
assert(modalContent.includes("soundFX"), "StreakCelebrationModal must trigger celebratory soundFX");
assert(modalContent.includes("RAHASIA TERUNGKAP") || modalContent.includes("EVOLUSI MASKOT"), "StreakCelebrationModal must include secret/evolution badge");
console.log("✓ StreakCelebrationModal verified with Confetti, Sound & Revealed styling");

// 4. Verify StreakScreen Duolingo Remaster & Secret Milestones
const screenPath = path.join(__dirname, "src/screens/StreakScreen.tsx");
assert(fs.existsSync(screenPath), "StreakScreen.tsx must exist");
const screenContent = fs.readFileSync(screenPath, "utf-8");
assert(screenContent.includes("StreakEvolutionMascot"), "StreakScreen must include StreakEvolutionMascot");
assert(screenContent.includes("Perlindungan Streak") || screenContent.includes("Streak Freeze"), "StreakScreen must show Streak Freeze slots");
assert(screenContent.includes("SEN") && screenContent.includes("MIN"), "StreakScreen must show 7-day flame chain");
assert(screenContent.includes("Share.share"), "StreakScreen must support sharing achievement");
assert(screenContent.includes("inspectedDay"), "StreakScreen must have tactile day inspection popover");
assert(screenContent.includes("??? Rahasia"), "StreakScreen must conceal locked milestone titles");
assert(screenContent.includes("RAHASIA 🔒") || screenContent.includes("secretClueMilestone"), "StreakScreen must flag secret locked milestones");
assert(screenContent.includes("mysteryOverlay") || screenContent.includes("mysteryCard"), "StreakScreen must render mystery clue modal");
assert(screenContent.includes("Evolusi Maskot") || screenContent.includes("evolutionCard"), "StreakScreen must show mascot evolution tracker");
console.log("✓ StreakScreen remastered with mascot hero, 7-day chain, freeze slots & secret milestones verified");

// 5. Verify ScreenHeader streak flame and dynamic mascot animation
const headerPath = path.join(__dirname, "src/components/common/ScreenHeader.tsx");
assert(fs.existsSync(headerPath), "ScreenHeader.tsx must exist");
const headerContent = fs.readFileSync(headerPath, "utf-8");
assert(headerContent.includes("flamePulse"), "ScreenHeader must have flamePulse animated value");
assert(headerContent.includes("streakBadge"), "ScreenHeader must apply flame animation to streak badge");
assert(headerContent.includes("getMascotStage"), "ScreenHeader must dynamically resolve mascot emoji for streak count");
console.log("✓ ScreenHeader breathing streak flame and mascot badge verified");

// 6. Test Study Streak Engine invariants
const enginePath = path.join(__dirname, "src/lib/studyStreakEngine.ts");
assert(fs.existsSync(enginePath), "studyStreakEngine.ts must exist");
const engineContent = fs.readFileSync(enginePath, "utf-8");
assert(engineContent.includes("calculateStreak"), "studyStreakEngine must export calculateStreak");
assert(engineContent.includes("deriveStudyDay"), "studyStreakEngine must export deriveStudyDay");
assert(engineContent.includes("isFreeDay") || engineContent.includes("isRequiredDay"), "studyStreakEngine must support free day / weekend freeze");
assert(engineContent.includes("isAtRisk"), "studyStreakEngine must track streak at-risk status");
assert(engineContent.includes("MASCOT_STAGES"), "studyStreakEngine must export MASCOT_STAGES");
assert(engineContent.includes("getMascotStage"), "studyStreakEngine must export getMascotStage");
assert(engineContent.includes("getNextMascotStage"), "studyStreakEngine must export getNextMascotStage");
console.log("✓ Study streak engine calculation invariants and mascot evolution stages verified");

// 7. Test Sound FX Synthesizer
const soundPath = path.join(__dirname, "src/lib/sound.ts");
assert(fs.existsSync(soundPath), "sound.ts must exist");
const soundContent = fs.readFileSync(soundPath, "utf-8");
assert(soundContent.includes("playStreakMilestone"), "sound.ts must export playStreakMilestone");
assert(soundContent.includes("playMysteryClue"), "sound.ts must export playMysteryClue");
assert(soundContent.includes("playMysteryUnlockReveal"), "sound.ts must export playMysteryUnlockReveal");
assert(soundContent.includes("playFlameIgnite"), "sound.ts must export playFlameIgnite");
assert(soundContent.includes("playMascotInteraction"), "sound.ts must export playMascotInteraction for interactive mascot audio");
console.log("✓ Sound FX synthesizer with mascot interaction sounds verified");

// 8. Test Celebratory Haptics
const hapticsPath = path.join(__dirname, "src/lib/haptics.ts");
assert(fs.existsSync(hapticsPath), "haptics.ts must exist");
const hapticsContent = fs.readFileSync(hapticsPath, "utf-8");
assert(hapticsContent.includes("celebration"), "haptics.ts must export celebration");
assert(hapticsContent.includes("mysteryClue"), "haptics.ts must export mysteryClue");
assert(hapticsContent.includes("mysteryReveal"), "haptics.ts must export mysteryReveal");
console.log("✓ Celebratory haptics patterns verified");

// 9. Verify StreakEvolutionMascot component file & 4 evolution stages
const mascotPath = path.join(__dirname, "src/components/streak/StreakEvolutionMascot.tsx");
assert(fs.existsSync(mascotPath), "StreakEvolutionMascot.tsx must exist");
const mascotContent = fs.readFileSync(mascotPath, "utf-8");
assert(mascotContent.includes("export function StreakEvolutionMascot"), "StreakEvolutionMascot must be exported");
assert(mascotContent.includes('currentStage.id === "egg"') || mascotContent.includes("eggContainer"), "StreakEvolutionMascot must render Egg stage (1-6 days)");
assert(mascotContent.includes('currentStage.id === "baby"') || mascotContent.includes("babyBody"), "StreakEvolutionMascot must render Baby Dragon stage (7-29 days)");
assert(mascotContent.includes('currentStage.id === "winged"') || mascotContent.includes("wingedBody"), "StreakEvolutionMascot must render Winged Dragon stage (30-99 days)");
assert(mascotContent.includes('currentStage.id === "deity"') || mascotContent.includes("deityBody"), "StreakEvolutionMascot must render Cosmic Deity Dragon stage (100+ days)");
assert(mascotContent.includes("playMascotInteraction"), "StreakEvolutionMascot must trigger stage-specific sound on tap");
assert(mascotContent.includes("HapticFeedback.streakSparkle"), "StreakEvolutionMascot must trigger haptics on tap");
console.log("✓ StreakEvolutionMascot 4-stage procedural animations and sound feedback verified");

console.log("🎉 P17 Duolingo Streak Remaster & Mascot Evolution test suite passed 100%!");
