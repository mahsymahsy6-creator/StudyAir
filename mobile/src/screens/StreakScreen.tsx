import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { BottomSheet } from "../components/common/BottomSheet";
import {
  StreakMilestone,
  STREAK_MILESTONES,
  MilestoneTier,
  StudyDay,
  MASCOT_STAGES,
  getMascotStage,
  getNextMascotStage,
  getMascotGrowthState,
  MascotStage,
  DRAGON_ELEMENTS,
  DragonElementId,
  deriveDragonPetStats,
} from "../lib/studyStreakEngine";
import { StreakCelebrationModal } from "../components/streak/StreakCelebrationModal";
import { StreakDebugModal } from "../components/streak/StreakDebugModal";
import { AnimatedFlame } from "../components/streak/AnimatedFlame";
import { StreakEvolutionMascot } from "../components/streak/StreakEvolutionMascot";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";
import { formatLocaleDate } from "../lib/dateUtils";
import { format } from "date-fns";

interface StreakScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

const WEEKDAY_NAMES_SEN_MIN = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
const PRESET_DRAGON_NAMES = ["Bara", "Ignis", "Draco", "Astra", "Zuko", "Pyro"];

const DRAGON_REACTIONS: Record<string, string[]> = {
  egg: [
    "🥚 *Krak-krak!* Telur nagamu terasa makin hangat!",
    "🔥 Ada detak jantung naga kecil di dalam cangkang!",
    "✨ Cangkang magma berkilau merespons sentuhanmu!",
  ],
  baby: [
    "🐲 *Rawrrr!* Tukik nagamu menyemburkan percikan api!",
    "🔥 Tukik naga mengepakkan sayap mungilnya dengan senang!",
    "🍖 *Nyam-nyam!* Tukik naga melompat kegirangan!",
  ],
  winged: [
    "🐉 *ROAARRR!* Naga Langit membentangkan sayap apinya!",
    "🔥 Semburan naga apimu siap membakar semua rasa malas!",
    "⚡ Sisik perisai nagamu memancarkan aura pelindung!",
  ],
  deity: [
    "🐉 *ROAARRR!* Naga Agung Kosmik memancarkan cahaya mahkota emas!",
    "✨ Lencana bintang di dada nagamu bersinar tenang!",
    "🔥 Kepakan sayap agung nagamu menjaga api belajarmu tetap menyala!",
  ],
};

