import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AnimatedFlameProps {
  size?: number;
  isLit?: boolean;
  isAtRisk?: boolean;
  style?: ViewStyle;
}

export function AnimatedFlame({
  size = 72,
  isLit = true,
  isAtRisk = false,
  style,
}: AnimatedFlameProps) {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const haloScaleAnim = useRef(new Animated.Value(1)).current;
  const haloOpacityAnim = useRef(new Animated.Value(0.35)).current;
  const sparkAnim1 = useRef(new Animated.Value(0)).current;
  const sparkAnim2 = useRef(new Animated.Value(0)).current;
  const sparkAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLit) {
      scaleAnim.setValue(1);
      haloScaleAnim.setValue(1);
      haloOpacityAnim.setValue(0);
      return;
    }

    // 1. Continuous breathing flame spring loop
    const breathingAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: isAtRisk ? 1.08 : 1.12,
          duration: isAtRisk ? 450 : 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: isAtRisk ? 450 : 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Halo expansion pulse loop
    const haloAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScaleAnim, {
            toValue: 1.35,
            duration: isAtRisk ? 600 : 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacityAnim, {
            toValue: 0.05,
            duration: isAtRisk ? 600 : 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(haloScaleAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacityAnim, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 3. Floating spark embers
    const createSparkLoop = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const sparkLoop1 = createSparkLoop(sparkAnim1, 0);
    const sparkLoop2 = createSparkLoop(sparkAnim2, 450);
    const sparkLoop3 = createSparkLoop(sparkAnim3, 900);

    breathingAnim.start();
    haloAnim.start();
    sparkLoop1.start();
    sparkLoop2.start();
    sparkLoop3.start();

    return () => {
      breathingAnim.stop();
      haloAnim.stop();
      sparkLoop1.stop();
      sparkLoop2.stop();
      sparkLoop3.stop();
    };
  }, [isLit, isAtRisk]);

  const flameColor = isLit
    ? isAtRisk
      ? "#FF7A00" // Urgency fiery orange
      : "#FF9600" // Duolingo iconic orange
    : "#64748B";

  const haloColor = isAtRisk
    ? "rgba(255, 122, 0, 0.4)"
    : "rgba(255, 150, 0, 0.35)";

  return (
    <View style={[styles.container, { width: size * 1.8, height: size * 1.8 }, style]}>
      {/* Outer Halo Ring */}
      {isLit && (
        <Animated.View
          style={[
            styles.haloRing,
            {
              width: size * 1.6,
              height: size * 1.6,
              borderRadius: (size * 1.6) / 2,
              backgroundColor: haloColor,
              transform: [{ scale: haloScaleAnim }],
              opacity: haloOpacityAnim,
            },
          ]}
        />
      )}

      {/* Floating Spark Ember 1 */}
      {isLit && (
        <Animated.View
          style={[
            styles.spark,
            {
              left: size * 0.45,
              transform: [
                {
                  translateY: sparkAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -size * 0.7],
                  }),
                },
                {
                  translateX: sparkAnim1.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -12, -4],
                  }),
                },
                {
                  scale: sparkAnim1.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0.5, 1.2, 0],
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
      )}

      {/* Floating Spark Ember 2 */}
      {isLit && (
        <Animated.View
          style={[
            styles.spark,
            {
              right: size * 0.45,
              transform: [
                {
                  translateY: sparkAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -size * 0.75],
                  }),
                },
                {
                  translateX: sparkAnim2.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 14, 6],
                  }),
                },
                {
                  scale: sparkAnim2.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0.6, 1.3, 0],
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
      )}

      {/* Floating Spark Ember 3 */}
      {isLit && (
        <Animated.View
          style={[
            styles.spark,
            {
              left: size * 0.7,
              transform: [
                {
                  translateY: sparkAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -size * 0.85],
                  }),
                },
                {
                  scale: sparkAnim3.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.4, 1.1, 0],
                  }),
                },
              ],
              opacity: sparkAnim3.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 1, 0.8, 0],
              }),
            },
          ]}
        />
      )}

      {/* Main Flame Core with Dynamic Spring Breathing */}
      <Animated.View
        style={[
          styles.flameWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons name="flame" size={size} color={flameColor} />
      </Animated.View>
    </View>
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
  flameWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  spark: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFC800",
    zIndex: 1,
  },
});
