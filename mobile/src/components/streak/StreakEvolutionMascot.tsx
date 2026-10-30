/**
 * StudyAir Mobile — Streak Evolution Mascot Component
 * 
 * Evolving character companion that grows cooler the longer the student's streak:
 * - Stage 1 (1–6 Days): 🥚 Telur Naga Api (Wobbling egg with warm glowing cracks & embers)
 * - Stage 2 (7–29 Days): 🐲 Anak Naga Api (Cute hopping baby dragon with flapping tiny wings & cyan fire breath)
 * - Stage 3 (30–99 Days): 🐉 Naga Bersayap (Majestic winged dragon with large flapping wings, golden crest & dual fire halos)
 * - Stage 4 (100+ Days): ✨ Dewa Phoenix Kosmik (Cosmic deity with spreading rainbow wings, dual planetary rings & star orbs)
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMascotStage, MascotStage } from "../../lib/studyStreakEngine";
import { soundFX } from "../../lib/sound";
import { HapticFeedback } from "../../lib/haptics";

interface StreakEvolutionMascotProps {
  days: number;
  isLit?: boolean;
  isAtRisk?: boolean;
  size?: number | "compact" | "normal" | "hero";
  interactive?: boolean;
  style?: ViewStyle;
  onMascotPress?: (stage: MascotStage) => void;
}

export function StreakEvolutionMascot({
  days,
  isLit = true,
  isAtRisk = false,
  size: sizeProp = 96,
  interactive = true,
  style,
  onMascotPress,
}: StreakEvolutionMascotProps) {
  const currentStage = getMascotStage(days);

  const size =
    typeof sizeProp === "number"
      ? sizeProp
      : sizeProp === "compact"
      ? 72
      : sizeProp === "hero"
      ? 112
      : 96;

  // Animation values
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const wingFlapAnim = useRef(new Animated.Value(0)).current;
  const haloScaleAnim = useRef(new Animated.Value(1)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const tapScaleAnim = useRef(new Animated.Value(1)).current;
  const sparkAnim1 = useRef(new Animated.Value(0)).current;
  const sparkAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLit) {
      wobbleAnim.setValue(0);
      bounceAnim.setValue(0);
      wingFlapAnim.setValue(0);
      haloScaleAnim.setValue(1);
      return;
    }

    // 1. Stage 1: Egg Wobble Loop
    const eggWobble = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(wobbleAnim, {
          toValue: -8,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wobbleAnim, {
          toValue: 8,
          duration: 200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wobbleAnim, {
          toValue: -5,
          duration: 140,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wobbleAnim, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Stage 2 & 3: Cheerful Bounce / Floating Loop
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: isAtRisk ? 350 : 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: isAtRisk ? 350 : 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Wing Flapping Animation
    const wingFlap = Animated.loop(
      Animated.sequence([
        Animated.timing(wingFlapAnim, {
          toValue: 1,
          duration: currentStage.id === "baby" ? 220 : 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wingFlapAnim, {
          toValue: 0,
          duration: currentStage.id === "baby" ? 220 : 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 4. Aura Expansion Halo Loop
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloScaleAnim, {
          toValue: 1.35,
          duration: isAtRisk ? 600 : 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloScaleAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 5. Cosmic Orbiting Rings Loop
    const orbitLoop = Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 6. Staggered Spark loop
    const sparkLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkAnim1, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkAnim1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const sparkLoop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(sparkAnim2, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkAnim2, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    if (currentStage.id === "egg") {
      eggWobble.start();
    } else {
      bounceLoop.start();
      wingFlap.start();
    }

    haloLoop.start();
    sparkLoop1.start();
    sparkLoop2.start();

    if (currentStage.id === "deity") {
      orbitLoop.start();
    }

    return () => {
      eggWobble.stop();
      bounceLoop.stop();
      wingFlap.stop();
      haloLoop.stop();
      orbitLoop.stop();
      sparkLoop1.stop();
      sparkLoop2.stop();
    };
  }, [isLit, isAtRisk, currentStage.id]);

  const handlePress = () => {
    if (!interactive) return;

    HapticFeedback.streakSparkle();
    soundFX.playMascotInteraction(currentStage.id);

    Animated.sequence([
      Animated.timing(tapScaleAnim, {
        toValue: 0.88,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(tapScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();

    if (onMascotPress) {
      onMascotPress(currentStage);
    }
  };

  // Interpolations
  const eggRotate = wobbleAnim.interpolate({
    inputRange: [-8, 8],
    outputRange: ["-8deg", "8deg"],
  });

  const leftWingRotate = wingFlapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-18deg", "25deg"],
  });

  const rightWingRotate = wingFlapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["18deg", "-25deg"],
  });

  const orbitRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const orbitCounterRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"],
  });

  const stageColor = isLit ? currentStage.themeColor : "#64748B";

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.container, { width: size * 1.8, height: size * 1.8 }, style]}
    >
      {/* ─── Outer Glowing Halo Rings ─── */}
      {isLit && (
        <Animated.View
          style={[
            styles.haloRing,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: (size * 1.5) / 2,
              backgroundColor: `${stageColor}30`,
              transform: [{ scale: haloScaleAnim }],
            },
          ]}
        />
      )}

      {/* ─── Dual Cosmic Orbiting Rings (Stage 4 Deity) ─── */}
      {isLit && currentStage.id === "deity" && (
        <>
          <Animated.View
            style={[
              styles.orbitRing,
              {
                width: size * 1.7,
                height: size * 0.7,
                borderRadius: size * 0.85,
                borderColor: "#EC4899",
                transform: [{ rotate: "25deg" }, { rotateZ: orbitRotate }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orbitRing,
              {
                width: size * 1.7,
                height: size * 0.7,
                borderRadius: size * 0.85,
                borderColor: "#38BDF8",
                transform: [{ rotate: "-25deg" }, { rotateZ: orbitCounterRotate }],
              },
            ]}
          />
        </>
      )}

      {/* ─── Staggered Floating Ember Sparks ─── */}
      {isLit && (
        <>
          <Animated.View
            style={[
              styles.spark,
              {
                backgroundColor: currentStage.id === "deity" ? "#EC4899" : "#FFC800",
                left: size * 0.5,
                transform: [
                  {
                    translateY: sparkAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -size * 0.75],
                    }),
                  },
                  {
                    translateX: sparkAnim1.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, -14, -6],
                    }),
                  },
                ],
                opacity: sparkAnim1.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 0.8, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.spark,
              {
                backgroundColor: currentStage.id === "deity" ? "#38BDF8" : "#FF9600",
                right: size * 0.5,
                transform: [
                  {
                    translateY: sparkAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -size * 0.8],
                    }),
                  },
                  {
                    translateX: sparkAnim2.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 14, 6],
                    }),
                  },
                ],
                opacity: sparkAnim2.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 0.8, 0],
                }),
              },
            ]}
          />
        </>
      )}

      {/* ─── Mascot Body Stage Rendering ─── */}
      <Animated.View
        style={[
          styles.mascotWrapper,
          {
            transform: [
              { scale: tapScaleAnim },
              { translateY: bounceAnim },
            ],
          },
        ]}
      >
        {/* STAGE 1: TELUR NAGA API */}
        {currentStage.id === "egg" && (
          <Animated.View
            style={[
              styles.eggContainer,
              {
                width: size * 0.8,
                height: size * 1.05,
                borderRadius: size * 0.4,
                borderColor: stageColor,
                backgroundColor: isLit ? "#FF960018" : "#1E293B",
                transform: [{ rotate: eggRotate }],
              },
            ]}
          >
            {/* Inner Glowing Core */}
            <View
              style={[
                styles.eggInnerGlow,
                { backgroundColor: isLit ? "#FFC800" : "#475569" },
              ]}
            />
            {/* Crack lines symbol */}
            <Ionicons
              name="flash"
              size={size * 0.38}
              color={isLit ? "#FFE066" : "#64748B"}
              style={styles.eggCrackIcon}
            />
          </Animated.View>
        )}

        {/* STAGE 2: ANAK NAGA API */}
        {currentStage.id === "baby" && (
          <View style={styles.dragonWrapper}>
            {/* Left Baby Wing */}
            <Animated.View
              style={[
                styles.wingLeft,
                {
                  transform: [{ rotate: leftWingRotate }],
                },
              ]}
            >
              <Ionicons name="sparkles" size={size * 0.32} color="#38BDF8" />
            </Animated.View>

            {/* Baby Dragon Head & Flame Core */}
            <View style={[styles.babyHeadCircle, { borderColor: stageColor }]}>
              <Ionicons name="flame" size={size * 0.65} color="#FF9600" />
              <View style={styles.babyFaceOverlay}>
                <Ionicons name="happy" size={size * 0.3} color="#FFFFFF" />
              </View>
            </View>

            {/* Right Baby Wing */}
            <Animated.View
              style={[
                styles.wingRight,
                {
                  transform: [{ rotate: rightWingRotate }],
                },
              ]}
            >
              <Ionicons name="sparkles" size={size * 0.32} color="#38BDF8" />
            </Animated.View>
          </View>
        )}

        {/* STAGE 3: NAGA BERSAYAP */}
        {currentStage.id === "winged" && (
          <View style={styles.dragonWrapper}>
            {/* Left Sweeping Dragon Wing */}
            <Animated.View
              style={[
                styles.largeWingLeft,
                {
                  transform: [{ rotate: leftWingRotate }],
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={size * 0.48} color="#F59E0B" />
            </Animated.View>

            {/* Majestic Crowned Dragon Centerpiece */}
            <View style={styles.wingedDragonCore}>
              <View style={styles.hornsRow}>
                <Ionicons name="flash" size={size * 0.24} color="#FFD700" style={{ transform: [{ rotate: "-25deg" }] }} />
                <Ionicons name="flash" size={size * 0.24} color="#FFD700" style={{ transform: [{ rotate: "25deg" }] }} />
              </View>
              <Ionicons name="flame" size={size * 0.78} color="#FF7A00" />
              <View style={styles.dragonEyesOverlay}>
                <Ionicons name="eye" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Ionicons name="eye" size={14} color="#FFFFFF" />
              </View>
            </View>

            {/* Right Sweeping Dragon Wing */}
            <Animated.View
              style={[
                styles.largeWingRight,
                {
                  transform: [{ rotate: rightWingRotate }],
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={size * 0.48} color="#F59E0B" />
            </Animated.View>
          </View>
        )}

        {/* STAGE 4: DEWA PHOENIX KOSMIK */}
        {currentStage.id === "deity" && (
          <View style={styles.dragonWrapper}>
            {/* Left Cosmic Rainbow Wing */}
            <Animated.View
              style={[
                styles.cosmicWingLeft,
                {
                  transform: [{ rotate: leftWingRotate }],
                },
              ]}
            >
              <Ionicons name="planet" size={size * 0.52} color="#EC4899" />
            </Animated.View>

            {/* Cosmic Phoenix Deity Head & Infinite Aura */}
            <View style={styles.deityCore}>
              <Ionicons name="infinite" size={size * 0.28} color="#FFD700" style={styles.deityHaloCrown} />
              <Ionicons name="flame" size={size * 0.85} color="#8B5CF6" />
              <View style={styles.deityFaceOverlay}>
                <Ionicons name="star" size={16} color="#FFE066" />
              </View>
            </View>

            {/* Right Cosmic Rainbow Wing */}
            <Animated.View
              style={[
                styles.cosmicWingRight,
                {
                  transform: [{ rotate: rightWingRotate }],
                },
              ]}
            >
              <Ionicons name="planet" size={size * 0.52} color="#06B6D4" />
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
  orbitRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    opacity: 0.6,
  },
  spark: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 1,
  },
  mascotWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  // Stage 1: Egg
  eggContainer: {
    borderWidth: 3,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#FF9600",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  eggInnerGlow: {
    position: "absolute",
    width: "60%",
    height: "60%",
    borderRadius: 50,
    opacity: 0.35,
  },
  eggCrackIcon: {
    transform: [{ rotate: "12deg" }],
  },
  // Common Dragon
  dragonWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  // Stage 2: Baby Dragon
  babyHeadCircle: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  babyFaceOverlay: {
    position: "absolute",
    bottom: 8,
  },
  wingLeft: {
    marginRight: -10,
    marginTop: -8,
  },
  wingRight: {
    marginLeft: -10,
    marginTop: -8,
  },
  // Stage 3: Winged Dragon
  wingedDragonCore: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  hornsRow: {
    flexDirection: "row",
    position: "absolute",
    top: -10,
    gap: 8,
    zIndex: 3,
  },
  dragonEyesOverlay: {
    flexDirection: "row",
    position: "absolute",
    bottom: 14,
    zIndex: 3,
  },
  largeWingLeft: {
    marginRight: -8,
    marginTop: -6,
  },
  largeWingRight: {
    marginLeft: -8,
    marginTop: -6,
  },
  // Stage 4: Deity
  deityCore: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  deityHaloCrown: {
    position: "absolute",
    top: -12,
    zIndex: 4,
  },
  deityFaceOverlay: {
    position: "absolute",
    bottom: 16,
    zIndex: 4,
  },
  cosmicWingLeft: {
    marginRight: -6,
    marginTop: -10,
  },
  cosmicWingRight: {
    marginLeft: -6,
    marginTop: -10,
  },
});