export function StreakScreen({ navigation }: StreakScreenProps) {
  const {
    streakState,
    triggerCelebration,
    appSettings,
    updateAppSettings,
    useStreakFreezeToday,
  } = useMobileStudyStore();
  const [previewMilestone, setPreviewMilestone] = useState<StreakMilestone | null>(null);
  const [secretClueMilestone, setSecretClueMilestone] = useState<StreakMilestone | null>(null);
  const [debugModalVisible, setDebugModalVisible] = useState(false);
  const [inspectedDay, setInspectedDay] = useState<StudyDay | null>(null);
  const [previewStageDays, setPreviewStageDays] = useState<number | null>(null);
  const [dragonReaction, setDragonReaction] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(appSettings?.streakPetName || "");
  const [feedTrigger, setFeedTrigger] = useState(0);
  const [roarTrigger, setRoarTrigger] = useState(0);
  const [petTrigger, setPetTrigger] = useState(0);
  const [idleThoughtIndex, setIdleThoughtIndex] = useState(0);

  const {
    currentStreak,
    bestStreak,
    isAtRisk,
    todayStudied,
    nextMilestone,
    daysToNextMilestone,
    milestoneProgressPercent,
    recentWeekDays,
    todayStudyDay,
  } = streakState;

  const hasAccomplishedStreak =
    currentStreak > 0 && (todayStudied || Boolean(todayStudyDay?.isFreeDay));
  const hasDragonCompanion = currentStreak > 0;
  const activeDragonDays =
    previewStageDays !== null && hasDragonCompanion && currentStreak >= previewStageDays
      ? previewStageDays
      : currentStreak;
  const currentMascot = getMascotStage(activeDragonDays);
  const mascotGrowth = getMascotGrowthState(activeDragonDays);
  const realMascot = getMascotStage(currentStreak);
  const nextMascot = getNextMascotStage(hasDragonCompanion ? currentStreak : 0);

  const selectedElement: DragonElementId = (appSettings?.streakPetElement as DragonElementId) || "auto";
  const activeElement: DragonElementId =
    DRAGON_ELEMENTS.find((e) => e.id === selectedElement && currentStreak >= e.minDays)?.id || "auto";

  const petStats = deriveDragonPetStats({
    currentStreak,
    todayStudied,
    isAtRisk,
    todayStudyDay,
    fedTodayCount: appSettings?.streakPetFedTodayCount || 0,
    lastFedDate: appSettings?.streakPetLastFedDate || "",
  });

  const freezeCount = appSettings?.streakFreezeCount ?? 1;
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const isTodayFrozen = Boolean(appSettings?.streakFrozenDates?.includes(todayDateStr));

  useEffect(() => {
    if (!hasDragonCompanion) return;
    const timer = setInterval(() => {
      setIdleThoughtIndex((prev) => prev + 1);
    }, 6500);
    return () => clearInterval(timer);
  }, [hasDragonCompanion]);

  const activeIdleThought =
    petStats.organic.idleThoughts[idleThoughtIndex % petStats.organic.idleThoughts.length] || "";

  const customPetName = (appSettings?.streakPetName || "").trim();
  const displayPetName = customPetName || currentMascot.name;

  const handleMascotTap = (stage: MascotStage) => {
    soundFX.playMascotInteraction(stage.id);
    HapticFeedback.light();
    if (!hasAccomplishedStreak && isAtRisk) {
      setDragonReaction(`🥺 ${displayPetName} lapar bara! Yuk belajar 15 menit atau selesaikan 1 tugas hari ini.`);
      return;
    }
    const lines = DRAGON_REACTIONS[stage.id] || DRAGON_REACTIONS.egg;
    const picked = lines[Math.floor(Math.random() * lines.length)];
    setDragonReaction(picked);
  };

  const handleFeedDragon = () => {
    if (!hasDragonCompanion) return;
    if (!todayStudied && isAtRisk) {
      HapticFeedback.warning();
      setDragonReaction("🥺 Selesaikan 1 tugas atau fokus 15 menit hari ini untuk menyalakan Bara Api!");
      return;
    }

    const todayStr = todayStudyDay?.date || new Date().toISOString().slice(0, 10);
    const currentFed = appSettings?.streakPetLastFedDate === todayStr ? (appSettings?.streakPetFedTodayCount || 0) : 0;

    if (petStats.embersAvailable <= 0) {
      HapticFeedback.light();
      soundFX.playMascotInteraction(currentMascot.id);
      setFeedTrigger((c) => c + 1);
      setDragonReaction(
        currentFed >= petStats.satietyTarget
          ? `😋 ${displayPetName} sudah kenyang penuh hari ini! Selesaikan tugas lagi jika ingin memberi camilan bara ekstra.`
          : `🔥 Stok Bara Api habis! Selesaikan 1 tugas atau 15 menit fokus untuk +1 Bara Api.`
      );
      return;
    }

    const nextFed = currentFed + 1;
    const satietyNote =
      nextFed >= petStats.satietyTarget
        ? "Kenyang Penuh! 🔥"
        : `Kenyang ${nextFed}/${petStats.satietyTarget} 🔥`;

    HapticFeedback.celebration();
    soundFX.playDragonEat();
    setFeedTrigger((c) => c + 1);
    updateAppSettings({
      streakPetFedTodayCount: nextFed,
      streakPetLastFedDate: todayStr,
    });
    setDragonReaction(`🍖 *Nyam-nyam!* ${displayPetName} melahap Bara Api dengan lahap! (${satietyNote})`);
  };

  const handleRoarDragon = () => {
    if (!hasDragonCompanion) return;
    HapticFeedback.streakSparkle();
    soundFX.playMascotInteraction(currentMascot.id);
    setRoarTrigger((c) => c + 1);
    const lines = DRAGON_REACTIONS[currentMascot.id] || DRAGON_REACTIONS.egg;
    const picked = lines[Math.floor(Math.random() * lines.length)];
    setDragonReaction(picked);
  };

  const handlePetDragon = () => {
    if (!hasDragonCompanion) return;
    HapticFeedback.light();
    soundFX.playDragonPurr();
    const nextCount = petTrigger + 1;
    setPetTrigger(nextCount);
    if (petStats.mood === "hungry") {
      setDragonReaction(`🥺 *Purrr...* ${displayPetName} menyundul jarimu manja, tapi perutnya masih lapar bara!`);
    } else if (petStats.mood === "sleepy") {
      setDragonReaction(`💤 *Krrr~* ${displayPetName} menggeliat hangat dalam tidurnya saat kamu elus.`);
    } else {
      const petLines = [
        `💚 *Prrr~* ${displayPetName} mendengkur hangat & pipinya merona senang!`,
        `✨ ${displayPetName} menyundul tanganmu dengan sisik yang terasa hangat!`,
        `🔥 Ekor api ${displayPetName} bergoyang riang saat kepalanya dielus!`,
      ];
      setDragonReaction(petLines[nextCount % petLines.length]);
    }
  };

  const handleSavePetName = (overrideName?: string) => {
    const cleaned = (overrideName !== undefined ? overrideName : nameDraft).trim().slice(0, 22);
    updateAppSettings({ streakPetName: cleaned });
    setNameDraft(cleaned);
    setIsEditingName(false);
    HapticFeedback.light();
  };

  const handleSelectElement = (elId: DragonElementId, minDays: number) => {
    if (currentStreak < minDays) {
      soundFX.playMysteryClue();
      HapticFeedback.mysteryClue();
      setDragonReaction(`🔒 Elemen ini terbuka pada streak ${minDays} hari!`);
      return;
    }
    soundFX.playClick();
    HapticFeedback.light();
    updateAppSettings({ streakPetElement: elId });
    const found = DRAGON_ELEMENTS.find((e) => e.id === elId);
    if (found) {
      setDragonReaction(`${found.emoji} Aura elemen ${found.name} diaktifkan untuk ${displayPetName}!`);
    }
  };

  const handleBadgePress = (milestone: StreakMilestone) => {
    const isUnlocked = currentStreak >= milestone.days;
    if (isUnlocked) {
      soundFX.playClick();
      HapticFeedback.light();
      setPreviewMilestone(milestone);
    } else {
      soundFX.playMysteryClue();
      HapticFeedback.mysteryClue();
      setSecretClueMilestone(milestone);
    }
  };

  const handleContinueStudy = () => {
    soundFX.playClick();
    HapticFeedback.success();
    navigation.navigate("Today");
  };

  const handleShareStreak = async () => {
    soundFX.playClick();
    HapticFeedback.light();
    try {
      await Share.share({
        message: `🔥 Streak belajarku sudah mencapai ${currentStreak} hari di StudyAir! Konsistensi harian semakin membara. #StudyAir #StudyStreak`,
        title: `Streak Belajar ${currentStreak} Hari`,
      });
    } catch {
      // Ignore dismiss
    }
  };

  const handleSelectDay = (day: StudyDay) => {
    soundFX.playClick();
    HapticFeedback.light();
    if (inspectedDay?.date === day.date) {
      setInspectedDay(null);
    } else {
      setInspectedDay(day);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Streak Belajar"
        subtitle="Konsistensi belajar harian"
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: "share-social-outline",
            accessibilityLabel: "Bagikan Streak",
            onPress: handleShareStreak,
          },
          ...(appSettings.developerModeEnabled
            ? [
                {
                  icon: "construct-outline" as const,
                  accessibilityLabel: "Menu Debug Streak",
                  onPress: () => setDebugModalVisible(true),
                },
              ]
            : []),
        ]}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── 1. Hero Dragon & Streak Stage Card ─── */}
        <View style={styles.heroStageCard}>
          {/* Top Metadata Bar: Pet Name Pill (Left) + Best Record Pill (Right) */}
          <View style={styles.heroTopBar}>
            {hasDragonCompanion ? (
              <Pressable
                onPress={() => {
                  setNameDraft(customPetName);
                  setIsEditingName((v) => !v);
                  HapticFeedback.light();
                }}
                style={[styles.petIdentityPill, { borderColor: currentMascot.themeColor }]}
              >
                <Text style={{ fontSize: 13 }}>{currentMascot.emoji}</Text>
                <Text style={[styles.petIdentityName, { color: currentMascot.themeColor }]} numberOfLines={1}>
                  {displayPetName}
                </Text>
                <Text style={styles.petIdentityStage}>
                  • {currentMascot.name}
                  {previewStageDays !== null && currentMascot.id !== realMascot.id ? " (Pratinjau)" : ""}
                </Text>
                <Ionicons name="pencil" size={11} color={ colors.textSecondary } />
              </Pressable>
            ) : (
              <View style={styles.petIdentityPill}>
                <Ionicons name="flame-outline" size={14} color={colors.amber} />
                <Text style={styles.petIdentityStage}>Api Streak Harian</Text>
              </View>
            )}

            <View style={styles.bestStreakCapsule}>
              <Ionicons name="trophy" size={13} color="#FFC800" />
              <Text style={styles.bestStreakText}>
                Rekor <Text style={styles.bestStreakNumber}>{bestStreak}h</Text>
              </Text>
            </View>
          </View>

          {/* Inline Dragon Name Editor (Toggled by tapping the name pill) */}
          {hasDragonCompanion && isEditingName && (
            <View style={styles.petNameEditorBox}>
              <Text style={styles.petNameEditorLabel}>Ubah Nama Naga Pendamping:</Text>
              <View style={styles.petNameInputRow}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder={currentMascot.name}
                  placeholderTextColor={colors.textMuted}
                  maxLength={22}
                  style={styles.petNameInput}
                />
                <Pressable
                  style={[styles.petNameSaveBtn, { backgroundColor: currentMascot.themeColor }]}
                  onPress={() => handleSavePetName()}
                >
                  <Text style={styles.petNameSaveBtnText}>Simpan</Text>
                </Pressable>
              </View>
              <View style={styles.petNamePresetsRow}>
                {PRESET_DRAGON_NAMES.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => handleSavePetName(preset)}
                    style={[
                      styles.petNamePresetChip,
                      customPetName === preset && {
                        borderColor: currentMascot.themeColor,
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.petNamePresetText,
                        customPetName === preset && { color: currentMascot.themeColor, fontWeight: "800" },
                      ]}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Center Mascot Stage */}
          <View style={styles.flameHeroWrapper}>
            {hasDragonCompanion ? (
              <StreakEvolutionMascot
                size={104}
                days={activeDragonDays}
                isLit={hasAccomplishedStreak}
                isAtRisk={isAtRisk}
                element={activeElement}
                mood={petStats.mood}
                feedTrigger={feedTrigger}
                roarTrigger={roarTrigger}
                petTrigger={petTrigger}
                onMascotPress={handleMascotTap}
              />
            ) : (
              <AnimatedFlame size={76} isLit={false} isAtRisk={isAtRisk} />
            )}
          </View>

          {/* Speech Bubble for Reaction / Idle Thought */}
          {hasDragonCompanion && (dragonReaction || activeIdleThought) && (
            <Pressable
              onPress={() => handleMascotTap(currentMascot)}
              style={[
                styles.speechBubble,
                dragonReaction ? { borderColor: currentMascot.themeColor } : null,
              ]}
            >
              <Text style={styles.speechBubbleText} numberOfLines={2}>
                {dragonReaction || activeIdleThought}
              </Text>
            </Pressable>
          )}

          {/* Streak Counter Row */}
          <View style={styles.streakCounterBlock}>
            <Text style={styles.heroStreakNumber}>{currentStreak}</Text>
            <Text style={styles.heroStreakCaps}>HARI STREAK</Text>
            <Text style={styles.heroStreakSub}>
              {todayStudied
                ? `🔥 ${currentMascot.tagline}`
                : isAtRisk
                ? `⚠️ Streak terancam padam! Belajar 15 menit atau tuntaskan 1 tugas sebelum 23:59.`
                : todayStudyDay?.isFreeDay && currentStreak > 0
                ? "❄️ Hari libur aktif — maskot naga & streakmu otomatis terlindungi."
                : "Selesaikan 1 tugas atau fokus 15 menit hari ini untuk menyalakan api streakmu!"}
            </Text>
          </View>

          {/* Compact Companion Care Bar */}
          {hasDragonCompanion && (
            <View style={styles.petCarePanel}>
              <View style={styles.petCareStatusRow}>
                <View style={styles.petMoodBadge}>
                  <Text style={{ fontSize: 13 }}>{petStats.moodEmoji}</Text>
                  <Text style={[styles.petMoodText, { color: petStats.moodColor }]}>
                    {petStats.moodLabel}
                  </Text>
                </View>

                <View style={styles.petSatietyBadge}>
                  <Text style={styles.petSatietyLabel}>{petStats.satietyLabel}</Text>
                  <View style={styles.petSatietyDotsRow}>
                    {[0, 1, 2].map((slot) => {
                      const filled = slot < petStats.satietyCount;
                      return (
                        <View
                          key={slot}
                          style={[
                            styles.petSatietyDot,
                            filled && {
                              backgroundColor: currentMascot.themeColor,
                              borderColor: currentMascot.themeColor,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>

                <View
                  style={[
                    styles.petEmberStockBadge,
                    petStats.embersAvailable > 0 && {
                      backgroundColor: colors.amberLight,
                      borderColor: colors.amber,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.petEmberStockText,
                      petStats.embersAvailable > 0 && { color: colors.amber, fontWeight: "800" },
                    ]}
                  >
                    🔥 {petStats.embersAvailable} Bara
                  </Text>
                </View>
              </View>

              <View style={styles.petActionRow}>
                <Pressable
                  onPress={handleFeedDragon}
                  style={[
                    styles.petActionBtn,
                    petStats.embersAvailable > 0 && {
                      borderColor: colors.amber,
                      backgroundColor: colors.amberLight,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 14 }}>🍖</Text>
                  <Text
                    style={[
                      styles.petActionBtnText,
                      petStats.embersAvailable > 0 && { color: colors.amber, fontWeight: "800" },
                    ]}
                  >
                    Beri Makan ({petStats.embersAvailable})
                  </Text>
                </Pressable>

                <Pressable onPress={handleRoarDragon} style={styles.petActionBtn}>
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <Text style={styles.petActionBtnText}>Semburan</Text>
                </Pressable>

                <Pressable onPress={handlePetDragon} style={styles.petActionBtn}>
                  <Text style={{ fontSize: 14 }}>✨</Text>
                  <Text style={styles.petActionBtnText}>Elus</Text>
                </Pressable>
              </View>

              <View style={styles.petFooterMetaRow}>
                <Text style={styles.petCircadianLabel}>
                  {petStats.organic.circadianEmoji} {petStats.organic.circadianLabel} • ♥ {petStats.organic.heartbeatBpm} BPM
                </Text>
                {petStats.embersAvailable === 0 && petStats.satietyCount < petStats.satietyTarget && (
                  <Text style={styles.petCareHintText}>
                    +1 🔥 tiap 1 tugas / 15m fokus
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ─── 2. Mascot Evolution & Aura Card ─── */}
        <View style={styles.evolutionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 15 }}>
                {hasDragonCompanion ? currentMascot.emoji : "🔒"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Evolusi Maskot {hasDragonCompanion ? `• Tahap ${currentMascot.stageNumber}/4` : ""}
              </Text>
              <Text style={styles.evolutionCardLore} numberOfLines={2}>
                {hasDragonCompanion
                  ? `${mascotGrowth.traitTitle} — ${mascotGrowth.traitDescription}`
                  : "Selesaikan target belajar hari ini untuk membuka maskot nagamu."}
              </Text>
            </View>
          </View>

          {/* 4-Stage Dragon Evolution Strip */}
          {hasDragonCompanion && (
          <View style={styles.stageStripRow}>
            {MASCOT_STAGES.map((stage) => {
              const isUnlocked = hasDragonCompanion && currentStreak >= stage.minDays;
              const isSelected = hasDragonCompanion && currentMascot.id === stage.id;
              const shortStageName =
                stage.id === "egg"
                  ? "Telur"
                  : stage.id === "baby"
                  ? "Tukik"
                  : stage.id === "winged"
                  ? "Langit"
                  : "Agung";
              return (
                <Pressable
                  key={stage.id}
                  onPress={() => {
                    if (!isUnlocked) {
                      soundFX.playMysteryClue();
                      HapticFeedback.mysteryClue();
                      return;
                    }
                    soundFX.playMascotInteraction(stage.id);
                    HapticFeedback.light();
                    setPreviewStageDays(stage.id === realMascot.id ? null : stage.minDays);
                  }}
                  style={[
                    styles.stageStepCard,
                    isSelected && {
                      borderColor: stage.themeColor,
                      backgroundColor: colors.surface,
                    },
                    !isUnlocked && { opacity: 0.6 },
                  ]}
                >
                  <Text style={{ fontSize: 17 }}>{isUnlocked ? stage.emoji : "🔒"}</Text>
                  <Text
                    style={[
                      styles.stageStepTitle,
                      isSelected && { color: stage.themeColor },
                      !isUnlocked && { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {isUnlocked ? shortStageName : "???"}
                  </Text>
                  <Text
                    style={[
                      styles.stageStepDays,
                      isUnlocked && { color: colors.emerald },
                    ]}
                  >
                    {stage.minDays <= 1 ? "1–6h" : `${stage.minDays}h+`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          )}

          {/* Elemental Skin / Aura Selector */}
          {hasDragonCompanion && (
            <View style={styles.elementSectionBox}>
              <Text style={styles.elementSectionTitle}>Elemen & Aura Sisik:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.elementChipsRow}
              >
                {DRAGON_ELEMENTS.map((el) => {
                  const unlocked = currentStreak >= el.minDays;
                  const active = activeElement === el.id;
                  return (
                    <Pressable
                      key={el.id}
                      onPress={() => handleSelectElement(el.id, el.minDays)}
                      style={[
                        styles.elementChip,
                        active && {
                          borderColor: el.accentColor,
                          backgroundColor: colors.surface,
                        },
                        !unlocked && { opacity: 0.55 },
                      ]}
                    >
                      <Text style={{ fontSize: 12 }}>{unlocked ? el.emoji : "🔒"}</Text>
                      <Text
                        style={[
                          styles.elementChipText,
                          active && { color: el.accentColor, fontWeight: "800" },
                        ]}
                      >
                        {el.name}
                        {!unlocked ? ` (${el.minDays}h)` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Next Evolution Progress */}
          {nextMascot ? (
            <View style={styles.evolutionProgressSection}>
              <View style={styles.evolutionLabelRow}>
                <Text style={styles.evolutionLabelText}>Menuju Wujud Berikutnya</Text>
                <Text style={[styles.evolutionDaysLeftText, { color: nextMascot.themeColor }]}>
                  {Math.max(1, nextMascot.minDays - (hasDragonCompanion ? currentStreak : 0))} hari lagi ({nextMascot.minDays}h)
                </Text>
              </View>
              <View style={styles.evolutionBarWrapper}>
                <View
                  style={[
                    styles.evolutionBarFill,
                    {
                      width: `${Math.min(100, Math.max(4, ((hasDragonCompanion ? currentStreak : 0) / nextMascot.minDays) * 100))}%`,
                      backgroundColor: nextMascot.themeColor,
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            <View style={styles.maxEvolutionBox}>
              <Ionicons name="sparkles" size={15} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={styles.maxEvolutionText}>
                Wujud Naga Maksimal tercapai! Kamu telah membuka Naga Agung Kosmik.
              </Text>
            </View>
          )}
        </View>

        {/* ─── 3. Weekly Streak Chain & Perlindungan Streak (Unified Card) ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="calendar" size={16} color={colors.amber} />
            </View>
            <Text style={styles.sectionTitle}>Rantai Streak Minggu Ini</Text>
            <Text style={styles.sectionMetaTag}>7 HARI</Text>
          </View>

          <View style={styles.weekGrid}>
            {recentWeekDays.map((day, idx) => {
              const dayIndex = idx; // 0=Sen ... 6=Min
              const isToday = idx === (new Date().getDay() + 6) % 7;
              const isSelected = inspectedDay?.date === day.date;

              return (
                <Pressable
                  key={day.date}
                  style={[styles.weekDayCol, isSelected && styles.weekDayColSelected]}
                  onPress={() => handleSelectDay(day)}
                  hitSlop={touchTarget.min / 4}
                >
                  <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday]}>
                    {WEEKDAY_NAMES_SEN_MIN[dayIndex]}
                  </Text>

                  <View
                    style={[
                      styles.weekMedallion,
                      day.hasStudied && styles.weekMedallionStudied,
                      !day.hasStudied && day.isFrozen && styles.weekMedallionFrozen,
                      !day.hasStudied && !day.isFrozen && day.isFreeDay && styles.weekMedallionFree,
                      !day.hasStudied && !day.isFrozen && !day.isFreeDay && isToday && styles.weekMedallionTodayPending,
                      !day.hasStudied && !day.isFrozen && !day.isFreeDay && !isToday && styles.weekMedallionMissed,
                    ]}
                  >
                    {day.hasStudied ? (
                      <Ionicons name="flame" size={20} color="#FFFFFF" />
                    ) : day.isFrozen ? (
                      <Ionicons name="snow" size={19} color="#FFFFFF" />
                    ) : day.isFreeDay ? (
                      <Ionicons name="snow-outline" size={16} color="#38BDF8" />
                    ) : isToday ? (
                      <Ionicons name="flame-outline" size={18} color={colors.amber} />
                    ) : (
                      <View style={styles.weekMedallionEmptyDot} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Inspected Day Popover Card */}
          {inspectedDay && (
            <View style={styles.dayDetailCard}>
              <View style={styles.dayDetailHeader}>
                <Ionicons
                  name={
                    inspectedDay.hasStudied
                      ? "flame"
                      : inspectedDay.isFrozen
                      ? "snow"
                      : inspectedDay.isFreeDay
                      ? "snow-outline"
                      : "time-outline"
                  }
                  size={16}
                  color={
                    inspectedDay.hasStudied
                      ? "#FF9600"
                      : inspectedDay.isFrozen
                      ? "#00BAF2"
                      : inspectedDay.isFreeDay
                      ? "#38BDF8"
                      : colors.textMuted
                  }
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.dayDetailTitle}>
                  {inspectedDay.date} •{" "}
                  {inspectedDay.hasStudied
                    ? "Belajar Aktif"
                    : inspectedDay.isFrozen
                    ? "Hari Dibekukan (Streak Terlindungi)"
                    : inspectedDay.isFreeDay
                    ? "Hari Libur"
                    : "Belum Selesai"}
                </Text>
              </View>
              <Text style={styles.dayDetailStats}>
                {inspectedDay.isFrozen
                  ? "❄️ Streak terlindungi oleh Streak Freeze."
                  : `⏱️ ${inspectedDay.minutes} menit fokus • 📝 ${inspectedDay.tasksCompleted} tugas diselesaikan`}
              </Text>
            </View>
          )}

          {/* Enhanced Perlindungan Streak (Streak Freeze) */}
          <View style={styles.freezeSectionCard}>
            <View style={styles.freezeHeaderRow}>
              <View style={styles.freezeIconBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#00BAF2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.freezeTitleText}>Perlindungan Streak (Streak Freeze)</Text>
                <Text style={styles.freezeSubText}>
                  {freezeCount} / 2 Pembeku Tersedia • Melindungi streak saat terlewat
                </Text>
              </View>
            </View>

            {/* 2-Slot Freeze Inventory Grid */}
            <View style={styles.freezeSlotsRow}>
              {[0, 1].map((slotIdx) => {
                const isSlotActive = slotIdx < freezeCount;
                return (
                  <View
                    key={slotIdx}
                    style={[
                      styles.freezeSlotBox,
                      isSlotActive ? styles.freezeSlotBoxActive : styles.freezeSlotBoxEmpty,
                    ]}
                  >
                    <Ionicons
                      name={isSlotActive ? "snow" : "snow-outline"}
                      size={20}
                      color={isSlotActive ? "#00BAF2" : colors.textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.freezeSlotLabel, isSlotActive && styles.freezeSlotLabelActive]}>
                        Slot {slotIdx + 1}
                      </Text>
                      <Text style={styles.freezeSlotStatus}>
                        {isSlotActive ? "Aktif • Siap Melindungi" : "Slot Kosong"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Action Button: Freeze Today if not studied yet & freeze available */}
            {isTodayFrozen ? (
              <View style={styles.freezeActiveBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#00BAF2" style={{ marginRight: 6 }} />
                <Text style={styles.freezeActiveBannerText}>Hari ini telah dilindungi oleh Streak Freeze ❄️</Text>
              </View>
            ) : !todayStudied && freezeCount > 0 ? (
              <Pressable
                style={styles.freezeActionBtn}
                onPress={() => {
                  useStreakFreezeToday();
                }}
                hitSlop={touchTarget.min / 4}
              >
                <Ionicons name="snow" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.freezeActionBtnText}>Bekukan Hari Ini (Pakai 1 Pembeku)</Text>
              </Pressable>
            ) : null}

            {/* Explanatory notes & auto-protected pills */}
            <Text style={styles.freezeEarnHint}>
              💡 Dapatkan pembeku setiap 3 hari berturut-turut atau dari bonus kejutan belajar harian!
            </Text>

            <View style={styles.freezeCompactPillsRow}>
              <View style={styles.freezeCompactPill}>
                <Ionicons name="sunny-outline" size={12} color="#38BDF8" />
                <Text style={styles.freezeCompactPillText}>Hari Libur • Dilindungi</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 4. Next Milestone Quest ─── */}
        {nextMilestone && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Target Gelar Berikutnya</Text>
              <View style={styles.milestonePill}>
                <Text style={styles.milestonePillText}>{nextMilestone.days} Hari</Text>
              </View>
            </View>

            <View style={styles.milestoneBody}>
              <View style={styles.mysteryTeaserRow}>
                <Ionicons name="lock-closed" size={18} color={getTierColor(nextMilestone.tier)} style={{ marginRight: 6 }} />
                <Text style={styles.milestoneTitle}>
                  {nextMilestone.days} Hari • Gelar Rahasia
                </Text>
              </View>
              <Text style={styles.milestoneDesc}>
                Gelar misterius tingkat {getTierName(nextMilestone.tier)} menantimu! Pertahankan streak selama {daysToNextMilestone} hari lagi untuk memecahkan segelnya.
              </Text>

              {/* Duolingo Chunky Progress Bar with Gloss Highlight */}
              <View style={styles.progressBarWrapper}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(milestoneProgressPercent, 5)}%`,
                    },
                  ]}
                >
                  <View style={styles.progressGlossHighlight} />
                </View>
              </View>

              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabelLeft}>
                  {currentStreak}/{nextMilestone.days} Hari ({milestoneProgressPercent}%)
                </Text>
                <Text style={styles.progressLabelRight}>
                  {daysToNextMilestone} hari lagi
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── 5. Duolingo Milestone Society Badges (Masyarakat Streak) ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="ribbon" size={16} color={colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Masyarakat Streak (Streak Society)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Gelar yang belum diraih dirahasiakan! Ketuk lencana untuk melihat petunjuk atau pratinjau perayaan.
          </Text>

          <View style={styles.badgeGrid}>
            {STREAK_MILESTONES.map((m) => {
              const isUnlocked = currentStreak >= m.days;
              const tierColor = getTierColor(m.tier);

              return (
                <Pressable
                  key={m.id}
                  style={[
                    styles.badgeCard,
                    isUnlocked && styles.badgeCardUnlocked,
                    !isUnlocked && styles.badgeCardLockedSecret,
                  ]}
                  onPress={() => handleBadgePress(m)}
                  hitSlop={touchTarget.min / 4}
                >
                  <View
                    style={[
                      styles.badgeIconBox,
                      isUnlocked
                        ? { backgroundColor: colors.surfaceSubtle, borderColor: tierColor }
                        : styles.badgeIconBoxLocked,
                    ]}
                  >
                    <Ionicons
                      name={isUnlocked ? (m.iconName as any) : "lock-closed"}
                      size={24}
                      color={isUnlocked ? tierColor : colors.textMuted}
                    />
                  </View>

                  <Text style={styles.badgeDaysNumber}>{m.days} Hari</Text>
                  <Text
                    style={[
                      styles.badgeTitleText,
                      !isUnlocked && styles.badgeTitleTextLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {isUnlocked ? m.title : "??? Rahasia"}
                  </Text>

                  <View
                    style={[
                      styles.badgeStatusPill,
                      isUnlocked
                        ? { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: tierColor }
                        : styles.badgeStatusPillLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeStatusText,
                        isUnlocked ? { color: tierColor } : { color: colors.textMuted },
                      ]}
                    >
                      {isUnlocked ? "TERBUKA" : "RAHASIA 🔒"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── 6. Action Buttons ─── */}
        <View style={styles.ctaContainer}>
          <Pressable
            style={styles.duoPrimaryBtn}
            onPress={handleContinueStudy}
          >
            <Ionicons name="flame" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.duoPrimaryBtnText}>
              {todayStudied ? "Lanjutkan Belajar Hari Ini" : "Mulai Belajar & Nyalakan Api 🔥"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.duoShareBtn}
            onPress={handleShareStreak}
          >
            <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.duoShareBtnText}>Bagikan Pencapaian Streak</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ─── Celebration Modal Preview ─── */}
      <StreakCelebrationModal
        visible={previewMilestone !== null}
        milestone={previewMilestone}
        currentStreak={previewMilestone ? previewMilestone.days : currentStreak}
        isSecretRevealed={true}
        onClose={() => setPreviewMilestone(null)}
      />

      {/* ─── Mystery Milestone Clue Sheet ─── */}
      <BottomSheet
        visible={secretClueMilestone !== null}
        onClose={() => setSecretClueMilestone(null)}
        title="Gelar Rahasia Terkunci"
      >
        <View
          style={[
            styles.mysteryCard,
            { borderColor: getTierColor(secretClueMilestone?.tier || "bronze") },
          ]}
        >
          <View
            style={[
              styles.mysteryGlowCircle,
              {
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: getTierColor(secretClueMilestone?.tier || "bronze"),
              },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={34}
              color={getTierColor(secretClueMilestone?.tier || "bronze")}
            />
          </View>

          <View
            style={[
              styles.mysteryTagBadge,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: getTierColor(secretClueMilestone?.tier || "bronze"),
              },
            ]}
          >
            <Text
              style={[
                styles.mysteryTagText,
                { color: getTierColor(secretClueMilestone?.tier || "bronze") },
              ]}
            >
              MILESTONE {secretClueMilestone?.days} HARI
            </Text>
          </View>

          <Text style={styles.mysteryCardDesc}>
            Nama, lambang ikon, dan kisah gelar ini masih dirahasiakan!
          </Text>

          <View style={styles.mysteryClueBox}>
            <Ionicons
              name="key"
              size={16}
              color={getTierColor(secretClueMilestone?.tier || "bronze")}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text style={styles.mysteryClueText}>
              Tingkat:{" "}
              <Text
                style={{
                  fontWeight: "bold",
                  color: getTierColor(secretClueMilestone?.tier || "bronze"),
                }}
              >
                {getTierName(secretClueMilestone?.tier || "bronze")}
              </Text>
              {"\n"}
              Pertahankan apimu{" "}
              <Text style={{ fontWeight: "bold", color: colors.text }}>
                {Math.max(0, (secretClueMilestone?.days || 0) - currentStreak)} hari
              </Text>{" "}
              lagi untuk membuka dan merayakan gelar ini!
            </Text>
          </View>

          <Pressable
            style={[
              styles.mysteryBtn,
              {
                backgroundColor: getTierColor(secretClueMilestone?.tier || "bronze"),
              },
            ]}
            onPress={() => {
              soundFX.playClick();
              HapticFeedback.light();
              setSecretClueMilestone(null);
            }}
            hitSlop={touchTarget.min / 4}
          >
            <Text style={styles.mysteryBtnText}>Siap Berjuang! 🔥</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* ─── Streak Debug Menu & Simulator ─── */}
      {Boolean(appSettings.developerModeEnabled) && (
        <StreakDebugModal
          visible={debugModalVisible}
          onClose={() => setDebugModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

function getTierColor(tier: MilestoneTier): string {
  switch (tier) {
    case "rainbow":
      return "#CE82FF";
    case "gold":
      return "#FFC800";
    case "silver":
      return "#38BDF8";
    case "bronze":
    default:
      return "#FF9600";
  }
}

function getTierName(tier: MilestoneTier): string {
  switch (tier) {
    case "rainbow":
      return "Legendaris Pelangi";
    case "gold":
      return "Emas Murni";
    case "silver":
      return "Perak Berkilau";
    case "bronze":
    default:
      return "Perunggu Api";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  heroStageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  heroTopBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  petIdentityPill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  petIdentityName: {
    fontSize: 11,
    fontWeight: "800",
    flexShrink: 1,
  },
  petIdentityStage: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  bestStreakCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  bestStreakText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  bestStreakNumber: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  flameHeroWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  speechBubble: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: "94%",
  },
  speechBubbleText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    lineHeight: 16,
  },
  streakCounterBlock: {
    alignItems: "center",
    paddingVertical: 2,
  },
  heroStreakNumber: {
    fontSize: 56,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 60,
  },
  heroStreakCaps: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.amber,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroStreakSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 290,
  },
  petNameEditorBox: {
    width: "100%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    gap: 6,
  },
  petNameEditorLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  petNameInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  petNameInput: {
    flex: 1,
    height: 36,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  petNameSaveBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  petNameSaveBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  petNamePresetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  petNamePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  petNamePresetText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  petCarePanel: {
    width: "100%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    gap: 8,
  },
  petMoodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  petMoodText: {
    fontSize: 11,
    fontWeight: "800",
  },
  petCircadianLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
  petCareStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  petSatietyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  petSatietyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  petSatietyDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  petSatietyDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  petEmberStockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  petEmberStockText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  petFooterMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  petCareHintText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  petActionRow: {
    flexDirection: "row",
    gap: 6,
  },
  petActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  petActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  elementSectionBox: {
    marginTop: 2,
    gap: 6,
  },
  elementSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  elementChipsRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  elementChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  elementChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  // Mascot Evolution Card
  evolutionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  evolutionCardLore: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 1,
  },
  stageStripRow: {
    flexDirection: "row",
    gap: 6,
  },
  stageStepCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  stageStepTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
    textAlign: "center",
  },
  stageStepDays: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 1,
  },
  evolutionProgressSection: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  evolutionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  evolutionLabelText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  evolutionDaysLeftText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  evolutionBarWrapper: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  evolutionBarFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  maxEvolutionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  maxEvolutionText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    lineHeight: 18,
    fontWeight: typography.fontWeights.medium,
  },
  // Enhanced Freeze Section
  freezeSectionCard: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 10,
  },
  freezeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  freezeIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 186, 242, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  freezeTitleText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  freezeSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  freezeSlotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  freezeSlotBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  freezeSlotBoxActive: {
    backgroundColor: "rgba(0, 186, 242, 0.12)",
    borderColor: "#00BAF2",
  },
  freezeSlotBoxEmpty: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
    borderStyle: "dashed",
  },
  freezeSlotLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  freezeSlotLabelActive: {
    color: "#00BAF2",
  },
  freezeSlotStatus: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  freezeActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00BAF2",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: "#0284C7",
  },
  freezeActionBtnText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  freezeActiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 186, 242, 0.12)",
    borderColor: "#00BAF2",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  freezeActiveBannerText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: "#00BAF2",
  },
  freezeEarnHint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  freezeCompactPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  freezeCompactPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  freezeCompactPillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  // Week Card
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionMetaTag: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: spacing.sm,
  },
  weekDayCol: {
    alignItems: "center",
    padding: 2,
    borderRadius: radius.sm,
  },
  weekDayColSelected: {
    backgroundColor: colors.surfaceSubtle,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    marginBottom: 6,
  },
  weekDayNameToday: {
    color: colors.primary,
  },
  weekMedallion: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  weekMedallionStudied: {
    backgroundColor: "#FF9600",
    borderColor: "#CC7800",
    borderWidth: 2,
    borderBottomWidth: 3,
  },
  weekMedallionFrozen: {
    backgroundColor: "#00BAF2",
    borderColor: "#0284C7",
    borderWidth: 2,
    borderBottomWidth: 3,
  },
  weekMedallionFree: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.5)",
  },
  weekMedallionTodayPending: {
    borderColor: colors.amber,
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 150, 0, 0.08)",
  },
  weekMedallionMissed: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
  },
  weekMedallionEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
  },
  dayDetailCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  dayDetailTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dayDetailStats: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  weekLegendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Milestones
  milestonePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  milestonePillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  milestoneBody: {
    marginTop: spacing.xs,
  },
  milestoneTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  milestoneDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  progressBarWrapper: {
    height: 14,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 7,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 7,
    position: "relative",
  },
  progressGlossHighlight: {
    position: "absolute",
    top: 1,
    left: 4,
    right: 4,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 2,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLabelLeft: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  progressLabelRight: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  // Badges Grid
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  badgeCard: {
    width: "48%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    alignItems: "center",
  },
  badgeCardUnlocked: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
  },
  badgeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  badgeIconBoxLocked: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
  },
  badgeDaysNumber: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  badgeTitleText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badgeTitleTextLocked: {
    color: colors.textMuted,
  },
  badgeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 6,
  },
  badgeStatusPillLocked: {
    backgroundColor: colors.surfaceSubtle,
  },
  badgeStatusText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  // CTA
  ctaContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  duoPrimaryBtn: {
    height: 52,
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.amberBottom,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  duoPrimaryBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  duoShareBtn: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  duoShareBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  debugTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  debugTriggerText: {
    fontSize: typography.fontSizes.caption,
    color: colors.amber,
    fontWeight: typography.fontWeights.semibold,
  },
  // Mystery Secret Styles
  badgeCardLockedSecret: {
    borderStyle: "dashed",
    borderColor: colors.borderLight,
    opacity: 0.9,
  },
  mysteryTeaserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  mysteryCard: {
    width: "100%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: "center",
  },
  mysteryGlowCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  mysteryTagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  mysteryTagText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  mysteryCardDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  mysteryClueBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mysteryClueText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  mysteryBtn: {
    width: "100%",
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  mysteryBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
});
