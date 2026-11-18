/**
 * StudyAir Mobile — Organic Streak Evolution Dragon Pet Component
 *
 * Living, biomechanical dragon companion with organic anatomy & autonomous life behaviors:
 * - Asymmetric wingbeat physics (fast power downstroke + graceful recovery glide) with 2-joint wingtip lag
 * - Independent respiratory cycle (inhale -> hold -> warm exhale) with twin nostril ember/smoke wisps
 * - Natural randomized eye blinking (single & double blinks), 2D pupil saccades, dual specular catchlights,
 *   happy crescent eye squints (^ ^) and warm cheek blushes when fed or petted
 * - 3-segment nested kinematic wave tail (Base -> Mid -> Tip) with dual-core flickering flame
 * - Autonomous idle micro-behaviors (curious head tilt, ear-frill flutter, warm exhale, tail wag)
 * - Physical feeding arc (glowing Bara Api snack flies into mouth + 3 jaw chomps + warm belly pulse)
 *
 * Stages:
 * - Stage 1 (1–6 Days): 🥚 Telur Naga Api
 * - Stage 2 (7–29 Days): 🐲 Tukik Naga Bara
 * - Stage 3 (30–99 Days): 🐉 Naga Langit Perkasa
 * - Stage 4 (100+ Days): 🐉 Kaisar Naga Kosmik
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  ViewStyle,
} from "react-native";
import {
  getMascotStage,
  getMascotGrowthState,
  deriveDragonOrganicBehavior,
  MascotStage,
  DragonElementId,
  DragonMoodId,
} from "../../lib/studyStreakEngine";
import { soundFX } from "../../lib/sound";
import { HapticFeedback } from "../../lib/haptics";

interface StreakEvolutionMascotProps {
  days: number;
  isLit?: boolean;
  isAtRisk?: boolean;
  element?: DragonElementId;
  mood?: DragonMoodId;
  feedTrigger?: number;
  roarTrigger?: number;
  petTrigger?: number;
  size?: number | "compact" | "normal" | "hero";
  interactive?: boolean;
  style?: ViewStyle;
  onMascotPress?: (stage: MascotStage) => void;
}

export function StreakEvolutionMascot({
  days,
  isLit = true,
  isAtRisk = false,
  element = "auto",
  mood,
  feedTrigger = 0,
  roarTrigger = 0,
  petTrigger = 0,
  size: sizeProp = 96,
  interactive = true,
  style,
  onMascotPress,
}: StreakEvolutionMascotProps) {
  const currentStage = getMascotStage(days);
  const growth = getMascotGrowthState(days);
  const effectiveMood: DragonMoodId =
    mood || (!isLit && isAtRisk ? "hungry" : isLit ? "happy" : "sleepy");
  const organic = deriveDragonOrganicBehavior({
    stageId: currentStage.id,
    mood: effectiveMood,
  });

  const [reactionEmoji, setReactionEmoji] = useState<string>("🔥");

  const size =
    typeof sizeProp === "number"
      ? sizeProp
      : sizeProp === "compact"
      ? 76
      : sizeProp === "hero"
      ? 116
      : 96;

  const baseScale = size / 96;
  const scale = baseScale * growth.scaleMultiplier;

  // ─── Biomechanical Multi-Joint Animation Values ───
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const eggJumpAnim = useRef(new Animated.Value(0)).current;
  const eggSquashAnim = useRef(new Animated.Value(1)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const driftXAnim = useRef(new Animated.Value(0)).current;
  const bodyPitchAnim = useRef(new Animated.Value(0)).current;
  const headBobAnim = useRef(new Animated.Value(0)).current;
  const headTiltAnim = useRef(new Animated.Value(0)).current;
  const earFlutterAnim = useRef(new Animated.Value(0)).current;
  const chestScaleAnim = useRef(new Animated.Value(1)).current;
  const bellyGlowAnim = useRef(new Animated.Value(0.85)).current;

  // 2-Joint Articulated Wing Values (Shoulder + Lagging Wingtip)
  const wingFlapAnim = useRef(new Animated.Value(0)).current;
  const wingTipAnim = useRef(new Animated.Value(0)).current;

  // 3-Segment Kinematic Wave Tail Values
  const tailWagAnim = useRef(new Animated.Value(0)).current;
  const tailWaveLagAnim = useRef(new Animated.Value(0)).current;
  const tailFlameFlickerAnim = useRef(new Animated.Value(1)).current;
  const crownBobAnim = useRef(new Animated.Value(0)).current;

  // Organic Gaze, Randomized Blink, Happy Squint & Cheek Blush
  const eyeBlinkAnim = useRef(new Animated.Value(1)).current;
  const pupilLookAnim = useRef(new Animated.Value(0)).current;
  const pupilLookYAnim = useRef(new Animated.Value(0)).current;
  const happySquintAnim = useRef(new Animated.Value(0)).current;
  const cheekBlushAnim = useRef(new Animated.Value(0.25)).current;

  // Nostril Breath Wisp, Feeding Snack Arc & Jaw Chomp
  const nostrilPuffAnim = useRef(new Animated.Value(0)).current;
  const snackArcAnim = useRef(new Animated.Value(0)).current;
  const jawChompAnim = useRef(new Animated.Value(0)).current;

  // Ambient Aura, Calm Embers & Interactive Tap/Feed/Roar Values
  const haloScaleAnim = useRef(new Animated.Value(1)).current;
  const emberAnim1 = useRef(new Animated.Value(0)).current;
  const emberAnim2 = useRef(new Animated.Value(0)).current;
  const tapScaleAnim = useRef(new Animated.Value(1)).current;
  const roarBurstAnim = useRef(new Animated.Value(0)).current;
  const reactionFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (days < 1) {
      wobbleAnim.setValue(0);
      eggJumpAnim.setValue(0);
      eggSquashAnim.setValue(1);
      bounceAnim.setValue(0);
      driftXAnim.setValue(0);
      headBobAnim.setValue(0);
      headTiltAnim.setValue(0);
      chestScaleAnim.setValue(1);
      wingFlapAnim.setValue(0);
      wingTipAnim.setValue(0);
      tailWagAnim.setValue(0);
      tailWaveLagAnim.setValue(0);
      tailFlameFlickerAnim.setValue(1);
      crownBobAnim.setValue(0);
      eyeBlinkAnim.setValue(1);
      haloScaleAnim.setValue(1);
      emberAnim1.setValue(0);
      emberAnim2.setValue(0);
      return;
    }

    if (!isLit && !isAtRisk) {
      wobbleAnim.setValue(0);
      eggJumpAnim.setValue(0);
      eggSquashAnim.setValue(1);
      bounceAnim.setValue(0);
      driftXAnim.setValue(0);
      headBobAnim.setValue(0);
      headTiltAnim.setValue(0);
      chestScaleAnim.setValue(1);
      wingFlapAnim.setValue(0);
      wingTipAnim.setValue(0);
      tailWagAnim.setValue(0);
      tailWaveLagAnim.setValue(0);
      tailFlameFlickerAnim.setValue(1);
      crownBobAnim.setValue(0);
      eyeBlinkAnim.setValue(0.45);
      haloScaleAnim.setValue(1);
      emberAnim1.setValue(0);
      emberAnim2.setValue(0);
      return;
    }

    let isMounted = true;
    const downMs = organic.wingDownstrokeMs;
    const upMs = organic.wingUpstrokeMs;
    const breathMs = organic.breathCycleMs;

    // 1. Egg Stage: Organic double-lub-dub heartbeat & warm rocking
    const eggRockDeg = growth.subTier === 1 ? 2.8 : growth.subTier === 2 ? 4.8 : 6.8;
    const eggRestMs = growth.subTier === 1 ? 2100 : growth.subTier === 2 ? 1750 : 1400;

    const eggLoop = Animated.loop(
      Animated.sequence([
        // Lub-dub internal heartbeat pulse while resting
        Animated.timing(heartbeatAnim, {
          toValue: 1.08,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 0.98,
          duration: 110,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1.12,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 320,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(eggRestMs),
        // Warm anticipation squash + hop/rock
        Animated.parallel([
          Animated.timing(eggSquashAnim, {
            toValue: growth.subTier === 3 ? 0.93 : 0.96,
            duration: 190,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: -eggRockDeg,
            duration: 210,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(eggSquashAnim, {
            toValue: growth.subTier === 3 ? 1.05 : 1.025,
            duration: 210,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(eggJumpAnim, {
            toValue: growth.subTier === 3 ? -4.5 * baseScale : -2 * baseScale,
            duration: 210,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: eggRockDeg,
            duration: 230,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(eggSquashAnim, {
            toValue: 1,
            friction: 5,
            tension: 140,
            useNativeDriver: true,
          }),
          Animated.spring(eggJumpAnim, {
            toValue: 0,
            friction: 5,
            tension: 140,
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 0,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 2. Asymmetric Biomechanical Wingbeat & Hover Lift
    const hoverUp = (growth.subTier === 1 ? -3.2 : growth.subTier === 2 ? -4.5 : -5.8) * baseScale;
    const hoverDown = (growth.subTier === 1 ? 1.6 : 2.2) * baseScale;

    const hoverAndFlapLoop = Animated.loop(
      Animated.parallel([
        // Body rises sharply on the fast downstroke, then glides softly down on recovery
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: hoverUp,
            duration: downMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: hoverDown,
            duration: upMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // Subtle body pitch (tilts slightly upward on power stroke, levels out on glide)
        Animated.sequence([
          Animated.timing(bodyPitchAnim, {
            toValue: -1,
            duration: downMs,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bodyPitchAnim, {
            toValue: 1,
            duration: upMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // Shoulder wing joint: fast power stroke -> graceful recovery
        Animated.sequence([
          Animated.timing(wingFlapAnim, {
            toValue: 1,
            duration: downMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wingFlapAnim, {
            toValue: 0,
            duration: upMs,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Secondary Wingtip Joint (delayed by 90ms for organic feather/membrane whip)
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(wingTipAnim, {
            toValue: 1,
            duration: downMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wingTipAnim, {
            toValue: 0,
            duration: Math.max(120, upMs - 90),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 3. Independent Respiratory Cycle (Inhale -> Hold -> Warm Exhale with Nostril Wisp)
    const breathLoop = Animated.loop(
      Animated.sequence([
        // Deep inhale
        Animated.parallel([
          Animated.timing(chestScaleAnim, {
            toValue: 1.045,
            duration: Math.round(breathMs * 0.42),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bellyGlowAnim, {
            toValue: 1,
            duration: Math.round(breathMs * 0.42),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // Brief lung hold
        Animated.delay(Math.round(breathMs * 0.1)),
        // Warm exhale + nostril ember wisp puff
        Animated.parallel([
          Animated.timing(chestScaleAnim, {
            toValue: 0.975,
            duration: Math.round(breathMs * 0.48),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bellyGlowAnim, {
            toValue: 0.78,
            duration: Math.round(breathMs * 0.48),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(nostrilPuffAnim, {
              toValue: 1,
              duration: Math.round(breathMs * 0.42),
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(nostrilPuffAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );

    // 4. Graceful Figure-Eight Horizontal Drift
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftXAnim, {
          toValue: 3.2 * baseScale,
          duration: breathMs * 1.35,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftXAnim, {
          toValue: -3.2 * baseScale,
          duration: breathMs * 1.35,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 5. Out-of-Phase Head Follow-Through & Ear-Frill Flutter
    const headLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(110),
        Animated.parallel([
          Animated.timing(headBobAnim, {
            toValue: -2 * baseScale,
            duration: downMs + 80,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(earFlutterAnim, {
            toValue: 1,
            duration: downMs + 80,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(headBobAnim, {
            toValue: 1.6 * baseScale,
            duration: Math.max(150, upMs - 80),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(earFlutterAnim, {
            toValue: -1,
            duration: Math.max(150, upMs - 80),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 6. 3-Segment Propagating Sine-Wave Dragon Tail
    const tailCycle = Math.round((downMs + upMs) * 0.85);
    const tailLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(tailWagAnim, {
            toValue: 1,
            duration: tailCycle,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tailWagAnim, {
            toValue: -1,
            duration: tailCycle,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(Math.round(tailCycle * 0.28)),
          Animated.timing(tailWaveLagAnim, {
            toValue: 1,
            duration: tailCycle,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tailWaveLagAnim, {
            toValue: -1,
            duration: tailCycle,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 7. Natural Randomized Blinking, Saccades & Autonomous Micro-Behaviors
    let blinkTimeout: ReturnType<typeof setTimeout> | null = null;
    let microTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleOrganicBlinkAndSaccade = () => {
      if (!isMounted) return;
      const nextWait = 1800 + Math.floor(Math.random() * 2600);
      blinkTimeout = setTimeout(() => {
        if (!isMounted) return;
        const isDoubleBlink = Math.random() < 0.28;
        const lookX = (Math.random() - 0.5) * 2.2;
        const lookY = (Math.random() - 0.5) * 1.4;

        const blinkSeq = [
          Animated.timing(eyeBlinkAnim, {
            toValue: 0.08,
            duration: 65,
            useNativeDriver: true,
          }),
          Animated.timing(eyeBlinkAnim, {
            toValue: 1,
            duration: 85,
            useNativeDriver: true,
          }),
        ];

        if (isDoubleBlink) {
          blinkSeq.push(
            Animated.delay(90),
            Animated.timing(eyeBlinkAnim, {
              toValue: 0.08,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.timing(eyeBlinkAnim, {
              toValue: 1,
              duration: 85,
              useNativeDriver: true,
            })
          );
        }

        Animated.parallel([
          Animated.sequence(blinkSeq),
          Animated.timing(pupilLookAnim, {
            toValue: lookX,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pupilLookYAnim, {
            toValue: lookY,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          scheduleOrganicBlinkAndSaccade();
        });
      }, nextWait);
    };

    const scheduleAutonomousMicroBehavior = () => {
      if (!isMounted) return;
      const waitMs = 3600 + Math.floor(Math.random() * 3200);
      microTimeout = setTimeout(() => {
        if (!isMounted) return;
        const tiltDir = Math.random() < 0.5 ? 1 : -1;
        Animated.sequence([
          // Curious head tilt + ear perk
          Animated.timing(headTiltAnim, {
            toValue: tiltDir * 1.6,
            duration: 420,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          }),
          Animated.delay(950),
          Animated.timing(headTiltAnim, {
            toValue: 0,
            duration: 480,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          scheduleAutonomousMicroBehavior();
        });
      }, waitMs);
    };

    // 8. Soft Ambient Aura Breathing
    const maxHalo = 1.035 + growth.level * 0.005;
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloScaleAnim, {
          toValue: maxHalo,
          duration: breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(haloScaleAnim, {
          toValue: 0.975,
          duration: breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 9. Calm Floating Embers
    const createCalmEmber = (val: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(val, {
            toValue: 1,
            duration: 2500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const e1 = createCalmEmber(emberAnim1, 0);
    const e2 = createCalmEmber(emberAnim2, 1250);

    // 10. Lively Multi-Frequency Tail Flame Flicker & Floating Crown Bob
    const tailFlickerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tailFlameFlickerAnim, {
          toValue: 1.18,
          duration: 230,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tailFlameFlickerAnim, {
          toValue: 0.92,
          duration: 190,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tailFlameFlickerAnim, {
          toValue: 1.12,
          duration: 170,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tailFlameFlickerAnim, {
          toValue: 0.95,
          duration: 210,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const crownBobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(crownBobAnim, {
          toValue: -2.8 * baseScale,
          duration: 1350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(crownBobAnim, {
          toValue: 1.4 * baseScale,
          duration: 1350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    if (currentStage.id === "egg") {
      eggLoop.start();
      if (growth.subTier === 3) {
        scheduleOrganicBlinkAndSaccade();
      }
    } else {
      hoverAndFlapLoop.start();
      breathLoop.start();
      headLoop.start();
      tailLoop.start();
      tailFlickerLoop.start();
      crownBobLoop.start();
      scheduleAutonomousMicroBehavior();
      if (!isLit && isAtRisk) {
        eyeBlinkAnim.setValue(0.42);
      } else {
        scheduleOrganicBlinkAndSaccade();
      }
      if (isLit && growth.hasHorizontalDrift) {
        driftLoop.start();
      }
    }

    if (isLit && growth.hasAmbientEmbers) {
      e1.start();
      e2.start();
    }

    haloLoop.start();

    return () => {
      isMounted = false;
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (microTimeout) clearTimeout(microTimeout);
      eggLoop.stop();
      hoverAndFlapLoop.stop();
      breathLoop.stop();
      driftLoop.stop();
      headLoop.stop();
      tailLoop.stop();
      tailFlickerLoop.stop();
      crownBobLoop.stop();
      haloLoop.stop();
      e1.stop();
      e2.stop();
    };
  }, [
    isLit,
    isAtRisk,
    currentStage.id,
    baseScale,
    days,
    growth.subTier,
    growth.level,
    growth.hasHorizontalDrift,
    growth.hasAmbientEmbers,
    organic.wingDownstrokeMs,
    organic.wingUpstrokeMs,
    organic.breathCycleMs,
  ]);

  // ─── Organic Action Postures (Feed / Roar / Pet / Tap) ───
  const playReactionAnimation = (
    emoji: string,
    mode: "tap" | "feed" | "roar" | "pet"
  ) => {
    setReactionEmoji(emoji);
    reactionFloatAnim.setValue(0);

    const isBigBurst = mode === "feed" || mode === "roar";
    const springPeak = isBigBurst ? 1.13 : 1.06 + growth.subTier * 0.015;

    const animations: Animated.CompositeAnimation[] = [
      // Elastic body squash & jump
      Animated.sequence([
        Animated.timing(tapScaleAnim, {
          toValue: 0.9,
          duration: 65,
          useNativeDriver: true,
        }),
        Animated.spring(tapScaleAnim, {
          toValue: springPeak,
          friction: 4,
          tension: 190,
          useNativeDriver: true,
        }),
        Animated.spring(tapScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
      ]),
      // Floating reaction badge
      Animated.sequence([
        Animated.timing(reactionFloatAnim, {
          toValue: 1,
          duration: 980,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(reactionFloatAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ];

    if (mode === "feed") {
      // Glowing Bara Api snack arcs into mouth + 3 happy chomps + warm cheek blush + happy eye squint
      snackArcAnim.setValue(0);
      jawChompAnim.setValue(0);
      animations.push(
        Animated.sequence([
          Animated.timing(snackArcAnim, {
            toValue: 1,
            duration: 340,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(snackArcAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        // 3 rhythmic jaw chomps as snack arrives
        Animated.sequence([
          Animated.delay(240),
          Animated.timing(jawChompAnim, { toValue: 1, duration: 85, useNativeDriver: true }),
          Animated.timing(jawChompAnim, { toValue: 0, duration: 85, useNativeDriver: true }),
          Animated.timing(jawChompAnim, { toValue: 1, duration: 85, useNativeDriver: true }),
          Animated.timing(jawChompAnim, { toValue: 0, duration: 85, useNativeDriver: true }),
          Animated.timing(jawChompAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
          Animated.timing(jawChompAnim, { toValue: 0, duration: 90, useNativeDriver: true }),
        ]),
        // Happy eye squint (^ ^) & warm cheek blush
        Animated.sequence([
          Animated.delay(280),
          Animated.parallel([
            Animated.timing(happySquintAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(cheekBlushAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
          ]),
          Animated.delay(620),
          Animated.parallel([
            Animated.timing(happySquintAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
            Animated.timing(cheekBlushAnim, { toValue: 0.25, duration: 240, useNativeDriver: true }),
          ]),
        ])
      );
    } else if (mode === "pet") {
      // Affectionate head lean + happy squint + rosy cheeks
      animations.push(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(happySquintAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
            Animated.timing(cheekBlushAnim, { toValue: 0.95, duration: 140, useNativeDriver: true }),
            Animated.timing(headTiltAnim, { toValue: 2.2, duration: 220, useNativeDriver: true }),
          ]),
          Animated.timing(headTiltAnim, { toValue: -1.8, duration: 260, useNativeDriver: true }),
          Animated.timing(headTiltAnim, { toValue: 1.5, duration: 220, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(happySquintAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
            Animated.timing(cheekBlushAnim, { toValue: 0.25, duration: 260, useNativeDriver: true }),
            Animated.timing(headTiltAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
          ]),
        ])
      );
    } else {
      // Roar or Tap: jaw opens & cascading fire breath erupts
      roarBurstAnim.setValue(0);
      animations.push(
        Animated.sequence([
          Animated.timing(roarBurstAnim, {
            toValue: 1,
            duration: mode === "roar" ? 280 : 210,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(roarBurstAnim, {
            toValue: 0,
            duration: mode === "roar" ? 560 : 380,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    }

    Animated.parallel(animations).start();
  };

  useEffect(() => {
    if (feedTrigger > 0 && days >= 1) {
      playReactionAnimation("🍖❤️", "feed");
    }
  }, [feedTrigger]);

  useEffect(() => {
    if (roarTrigger > 0 && days >= 1) {
      playReactionAnimation("🔥✨", "roar");
    }
  }, [roarTrigger]);

  useEffect(() => {
    if (petTrigger > 0 && days >= 1) {
      playReactionAnimation("💚✨", "pet");
    }
  }, [petTrigger]);

  // Hide pet completely before user accomplishes the streak
  if (days < 1) {
    return null;
  }

  const handlePress = () => {
    if (!interactive) return;

    HapticFeedback.streakSparkle();
    soundFX.playMascotInteraction(currentStage.id);

    const emojis = !isLit && isAtRisk ? ["💤", "🥺🔥"] : ["🔥", "❤️", "✨"];
    const picked = emojis[Math.floor(Math.random() * emojis.length)];
    playReactionAnimation(picked, "tap");

    if (onMascotPress) {
      onMascotPress(currentStage);
    }
  };

  // ─── Biomechanical Interpolations ───
  const eggRotate = wobbleAnim.interpolate({
    inputRange: [-7, 7],
    outputRange: ["-7deg", "7deg"],
  });

  const eggScaleX = eggSquashAnim.interpolate({
    inputRange: [0.93, 1, 1.05],
    outputRange: [1.05, 1, 0.96],
  });

  const wingDownDeg = !isLit && isAtRisk ? -14 : growth.subTier === 1 ? -8 : growth.subTier === 2 ? -12 : -15;
  const wingUpDeg = !isLit && isAtRisk ? 3 : growth.subTier === 1 ? 11 : growth.subTier === 2 ? 15 : 19;
  const wingTapDeg = wingUpDeg + 11;

  const wingFlareExtra = roarBurstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });
  const combinedWing = Animated.add(wingFlapAnim, wingFlareExtra);

  const leftWingRotate = combinedWing.interpolate({
    inputRange: [0, 1, 1.3],
    outputRange: [`${wingDownDeg}deg`, `${wingUpDeg}deg`, `${wingTapDeg}deg`],
  });

  const rightWingRotate = combinedWing.interpolate({
    inputRange: [0, 1, 1.3],
    outputRange: [`${-wingDownDeg}deg`, `${-wingUpDeg}deg`, `${-wingTapDeg}deg`],
  });

  // Secondary feather/pinion tip rotation (lags shoulder for organic fluid flex)
  const leftWingTipRotate = wingTipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "14deg"],
  });
  const rightWingTipRotate = wingTipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["8deg", "-14deg"],
  });

  // 3-Segment Kinematic Wave Tail Rotations
  const tailBaseRotate = tailWagAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-8deg", "10deg"],
  });
  const tailMidRotate = tailWaveLagAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-12deg", "14deg"],
  });
  const tailTipRotate = tailWaveLagAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-15deg", "18deg"],
  });

  const bodyPitchRotate = bodyPitchAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-1.6deg", "1.4deg"],
  });

  const headRotate = headTiltAnim.interpolate({
    inputRange: [-2.5, 2.5],
    outputRange: ["-7deg", "7deg"],
  });

  const leftEarRotate = earFlutterAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-18deg", "-6deg"],
  });
  const rightEarRotate = earFlutterAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["18deg", "6deg"],
  });

  const combinedJawOpen = Animated.add(roarBurstAnim, jawChompAnim);
  const jawDropY = combinedJawOpen.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 3.5 + growth.subTier, 5],
    extrapolate: "clamp",
  });

  const pupilOffsetX = pupilLookAnim.interpolate({
    inputRange: [-1.5, 0, 1.5],
    outputRange: [-1.6, 0, 1.6],
    extrapolate: "clamp",
  });
  const pupilOffsetY = pupilLookYAnim.interpolate({
    inputRange: [-1.5, 0, 1.5],
    outputRange: [-1.1, 0, 1.1],
    extrapolate: "clamp",
  });

  const shadowScaleX = bounceAnim.interpolate({
    inputRange: [-6, 0, 3],
    outputRange: [0.82, 1, 1.06],
    extrapolate: "clamp",
  });
  const shadowOpacity = bounceAnim.interpolate({
    inputRange: [-6, 0, 3],
    outputRange: [0.22, 0.36, 0.42],
    extrapolate: "clamp",
  });

  // Elemental & Stage Palette Resolution
  const palette = (() => {
    if (!isLit && !isAtRisk) {
      return {
        scales: "#475569",
        scalesDark: "#334155",
        scalesHighlight: "#64748B",
        belly: "#94A3B8",
        horn: "#64748B",
        wingMembrane: "#334155",
        wingBone: "#475569",
        eyeGlow: "#CBD5E1",
        fireOuter: "#64748B",
        fireMid: "#94A3B8",
        fireInner: "#CBD5E1",
        aura: "#64748B",
      };
    }
    if (!isLit && isAtRisk) {
      return {
        scales: "#9A3412",
        scalesDark: "#7C2D12",
        scalesHighlight: "#C2410C",
        belly: "#FDBA74",
        horn: "#D97706",
        wingMembrane: "#B45309",
        wingBone: "#78350F",
        eyeGlow: "#FDE68A",
        fireOuter: "#F97316",
        fireMid: "#FBBF24",
        fireInner: "#FEF3C7",
        aura: "#F97316",
      };
    }
    if (element === "fire") {
      return {
        scales: "#DC2626",
        scalesDark: "#991B1B",
        scalesHighlight: "#F87171",
        belly: "#FDE68A",
        horn: "#FACC15",
        wingMembrane: "#F97316",
        wingBone: "#7C2D12",
        eyeGlow: "#FEF08A",
        fireOuter: "#EF4444",
        fireMid: "#FF9600",
        fireInner: "#FEF08A",
        aura: "#EF4444",
      };
    }
    if (element === "ice") {
      return {
        scales: "#0284C7",
        scalesDark: "#0369A1",
        scalesHighlight: "#38BDF8",
        belly: "#E0F2FE",
        horn: "#67E8F9",
        wingMembrane: "#38BDF8",
        wingBone: "#075985",
        eyeGlow: "#CFFAFE",
        fireOuter: "#06B6D4",
        fireMid: "#38BDF8",
        fireInner: "#F0F9FF",
        aura: "#06B6D4",
      };
    }
    if (element === "emerald") {
      return {
        scales: "#059669",
        scalesDark: "#065F46",
        scalesHighlight: "#34D399",
        belly: "#A7F3D0",
        horn: "#FDE047",
        wingMembrane: "#10B981",
        wingBone: "#064E3B",
        eyeGlow: "#FEF08A",
        fireOuter: "#10B981",
        fireMid: "#34D399",
        fireInner: "#ECFDF5",
        aura: "#10B981",
      };
    }
    if (element === "solar") {
      return {
        scales: "#D97706",
        scalesDark: "#92400E",
        scalesHighlight: "#FBBF24",
        belly: "#FEF3C7",
        horn: "#FFFBEB",
        wingMembrane: "#F59E0B",
        wingBone: "#78350F",
        eyeGlow: "#FFFFFF",
        fireOuter: "#F59E0B",
        fireMid: "#FACC15",
        fireInner: "#FFFFFF",
        aura: "#F59E0B",
      };
    }
    if (element === "cosmic") {
      return {
        scales: "#6D28D9",
        scalesDark: "#4C1D95",
        scalesHighlight: "#A78BFA",
        belly: "#EDE9FE",
        horn: "#FBBF24",
        wingMembrane: "#8B5CF6",
        wingBone: "#4C1D95",
        eyeGlow: "#FEF08A",
        fireOuter: "#7C3AED",
        fireMid: "#A78BFA",
        fireInner: "#FEF3C7",
        aura: "#8B5CF6",
      };
    }
    if (currentStage.id === "baby") {
      return {
        scales: "#0EA5E9",
        scalesDark: "#0284C7",
        scalesHighlight: "#7DD3FC",
        belly: "#BAE6FD",
        horn: "#FDE047",
        wingMembrane: "#38BDF8",
        wingBone: "#0369A1",
        eyeGlow: "#FEF08A",
        fireOuter: "#FF7A00",
        fireMid: "#FFB800",
        fireInner: "#FFFBEB",
        aura: currentStage.themeColor,
      };
    }
    if (currentStage.id === "winged") {
      return {
        scales: "#DC2626",
        scalesDark: "#991B1B",
        scalesHighlight: "#F87171",
        belly: "#FDE68A",
        horn: "#F59E0B",
        wingMembrane: "#F97316",
        wingBone: "#7C2D12",
        eyeGlow: "#FEF08A",
        fireOuter: "#EF4444",
        fireMid: "#FF9600",
        fireInner: "#FEF08A",
        aura: currentStage.themeColor,
      };
    }
    if (currentStage.id === "deity") {
      return {
        scales: "#6D28D9",
        scalesDark: "#4C1D95",
        scalesHighlight: "#A78BFA",
        belly: "#EDE9FE",
        horn: "#FBBF24",
        wingMembrane: "#8B5CF6",
        wingBone: "#4C1D95",
        eyeGlow: "#FEF08A",
        fireOuter: "#7C3AED",
        fireMid: "#A78BFA",
        fireInner: "#FEF3C7",
        aura: currentStage.themeColor,
      };
    }
    return {
      scales: "#EA580C",
      scalesDark: "#9A3412",
      scalesHighlight: "#FB923C",
      belly: "#FED7AA",
      horn: "#FACC15",
      wingMembrane: "#FB923C",
      wingBone: "#C2410C",
      eyeGlow: "#FEF08A",
      fireOuter: "#FF7A00",
      fireMid: "#FFB800",
      fireInner: "#FEF08A",
      aura: currentStage.themeColor,
    };
  })();

  const stageColor = palette.aura;

  // ─── Helper: Organic Soulful Eyes with Dual Specular Glints & Happy Squint ───
  const renderOrganicEyes = (eyeWidth: number, eyeHeight: number, eyeColor?: string) => {
    const irisColor = eyeColor || palette.eyeGlow;
    return (
      <View style={styles.dragonEyesRow}>
        {[0, 1].map((eyeIdx) => (
          <Animated.View
            key={eyeIdx}
            style={[
              styles.dragonEyeOrb,
              {
                width: eyeWidth,
                height: eyeHeight,
                borderRadius: eyeWidth / 2,
                backgroundColor: irisColor,
                transform: [{ scaleY: eyeBlinkAnim }],
              },
            ]}
          >
            {/* Moving Reptilian Pupil */}
            <Animated.View
              style={[
                styles.dragonSlitPupil,
                {
                  height: eyeHeight * 0.78,
                  transform: [
                    { translateX: pupilOffsetX },
                    { translateY: pupilOffsetY },
                  ],
                },
              ]}
            />
            {/* Primary & Secondary Specular Catchlight Glints (makes eyes feel alive!) */}
            <View style={styles.eyeSpecularBig} />
            <View style={styles.eyeSpecularSmall} />
            {/* Happy Lower Eyelid Crescent when Petted / Fed */}
            <Animated.View
              style={[
                styles.happyEyelidCrescent,
                {
                  backgroundColor: palette.scales,
                  opacity: happySquintAnim,
                  transform: [
                    {
                      translateY: happySquintAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [eyeHeight, eyeHeight * 0.28],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>
        ))}
      </View>
    );
  };

  // ─── Helper: Twin Nostril Warm Breath Wisps on Exhale ───
  const renderNostrilBreathWisps = () => {
    if (!isLit) return null;
    return (
      <View style={styles.nostrilWispContainer} pointerEvents="none">
        {[-1, 1].map((dir, i) => (
          <Animated.View
            key={i}
            style={[
              styles.nostrilWispOrb,
              {
                backgroundColor: palette.fireInner,
                transform: [
                  {
                    translateX: nostrilPuffAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [dir * 3, dir * 11],
                    }),
                  },
                  {
                    translateY: nostrilPuffAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -5],
                    }),
                  },
                  {
                    scale: nostrilPuffAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1, 1.35],
                    }),
                  },
                ],
                opacity: nostrilPuffAnim.interpolate({
                  inputRange: [0, 0.25, 0.8, 1],
                  outputRange: [0, 0.65, 0.35, 0],
                }),
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // ─── Helper: 3-Segment Nested Kinematic Wave Tail ───
  const renderKinematicTail = (baseWidth: number, flameSize: number) => (
    <Animated.View
      style={[
        styles.dragonTailWrap,
        {
          right: -(baseWidth * 1.45),
          bottom: 5,
          transform: [
            { translateX: -baseWidth * 0.4 },
            { rotate: tailBaseRotate },
            { translateX: baseWidth * 0.4 },
          ],
        },
      ]}
    >
      {/* Segment 1: Muscular Tail Base */}
      <View
        style={[
          styles.tailSegBase,
          {
            width: baseWidth,
            height: Math.round(baseWidth * 0.44),
            backgroundColor: palette.scalesDark,
          },
        ]}
      >
        {/* Segment 2: Articulated Mid Tail (rotates with phase lag) */}
        <Animated.View
          style={[
            styles.tailSegMid,
            {
              width: Math.round(baseWidth * 0.78),
              height: Math.round(baseWidth * 0.34),
              right: -Math.round(baseWidth * 0.55),
              backgroundColor: palette.scales,
              transform: [{ rotate: tailMidRotate }],
            },
          ]}
        >
          {/* Segment 3: Tapered Tail Tip + Dual-Core Flickering Flame */}
          <Animated.View
            style={[
              styles.dragonTailFlameOuter,
              {
                width: flameSize,
                height: Math.round(flameSize * 1.25),
                right: -Math.round(flameSize * 0.65),
                backgroundColor: palette.fireOuter,
                transform: [
                  { rotate: tailTipRotate },
                  { scale: tailFlameFlickerAnim },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.dragonTailFlameMid,
                { backgroundColor: palette.fireMid },
              ]}
            >
              <View
                style={[
                  styles.dragonTailFlameInner,
                  { backgroundColor: palette.fireInner },
                ]}
              />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );

  // ─── Helper: Cascading Fire / Plasma Breath Plume ───
  const renderCascadingFireBreath = (jetSize: number) => {
    if (!isLit) return null;

    const allParticles = [
      { dx: 0, dy: 16, color: palette.fireInner, sz: jetSize * 0.76 },
      { dx: -7, dy: 13, color: palette.fireOuter, sz: jetSize * 0.88 },
      { dx: 7, dy: 13, color: palette.fireMid, sz: jetSize * 0.82 },
    ];
    const particles = allParticles.slice(0, growth.flamePuffCount);

    return (
      <View style={styles.fireBreathEmitter} pointerEvents="none">
        {particles.map((p, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.fireParticleOrb,
              {
                width: p.sz,
                height: p.sz,
                borderRadius: p.sz / 2,
                backgroundColor: p.color,
                transform: [
                  {
                    translateY: roarBurstAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, p.dy],
                    }),
                  },
                  {
                    translateX: roarBurstAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, p.dx],
                    }),
                  },
                  {
                    scale: roarBurstAnim.interpolate({
                      inputRange: [0, 0.4, 1],
                      outputRange: [0.2, 0.95, 1.1],
                    }),
                  },
                ],
                opacity: roarBurstAnim.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 0.85, 0.95],
                }),
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        { width: size * 1.75, height: size * 1.7 },
        style,
      ]}
    >
      {/* ─── Soft Ambient Dragon Aura Halo ─── */}
      {isLit && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.haloRing,
            {
              width: size * (1.22 + growth.subTier * 0.06),
              height: size * (1.22 + growth.subTier * 0.06),
              borderRadius: (size * (1.22 + growth.subTier * 0.06)) / 2,
              backgroundColor: stageColor,
              borderColor: stageColor,
              opacity: growth.subTier === 3 ? 0.16 : 0.11,
              borderWidth: growth.subTier === 3 ? 1.5 : 1,
              transform: [{ scale: haloScaleAnim }],
            },
          ]}
        />
      )}

      {/* ─── Calm Floating Embers ─── */}
      {isLit && growth.hasAmbientEmbers && (
        <>
          {[
            { anim: emberAnim1, left: size * 0.46, dx: -6 * baseScale, color: palette.fireMid },
            { anim: emberAnim2, left: size * 1.24, dx: 6 * baseScale, color: palette.horn },
          ].map((e, idx) => (
            <Animated.View
              key={idx}
              pointerEvents="none"
              style={[
                styles.spark,
                {
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: e.color,
                  left: e.left,
                  transform: [
                    {
                      translateY: e.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8 * baseScale, -size * 0.45],
                      }),
                    },
                    {
                      translateX: e.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, e.dx],
                      }),
                    },
                  ],
                  opacity: e.anim.interpolate({
                    inputRange: [0, 0.3, 0.8, 1],
                    outputRange: [0, 0.65, 0.45, 0],
                  }),
                },
              ]}
            />
          ))}
        </>
      )}

      {/* ─── Subtle Ground Shadow Beneath Dragon ─── */}
      {currentStage.id !== "egg" && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.groundShadow,
            {
              bottom: 10 * baseScale,
              width: 60 * scale,
              height: 10 * baseScale,
              borderRadius: 30 * baseScale,
              transform: [{ scaleX: shadowScaleX }],
              opacity: shadowOpacity,
            },
          ]}
        />
      )}

      {/* ─── Flying Bara Api Snack Orb When Fed ─── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.baraSnackOrb,
          {
            backgroundColor: palette.fireMid,
            borderColor: palette.fireInner,
            transform: [
              {
                translateX: snackArcAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-36 * baseScale, -14 * baseScale, 0],
                }),
              },
              {
                translateY: snackArcAnim.interpolate({
                  inputRange: [0, 0.45, 1],
                  outputRange: [28 * baseScale, -18 * baseScale, -4 * baseScale],
                }),
              },
              {
                scale: snackArcAnim.interpolate({
                  inputRange: [0, 0.2, 0.85, 1],
                  outputRange: [0.2, 1.15, 0.95, 0.1],
                }),
              },
            ],
            opacity: snackArcAnim.interpolate({
              inputRange: [0, 0.15, 0.9, 1],
              outputRange: [0, 1, 1, 0],
            }),
          },
        ]}
      />

      {/* ─── Sleepy / Hungry Bubble When Streak Is At-Risk ─── */}
      {!isLit && isAtRisk && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sleepyBubble,
            {
              top: 6 * baseScale,
              right: 12 * baseScale,
              transform: [{ translateY: bounceAnim }],
            },
          ]}
        >
          <Text style={{ fontSize: 13 * baseScale }}>💤🍖</Text>
        </Animated.View>
      )}

      {/* ─── Floating Reaction Emoji Fountain on Tap / Feed / Pet ─── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.reactionFloatingBadge,
          {
            top: 12 * baseScale,
            transform: [
              {
                translateY: reactionFloatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10 * baseScale, -28 * baseScale],
                }),
              },
              {
                scale: reactionFloatAnim.interpolate({
                  inputRange: [0, 0.25, 0.8, 1],
                  outputRange: [0.3, 1.25, 1.1, 0.7],
                }),
              },
            ],
            opacity: reactionFloatAnim.interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 1, 0.9, 0],
            }),
          },
        ]}
      >
        <Text style={{ fontSize: 16 * baseScale }}>{reactionEmoji}</Text>
      </Animated.View>

      {/* ─── Dragon Stage Character Sculpture ─── */}
      <Animated.View
        style={[
          styles.mascotWrapper,
          {
            transform: [
              { scale: tapScaleAnim },
              { translateX: driftXAnim },
              { translateY: currentStage.id === "egg" ? eggJumpAnim : bounceAnim },
              { rotate: currentStage.id === "egg" ? "0deg" : bodyPitchRotate },
            ],
          },
        ]}
      >
        {/* ============================================================
            STAGE 1 (1–6 Days): TELUR NAGA API (Organic Pulsing Egg)
           ============================================================ */}
        {currentStage.id === "egg" && (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Animated.View
              style={[
                styles.eggContainer,
                {
                  width: 68 * scale,
                  height: 86 * scale,
                  borderRadius: 36 * scale,
                  borderColor: isLit ? "#F59E0B" : "#64748B",
                  backgroundColor: palette.scales,
                  transform: [
                    { rotate: eggRotate },
                    { scaleY: eggSquashAnim },
                    { scaleX: eggScaleX },
                  ],
                },
              ]}
            >
              {/* Curved Peeking Dragon Horn Buds (Day 3+ / SubTier >= 2) */}
              {growth.subTier >= 2 && (
                <>
                  <View
                    style={[
                      styles.organicHornBudLeft,
                      { backgroundColor: palette.horn, transform: [{ scale }, { rotate: "-26deg" }] },
                    ]}
                  />
                  <View
                    style={[
                      styles.organicHornBudRight,
                      { backgroundColor: palette.horn, transform: [{ scale }, { rotate: "26deg" }] },
                    ]}
                  />
                </>
              )}

              {/* Volumetric Specular Shell Highlight */}
              <View
                style={[
                  styles.eggSpecularArc,
                  { backgroundColor: palette.scalesHighlight },
                ]}
              />

              {/* Lub-Dub Heartbeat Magma Core Glow */}
              <Animated.View
                style={[
                  styles.eggInnerGlow,
                  {
                    backgroundColor: isLit ? "#FEF08A" : "#64748B",
                    opacity: growth.subTier === 1 ? 0.34 : growth.subTier === 2 ? 0.48 : 0.62,
                    transform: [{ scale: heartbeatAnim }],
                  },
                ]}
              />

              {/* Organic Overlapping Dragon Scale Plates */}
              <View style={[styles.eggScalePatch, { top: 14 * scale, left: 12 * scale, backgroundColor: palette.scalesDark }]} />
              <View style={[styles.eggScalePatch, { top: 24 * scale, right: 10 * scale, backgroundColor: palette.scalesDark }]} />
              <View style={[styles.eggScalePatch, { bottom: 18 * scale, left: 14 * scale, backgroundColor: palette.scalesDark }]} />

              {/* Peeking Soulful Dragon Eyes Inside Shell Crack (Day 5–6 / SubTier 3) */}
              {growth.subTier >= 3 && (
                <View style={{ position: "absolute", top: 22 * scale, zIndex: 4 }}>
                  {renderOrganicEyes(9 * scale, 9 * scale)}
                </View>
              )}

              {/* Glowing Magma Fissure Cracks */}
              <View style={[styles.eggCrackLine1, { backgroundColor: palette.fireInner }]} />
              {growth.subTier >= 2 && (
                <View style={[styles.eggCrackLine2, { backgroundColor: palette.fireInner }]} />
              )}
            </Animated.View>

            {/* Warm Woven Ember Nest Base */}
            <View
              style={[
                styles.eggNestBase,
                {
                  width: 78 * scale,
                  height: 18 * scale,
                  backgroundColor: isLit ? "#7C2D12" : "#334155",
                  borderColor: isLit ? "#F97316" : "#475569",
                },
              ]}
            />
          </View>
        )}

        {/* ============================================================
            STAGE 2 (7–29 Days): TUKIK NAGA BARA (Organic Baby Hatchling)
           ============================================================ */}
        {currentStage.id === "baby" && (
          <View style={[styles.babyBody, { transform: [{ scale }] }]}>
            {/* 3-Segment Kinematic Wave Baby Tail */}
            {renderKinematicTail(22, growth.subTier === 1 ? 14 : growth.subTier === 2 ? 17 : 20)}

            {/* 2-Joint Articulated Left Baby Wing (Shoulder + Lagging Pinion Tip) */}
            <Animated.View
              style={[
                styles.dragonWingLeft,
                {
                  left: -35,
                  top: 16,
                  transform: [
                    { translateX: 18 },
                    { rotate: leftWingRotate },
                    { translateX: -18 },
                  ],
                },
              ]}
            >
              <View style={[styles.babyWingShape, { backgroundColor: palette.wingMembrane, borderColor: palette.wingBone }]}>
                <Animated.View
                  style={[
                    styles.wingPinionFeatherLeft,
                    {
                      backgroundColor: palette.scalesHighlight,
                      transform: [{ rotate: leftWingTipRotate }],
                    },
                  ]}
                />
                <View style={[styles.wingMembraneLobe, { backgroundColor: palette.scalesDark, opacity: 0.25 }]} />
              </View>
            </Animated.View>

            {/* 2-Joint Articulated Right Baby Wing */}
            <Animated.View
              style={[
                styles.dragonWingRight,
                {
                  right: -35,
                  top: 16,
                  transform: [
                    { translateX: -18 },
                    { rotate: rightWingRotate },
                    { translateX: 18 },
                  ],
                },
              ]}
            >
              <View style={[styles.babyWingShapeRight, { backgroundColor: palette.wingMembrane, borderColor: palette.wingBone }]}>
                <Animated.View
                  style={[
                    styles.wingPinionFeatherRight,
                    {
                      backgroundColor: palette.scalesHighlight,
                      transform: [{ rotate: rightWingTipRotate }],
                    },
                  ]}
                />
                <View style={[styles.wingMembraneLobe, { backgroundColor: palette.scalesDark, opacity: 0.25 }]} />
              </View>
            </Animated.View>

            {/* Soft Neck Bridge connecting Head & Torso */}
            <View style={[styles.neckBridge, { backgroundColor: palette.scalesDark }]} />

            {/* Breathing Plump Baby Dragon Torso, Warm Belly & Forepaws */}
            <Animated.View
              style={[
                styles.babyTorso,
                {
                  backgroundColor: palette.scales,
                  borderColor: palette.scalesDark,
                  transform: [{ scaleX: chestScaleAnim }, { scaleY: chestScaleAnim }],
                },
              ]}
            >
              <View style={[styles.torsoHighlightArc, { backgroundColor: palette.scalesHighlight }]} />
              <Animated.View
                style={[
                  styles.dragonBellyPatch,
                  {
                    backgroundColor: palette.belly,
                    opacity: bellyGlowAnim,
                  },
                ]}
              >
                <View style={styles.bellyRibLine} />
                <View style={styles.bellyRibLine} />
                {growth.subTier >= 2 && <View style={styles.bellyRibLine} />}
              </Animated.View>
              {/* Resting Forepaws on Chest */}
              <View style={[styles.forepawLeft, { backgroundColor: palette.scalesDark }]} />
              <View style={[styles.forepawRight, { backgroundColor: palette.scalesDark }]} />
              {/* Rounded Hind Feet */}
              <View style={[styles.dragonFootLeft, { backgroundColor: palette.scalesDark }]} />
              <View style={[styles.dragonFootRight, { backgroundColor: palette.scalesDark }]} />
            </Animated.View>

            {/* Expressive Tilting Baby Dragon Head */}
            <Animated.View
              style={[
                styles.babyDragonHead,
                {
                  backgroundColor: palette.scales,
                  borderColor: palette.scalesDark,
                  transform: [
                    { translateY: headBobAnim },
                    { rotate: headRotate },
                  ],
                },
              ]}
            >
              {/* Volumetric Forehead Highlight */}
              <View style={[styles.headCrownHighlight, { backgroundColor: palette.scalesHighlight }]} />

              {/* Curved Organic Tapered Horns (replaces harsh CSS triangles) */}
              <View style={[styles.organicBabyHornLeft, { backgroundColor: palette.horn }]} />
              <View style={[styles.organicBabyHornRight, { backgroundColor: palette.horn }]} />
              {growth.subTier >= 2 && (
                <View style={[styles.organicCrestBud, { backgroundColor: palette.horn }]} />
              )}

              {/* Fluttering Ear Frills on Sides of Head */}
              <Animated.View
                style={[
                  styles.earFrillLeft,
                  {
                    backgroundColor: palette.wingMembrane,
                    borderColor: palette.horn,
                    transform: [{ rotate: leftEarRotate }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.earFrillRight,
                  {
                    backgroundColor: palette.wingMembrane,
                    borderColor: palette.horn,
                    transform: [{ rotate: rightEarRotate }],
                  },
                ]}
              />

              {/* Soulful Blinking Eyes with Dual Specular Glints & Happy Squint */}
              {renderOrganicEyes(11.5, 11.5)}

              {/* Warm Rosy Cheek Blushes */}
              <View style={styles.cheekBlushRow} pointerEvents="none">
                <Animated.View style={[styles.cheekBlushOrb, { opacity: cheekBlushAnim }]} />
                <Animated.View style={[styles.cheekBlushOrb, { opacity: cheekBlushAnim }]} />
              </View>

              {/* Sculpted Snout, Nostril Breath Wisps & Chomping Lower Jaw */}
              <View style={[styles.dragonSnout, { backgroundColor: palette.scalesDark }]}>
                {renderNostrilBreathWisps()}
                <View style={styles.nostrilsRow}>
                  <View style={styles.nostrilDot} />
                  <View style={styles.nostrilDot} />
                </View>
                <Animated.View
                  style={[
                    styles.fangsRow,
                    { transform: [{ translateY: jawDropY }] },
                  ]}
                >
                  <View style={styles.roundedFang} />
                  <View style={styles.roundedFang} />
                </Animated.View>
              </View>

              {renderCascadingFireBreath(13)}
            </Animated.View>
          </View>
        )}

        {/* ============================================================
            STAGE 3 (30–99 Days): NAGA LANGIT PERKASA (Organic Sky Drake)
           ============================================================ */}
        {currentStage.id === "winged" && (
          <View style={[styles.wingedBody, { transform: [{ scale }] }]}>
            {/* 3-Segment Kinematic Wave Drake Tail */}
            {renderKinematicTail(28, 19 + growth.subTier * 2)}

            {/* 2-Joint Articulated Broad Left Drake Wing */}
            <Animated.View
              style={[
                styles.drakeWingLeft,
                {
                  left: -55,
                  top: 2,
                  transform: [
                    { translateX: 26 },
                    { rotate: leftWingRotate },
                    { translateX: -26 },
                  ],
                },
              ]}
            >
              <View style={[styles.drakeWingMembraneLeft, { backgroundColor: palette.wingMembrane, borderColor: palette.wingBone }]}>
                <Animated.View
                  style={[
                    styles.drakePinionTipLeft,
                    {
                      backgroundColor: palette.scalesHighlight,
                      borderColor: palette.horn,
                      transform: [{ rotate: leftWingTipRotate }],
                    },
                  ]}
                />
                <View style={[styles.wingBoneRib1, { backgroundColor: palette.wingBone }]} />
                <View style={[styles.wingBoneRib2, { backgroundColor: palette.wingBone }]} />
              </View>
            </Animated.View>

            {/* 2-Joint Articulated Broad Right Drake Wing */}
            <Animated.View
              style={[
                styles.drakeWingRight,
                {
                  right: -55,
                  top: 2,
                  transform: [
                    { translateX: -26 },
                    { rotate: rightWingRotate },
                    { translateX: 26 },
                  ],
                },
              ]}
            >
              <View style={[styles.drakeWingMembraneRight, { backgroundColor: palette.wingMembrane, borderColor: palette.wingBone }]}>
                <Animated.View
                  style={[
                    styles.drakePinionTipRight,
                    {
                      backgroundColor: palette.scalesHighlight,
                      borderColor: palette.horn,
                      transform: [{ rotate: rightWingTipRotate }],
                    },
                  ]}
                />
                <View style={[styles.wingBoneRib1, { backgroundColor: palette.wingBone }]} />
                <View style={[styles.wingBoneRib2, { backgroundColor: palette.wingBone }]} />
              </View>
            </Animated.View>

            {/* Muscular Neck Bridge */}
            <View style={[styles.neckBridge, { width: 28, backgroundColor: palette.scalesDark }]} />

            {/* Breathing Armored Drake Torso & Warm Belly */}
            <Animated.View
              style={[
                styles.drakeTorso,
                {
                  backgroundColor: palette.scales,
                  borderColor: palette.scalesDark,
                  transform: [{ scaleX: chestScaleAnim }, { scaleY: chestScaleAnim }],
                },
              ]}
            >
              <View style={[styles.torsoHighlightArc, { backgroundColor: palette.scalesHighlight }]} />
              <Animated.View
                style={[
                  styles.dragonBellyPatch,
                  {
                    height: 42,
                    backgroundColor: palette.belly,
                    opacity: bellyGlowAnim,
                  },
                ]}
              >
                <View style={styles.bellyRibLine} />
                <View style={styles.bellyRibLine} />
                <View style={styles.bellyRibLine} />
                {growth.subTier >= 2 && <View style={styles.bellyRibLine} />}
              </Animated.View>
              <View style={[styles.forepawLeft, { backgroundColor: palette.horn }]} />
              <View style={[styles.forepawRight, { backgroundColor: palette.horn }]} />
              <View style={[styles.dragonFootLeft, { backgroundColor: palette.horn }]} />
              <View style={[styles.dragonFootRight, { backgroundColor: palette.horn }]} />
            </Animated.View>

            {/* Expressive Horned Sky Drake Head */}
            <Animated.View
              style={[
                styles.drakeHead,
                {
                  backgroundColor: palette.scales,
                  borderColor: palette.scalesDark,
                  transform: [
                    { translateY: headBobAnim },
                    { rotate: headRotate },
                  ],
                },
              ]}
            >
              <View style={[styles.headCrownHighlight, { backgroundColor: palette.scalesHighlight }]} />

              {growth.hasCrown && (
                <Animated.View
                  style={[
                    styles.cosmicHaloCrown,
                    { transform: [{ translateY: crownBobAnim }] },
                  ]}
                />
              )}

              {/* Swept-Back Curved Multi-Segment Golden Horns */}
              <View style={[styles.organicDrakeHornLeft, { backgroundColor: palette.horn }]}>
                <View style={[styles.organicDrakeHornTipLeft, { backgroundColor: palette.fireInner }]} />
              </View>
              <View style={[styles.organicDrakeHornRight, { backgroundColor: palette.horn }]}>
                <View style={[styles.organicDrakeHornTipRight, { backgroundColor: palette.fireInner }]} />
              </View>
              <View style={[styles.organicCrestBud, { top: -12, backgroundColor: palette.horn }]} />

              {/* Fluttering Winged Ear Fins */}
              <Animated.View
                style={[
                  styles.earFrillLeft,
                  {
                    width: 12,
                    height: 16,
                    backgroundColor: palette.horn,
                    borderColor: palette.scalesDark,
                    transform: [{ rotate: leftEarRotate }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.earFrillRight,
                  {
                    width: 12,
                    height: 16,
                    backgroundColor: palette.horn,
                    borderColor: palette.scalesDark,
                    transform: [{ rotate: rightEarRotate }],
                  },
                ]}
              />

              {/* Soulful Eyes with Specular Glints & Happy Squint */}
              {renderOrganicEyes(12.5, 11)}

              {/* Warm Cheek Blushes */}
              <View style={styles.cheekBlushRow} pointerEvents="none">
                <Animated.View style={[styles.cheekBlushOrb, { opacity: cheekBlushAnim }]} />
                <Animated.View style={[styles.cheekBlushOrb, { opacity: cheekBlushAnim }]} />
              </View>

              {/* Sculpted Snout, Nostril Breath Wisps & Chomping Fangs */}
              <View style={[styles.drakeSnout, { backgroundColor: palette.scalesDark }]}>
                {renderNostrilBreathWisps()}
                <View style={styles.nostrilsRow}>
                  <View style={styles.nostrilDot} />
                  <View style={styles.nostrilDot} />
                </View>
                <Animated.View
                  style={[
                    styles.fangsRow,
                    { transform: [{ translateY: jawDropY }] },
                  ]}
                >
                  <View style={styles.roundedFangLarge} />
                  <View style={styles.roundedFangLarge} />
                </Animated.View>
              </View>

              {renderCascadingFireBreath(16)}
            </Animated.View>
          </View>
        )}

        {/* ============================================================
            STAGE 4 (100+ Days): NAGA AGUNG KOSMIK (Clean Crowned Elder Dragon)
           ============================================================ */}
        {currentStage.id === "deity" && (
          <View style={[styles.deityBody, { transform: [{ scale }] }]}>
            {/* Clean Single Pair of 2-Joint Articulated Royal Wings */}
            <Animated.View
              style={[
                styles.drakeWingLeft,
                {
                  left: -58,
                  top: 0,
                  transform: [
                    { translateX: 26 },
                    { rotate: leftWingRotate },
                    { translateX: -26 },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.drakeWingMembraneLeft,
                  {
                    width: 56,
                    height: 46,
                    backgroundColor: palette.wingMembrane,
                    borderColor: palette.horn,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.drakePinionTipLeft,
                    {
                      backgroundColor: palette.scalesHighlight,
                      borderColor: palette.horn,
                      transform: [{ rotate: leftWingTipRotate }],
                    },
                  ]}
                />
                <View style={[styles.wingBoneRib1, { backgroundColor: palette.wingBone }]} />
                <View style={[styles.wingBoneRib2, { backgroundColor: palette.wingBone }]} />
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.drakeWingRight,
                {
                  right: -58,
                  top: 0,
                  transform: [
                    { translateX: -26 },
                    { rotate: rightWingRotate },
                    { translateX: 26 },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.drakeWingMembraneRight,
                  {
                    width: 56,
                    height: 46,
                    backgroundColor: palette.wingMembrane,
                    borderColor: palette.horn,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.drakePinionTipRight,
                    {
                      backgroundColor: palette.scalesHighlight,
                      borderColor: palette.horn,
                      transform: [{ rotate: rightWingTipRotate }],
                    },
                  ]}
                />
                <View style={[styles.wingBoneRib1, { backgroundColor: palette.wingBone }]} />
                <View style={[styles.wingBoneRib2, { backgroundColor: palette.wingBone }]} />
              </View>
            </Animated.View>

            {/* 3-Segment Kinematic Wave Tail */}
            {renderKinematicTail(28, 22)}

            <View style={[styles.neckBridge, { width: 28, backgroundColor: palette.scalesDark }]} />

            {/* Clean Royal Torso with Single Star Emblem on Chest */}
            <Animated.View
              style={[
                styles.drakeTorso,
                {
                  backgroundColor: palette.scales,
                  borderColor: palette.scalesDark,
                  transform: [{ scaleX: chestScaleAnim }, { scaleY: chestScaleAnim }],
                },
              ]}
            >
              <View style={[styles.torsoHighlightArc, { backgroundColor: palette.scalesHighlight }]} />
              <Animated.View
                style={[
                  styles.dragonBellyPatch,
                  {
                    height: 42,
                    backgroundColor: palette.belly,
                    opacity: bellyGlowAnim,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.starCoreDiamond,
                    {
                      backgroundColor: palette.horn,
                      borderColor: palette.fireInner,
                      transform: [{ rotate: "45deg" }, { scale: haloScaleAnim }],
                    },
                  ]}
                />
              </Animated.View>
              <View style={[styles.forepawLeft, { backgroundColor: palette.horn }]} />
              <View style={[styles.forepawRight, { backgroundColor: palette.horn }]} />
              <View style={[styles.dragonFootLeft, { backgroundColor: palette.horn }]} />
              <View style={[styles.dragonFootRight, { backgroundColor: palette.horn }]} />
            </Animated.View>

            {/* Clean Crowned Elder Dragon Head */}
            <Animated.View
              style={[
                styles.drakeHead,
                {
                  backgroundColor: palette.scales,
                  borderColor: palette.scalesDark,
                  transform: [
                    { translateY: headBobAnim },
                    { rotate: headRotate },
                  ],
                },
              ]}
            >
              <View style={[styles.headCrownHighlight, { backgroundColor: palette.scalesHighlight }]} />

              {/* Floating Golden Crown Halo */}
              <Animated.View
                style={[
                  styles.cosmicHaloCrown,
                  {
                    borderColor: palette.horn,
                    transform: [{ translateY: crownBobAnim }],
                  },
                ]}
              />

              {/* Single Pair of Swept-Back Royal Horns */}
              <View style={[styles.organicDrakeHornLeft, { backgroundColor: palette.horn }]}>
                <View style={[styles.organicDrakeHornTipLeft, { backgroundColor: palette.fireInner }]} />
              </View>
              <View style={[styles.organicDrakeHornRight, { backgroundColor: palette.horn }]}>
                <View style={[styles.organicDrakeHornTipRight, { backgroundColor: palette.fireInner }]} />
              </View>

              {/* Clean Ear Frills */}
              <Animated.View
                style={[
                  styles.earFrillLeft,
                  {
                    width: 11,
                    height: 15,
                    backgroundColor: palette.horn,
                    borderColor: palette.scalesDark,
                    transform: [{ rotate: leftEarRotate }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.earFrillRight,
                  {
                    width: 11,
                    height: 15,
                    backgroundColor: palette.horn,
                    borderColor: palette.scalesDark,
                    transform: [{ rotate: rightEarRotate }],
                  },
                ]}
              />

              {/* Soulful Dragon Eyes */}
              {renderOrganicEyes(12.5, 11)}

              {/* Warm Cheek Blushes */}
              <View style={styles.cheekBlushRow} pointerEvents="none">
                <Animated.View style={[styles.cheekBlushOrb, { opacity: cheekBlushAnim }]} />
                <Animated.View style={[styles.cheekBlushOrb, { opacity: cheekBlushAnim }]} />
              </View>

              {/* Clean Sculpted Snout & Chomping Jaw */}
              <View style={[styles.drakeSnout, { backgroundColor: palette.scalesDark }]}>
                {renderNostrilBreathWisps()}
                <View style={styles.nostrilsRow}>
                  <View style={styles.nostrilDot} />
                  <View style={styles.nostrilDot} />
                </View>
                <Animated.View
                  style={[
                    styles.fangsRow,
                    { transform: [{ translateY: jawDropY }] },
                  ]}
                >
                  <View style={styles.roundedFangLarge} />
                  <View style={styles.roundedFangLarge} />
                </Animated.View>
              </View>

              {renderCascadingFireBreath(16)}
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  haloRing: {
    position: "absolute",
  },
  spark: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    zIndex: 1,
  },
  groundShadow: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    zIndex: 0,
  },
  baraSnackOrb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    zIndex: 14,
  },
  sleepyBubble: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.45)",
    zIndex: 10,
  },
  reactionFloatingBadge: {
    position: "absolute",
    zIndex: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  // ─── Stage 1: Organic Scaled Dragon Egg ───
  eggContainer: {
    borderWidth: 2.5,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 64,
    borderBottomRightRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
    shadowColor: "#FF9600",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  eggSpecularArc: {
    position: "absolute",
    top: 8,
    left: 11,
    width: 14,
    height: 28,
    borderRadius: 10,
    opacity: 0.42,
    transform: [{ rotate: "-18deg" }],
  },
  organicHornBudLeft: {
    position: "absolute",
    top: -9,
    left: 14,
    width: 10,
    height: 15,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  organicHornBudRight: {
    position: "absolute",
    top: -9,
    right: 14,
    width: 10,
    height: 15,
    borderTopRightRadius: 8,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  eggInnerGlow: {
    position: "absolute",
    width: "58%",
    height: "58%",
    borderRadius: 50,
  },
  eggScalePatch: {
    position: "absolute",
    width: 16,
    height: 12,
    borderRadius: 8,
    opacity: 0.65,
  },
  eggCrackLine1: {
    width: 4,
    height: 28,
    borderRadius: 2,
    transform: [{ rotate: "18deg" }],
  },
  eggCrackLine2: {
    position: "absolute",
    width: 22,
    height: 3.5,
    borderRadius: 2,
    transform: [{ rotate: "-24deg" }],
  },
  eggNestBase: {
    marginTop: -8,
    borderRadius: 20,
    borderWidth: 2,
    zIndex: -1,
  },

  // ─── Stage 2, 3, 4 Shared Organic Dragon Anatomy ───
  babyBody: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  wingedBody: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  deityBody: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  neckBridge: {
    position: "absolute",
    top: 30,
    width: 24,
    height: 14,
    borderRadius: 7,
    zIndex: 1,
  },

  // Articulated 2-Joint Dragon Wings
  dragonWingLeft: {
    position: "absolute",
    zIndex: 0,
  },
  dragonWingRight: {
    position: "absolute",
    zIndex: 0,
  },
  babyWingShape: {
    width: 38,
    height: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 8,
    borderTopWidth: 3,
    borderLeftWidth: 2,
    position: "relative",
  },
  babyWingShapeRight: {
    width: 38,
    height: 30,
    borderTopRightRadius: 24,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 8,
    borderTopWidth: 3,
    borderRightWidth: 2,
    position: "relative",
  },
  wingPinionFeatherLeft: {
    position: "absolute",
    top: -4,
    left: -7,
    width: 16,
    height: 12,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 4,
    opacity: 0.9,
  },
  wingPinionFeatherRight: {
    position: "absolute",
    top: -4,
    right: -7,
    width: 16,
    height: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 4,
    opacity: 0.9,
  },
  wingMembraneLobe: {
    position: "absolute",
    bottom: 2,
    left: 8,
    right: 8,
    height: 10,
    borderRadius: 6,
  },
  drakeWingLeft: {
    position: "absolute",
    zIndex: 0,
  },
  drakeWingRight: {
    position: "absolute",
    zIndex: 0,
  },
  drakeWingMembraneLeft: {
    width: 54,
    height: 44,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 10,
    borderTopWidth: 3.5,
    borderLeftWidth: 2.5,
    position: "relative",
  },
  drakeWingMembraneRight: {
    width: 54,
    height: 44,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 10,
    borderTopWidth: 3.5,
    borderRightWidth: 2.5,
    position: "relative",
  },
  drakePinionTipLeft: {
    position: "absolute",
    top: -6,
    left: -10,
    width: 22,
    height: 16,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 6,
    borderTopWidth: 2,
  },
  drakePinionTipRight: {
    position: "absolute",
    top: -6,
    right: -10,
    width: 22,
    height: 16,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 6,
    borderTopWidth: 2,
  },
  wingBoneRib1: {
    position: "absolute",
    top: 5,
    left: 16,
    width: 2.5,
    height: 32,
    borderRadius: 1.5,
    transform: [{ rotate: "16deg" }],
    opacity: 0.6,
  },
  wingBoneRib2: {
    position: "absolute",
    top: 5,
    left: 30,
    width: 2.5,
    height: 30,
    borderRadius: 1.5,
    transform: [{ rotate: "-12deg" }],
    opacity: 0.6,
  },

  // Dragon Torso, Volumetric Highlights, Forepaws & Belly
  babyTorso: {
    width: 52,
    height: 46,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderWidth: 2,
    marginTop: 34,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  drakeTorso: {
    width: 58,
    height: 52,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 2,
    marginTop: 38,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  torsoHighlightArc: {
    position: "absolute",
    top: 5,
    left: 6,
    width: 10,
    height: 22,
    borderRadius: 6,
    opacity: 0.35,
  },
  dragonBellyPatch: {
    width: 34,
    height: 36,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 4,
  },
  bellyRibLine: {
    width: "70%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  starCoreDiamond: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  forepawLeft: {
    position: "absolute",
    top: 10,
    left: -4,
    width: 11,
    height: 14,
    borderRadius: 6,
    transform: [{ rotate: "18deg" }],
  },
  forepawRight: {
    position: "absolute",
    top: 10,
    right: -4,
    width: 11,
    height: 14,
    borderRadius: 6,
    transform: [{ rotate: "-18deg" }],
  },
  dragonFootLeft: {
    position: "absolute",
    bottom: -6,
    left: 6,
    width: 15,
    height: 10,
    borderRadius: 6,
  },
  dragonFootRight: {
    position: "absolute",
    bottom: -6,
    right: 6,
    width: 15,
    height: 10,
    borderRadius: 6,
  },

  // 3-Segment Kinematic Wave Dragon Tail
  dragonTailWrap: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  tailSegBase: {
    borderRadius: 8,
    transform: [{ rotate: "-14deg" }],
    justifyContent: "center",
  },
  tailSegMid: {
    position: "absolute",
    borderRadius: 7,
    justifyContent: "center",
  },
  dragonTailFlameOuter: {
    position: "absolute",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 12,
    top: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  dragonTailFlameMid: {
    width: "72%",
    height: "72%",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  dragonTailFlameInner: {
    width: "56%",
    height: "56%",
    borderRadius: 6,
  },

  // Sculpted Dragon Head, Curved Horns, Ear Frills, Soulful Eyes & Snout
  babyDragonHead: {
    position: "absolute",
    top: 0,
    width: 50,
    height: 44,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10,
    zIndex: 3,
  },
  drakeHead: {
    position: "absolute",
    top: 0,
    width: 56,
    height: 48,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 11,
    zIndex: 3,
  },
  headCrownHighlight: {
    position: "absolute",
    top: 3,
    width: 24,
    height: 6,
    borderRadius: 4,
    opacity: 0.42,
  },
  organicBabyHornLeft: {
    position: "absolute",
    top: -11,
    left: 6,
    width: 9,
    height: 15,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    transform: [{ rotate: "-24deg" }],
  },
  organicBabyHornRight: {
    position: "absolute",
    top: -11,
    right: 6,
    width: 9,
    height: 15,
    borderTopRightRadius: 8,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    transform: [{ rotate: "24deg" }],
  },
  organicDrakeHornLeft: {
    position: "absolute",
    top: -16,
    left: 3,
    width: 10,
    height: 21,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    transform: [{ rotate: "-28deg" }],
    alignItems: "center",
  },
  organicDrakeHornRight: {
    position: "absolute",
    top: -16,
    right: 3,
    width: 10,
    height: 21,
    borderTopRightRadius: 9,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    transform: [{ rotate: "28deg" }],
    alignItems: "center",
  },
  organicDrakeHornTipLeft: {
    width: 6,
    height: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 2,
    marginTop: 1,
    opacity: 0.85,
  },
  organicDrakeHornTipRight: {
    width: 6,
    height: 8,
    borderTopRightRadius: 5,
    borderTopLeftRadius: 2,
    marginTop: 1,
    opacity: 0.85,
  },
  organicCrestBud: {
    position: "absolute",
    top: -9,
    width: 8,
    height: 11,
    borderRadius: 4,
  },
  earFrillLeft: {
    position: "absolute",
    left: -8,
    top: 13,
    width: 10,
    height: 14,
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 7,
    borderTopRightRadius: 4,
    borderWidth: 1.5,
  },
  earFrillRight: {
    position: "absolute",
    right: -8,
    top: 13,
    width: 10,
    height: 14,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 7,
    borderTopLeftRadius: 4,
    borderWidth: 1.5,
  },
  cosmicHaloCrown: {
    position: "absolute",
    top: -22,
    width: 34,
    height: 10,
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
  },
  dragonEyesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 34,
    marginBottom: 2,
  },
  dragonEyeOrb: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#0F172A",
    overflow: "hidden",
    position: "relative",
  },
  dragonSlitPupil: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: "#0F172A",
  },
  eyeSpecularBig: {
    position: "absolute",
    top: 1.5,
    left: 2,
    width: 3.2,
    height: 3.2,
    borderRadius: 1.6,
    backgroundColor: "#FFFFFF",
  },
  eyeSpecularSmall: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 1.8,
    height: 1.8,
    borderRadius: 0.9,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  happyEyelidCrescent: {
    position: "absolute",
    bottom: -2,
    width: "120%",
    height: "85%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  cheekBlushRow: {
    position: "absolute",
    top: 21,
    width: 42,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cheekBlushOrb: {
    width: 7,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#FB7185",
  },
  dragonSnout: {
    width: 32,
    height: 15,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  drakeSnout: {
    width: 36,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  nostrilWispContainer: {
    position: "absolute",
    top: 1,
    width: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nostrilWispOrb: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  nostrilsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 14,
  },
  nostrilDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0F172A",
  },
  fangsRow: {
    position: "absolute",
    bottom: -3.5,
    flexDirection: "row",
    justifyContent: "space-between",
    width: 18,
  },
  roundedFang: {
    width: 4,
    height: 5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  roundedFangLarge: {
    width: 4.5,
    height: 6.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  fireBreathEmitter: {
    position: "absolute",
    bottom: -15,
    width: 32,
    height: 26,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 6,
  },
  fireParticleOrb: {
    position: "absolute",
  },
});
