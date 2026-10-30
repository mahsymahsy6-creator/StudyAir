import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Easing } from "react-native";

import { MilestoneTier } from "../../lib/studyStreakEngine";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const CONFETTI_COLORS = [
  "#FF9600", // Duolingo Orange
  "#FFC800", // Gold
  "#58CC02", // Duolingo Green
  "#1CB0F6", // Sky Blue
  "#A855F7", // Purple
  "#FF4B4B", // Red
  "#2DD4BF", // Teal
  "#EC4899", // Pink
];

const BRONZE_CONFETTI = ["#FF9600", "#FFC800", "#FF4B4B", "#F59E0B", "#D97706"];
const SILVER_CONFETTI = ["#06B6D4", "#38BDF8", "#E2E8F0", "#94A3B8", "#0284C7", "#FFFFFF"];
const GOLD_CONFETTI = ["#F59E0B", "#FFD700", "#FBBF24", "#FEF08A", "#D97706", "#FFFBEB"];
const RAINBOW_CONFETTI = [
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#F43F5E",
  "#A855F7",
  "#38BDF8",
];

interface Particle {
  id: number;
  color: string;
  size: number;
  startX: number;
  driftX: number;
  rotation: number;
  anim: Animated.Value;
}

interface ConfettiCannonProps {
  active?: boolean;
  count?: number;
  tier?: MilestoneTier;
}

export function ConfettiCannon({ active = true, count = 40, tier }: ConfettiCannonProps) {
  const particles = useRef<Particle[]>([]);

  // Choose palette based on tier
  const palette =
    tier === "rainbow"
      ? RAINBOW_CONFETTI
      : tier === "gold"
      ? GOLD_CONFETTI
      : tier === "silver"
      ? SILVER_CONFETTI
      : tier === "bronze"
      ? BRONZE_CONFETTI
      : CONFETTI_COLORS;

  const particleCount = tier === "rainbow" ? Math.max(count, 55) : count;

  if (particles.current.length === 0) {
    const list: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      list.push({
        id: i,
        color: palette[i % palette.length],
        size: Math.floor(Math.random() * 8) + 8, // 8 - 15px
        startX: Math.random() * (SCREEN_WIDTH - 40) + 20,
        driftX: (Math.random() - 0.5) * 160,
        rotation: Math.floor(Math.random() * 720) - 360,
        anim: new Animated.Value(0),
      });
    }
    particles.current = list;
  }

  useEffect(() => {
    if (!active) return;

    // Reset animations
    particles.current.forEach((p) => p.anim.setValue(0));

    // Staggered trigger for organic celebratory waterfall effect
    const anims = particles.current.map((p, idx) => {
      return Animated.timing(p.anim, {
        toValue: 1,
        duration: 2200 + (idx % 6) * 200,
        delay: Math.floor(idx / 4) * 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
    });

    Animated.parallel(anims).start();
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.current.map((p) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, SCREEN_HEIGHT * 0.85],
        });

        const translateX = p.anim.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, p.driftX * 0.6, p.driftX],
        });

        const rotate = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.rotation}deg`],
        });

        const opacity = p.anim.interpolate({
          inputRange: [0, 0.1, 0.7, 1],
          outputRange: [0, 1, 0.9, 0],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.confettiPiece,
              {
                width: p.size,
                height: p.size * (p.id % 2 === 0 ? 1 : 1.6), // Rectangles & squares
                backgroundColor: p.color,
                left: p.startX,
                transform: [{ translateY }, { translateX }, { rotate }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  confettiPiece: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
    zIndex: 99,
  },
});
