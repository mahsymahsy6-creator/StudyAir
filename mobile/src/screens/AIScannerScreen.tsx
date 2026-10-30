import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../theme";
import { useMobileStudyStore } from "../store";
import { CognitiveLoad } from "../types";
import { MobileParsedUnit } from "../gemini";
import { extractSyllabusFromAI } from "../services/aiService";

const PRESETS = [
  {
    id: "cs-timetable",
    name: "CS Systems Timetable",
    subject: "Distributed Systems & Kernel Design",
    examDate: "2026-11-20",
    color: "#3b82f6",
    sampleText: `Course: CS-401 Distributed Systems & Kernel Design
Final Exam: 2026-11-20
Topics:
- Raft Consensus & Distributed State Machines (60m, HIGH load)
- Virtual Memory Paging & Multi-Level Page Tables (90m, HIGH load)
- Cache Coherence & Snooping Protocols (45m, MEDIUM load)
- Kernel Inter-Process Communication (60m, MEDIUM load)`,
    units: [
      { id: "u-1", title: "Raft Consensus & Distributed State Machines", estimated_minutes: 60, cognitive_load: "HIGH" as CognitiveLoad, enabled: true, suggested_time: "09:00" },
      { id: "u-2", title: "Virtual Memory Paging & Multi-Level Page Tables", estimated_minutes: 90, cognitive_load: "HIGH" as CognitiveLoad, enabled: true, suggested_time: "11:00" },
      { id: "u-3", title: "Cache Coherence & Snooping Protocols", estimated_minutes: 45, cognitive_load: "MEDIUM" as CognitiveLoad, enabled: true, suggested_time: "14:00" },
      { id: "u-4", title: "Kernel Inter-Process Communication", estimated_minutes: 60, cognitive_load: "MEDIUM" as CognitiveLoad, enabled: true, suggested_time: "16:00" },
    ],
  },
  {
    id: "neuro-notes",
    name: "Handwritten Neurobiology",
    subject: "Cellular Neurobiology & Plasticity",
    examDate: "2026-11-25",
    color: "#8b5cf6",
    sampleText: `Course: BIO-320 Cellular Neurobiology & Plasticity
Exam Date: 2026-11-25
Lectures:
1. Long-Term Potentiation & NMDA Receptor Activation (60m, HIGH load)
2. Voltage-Gated Sodium & Potassium Channel Gates (45m, MEDIUM load)
3. Axonal Transport & Neurotransmitter Exocytosis (60m, LOW load)`,
    units: [
      { id: "u-5", title: "Long-Term Potentiation & NMDA Receptor Activation", estimated_minutes: 60, cognitive_load: "HIGH" as CognitiveLoad, enabled: true, suggested_time: "10:00" },
      { id: "u-6", title: "Voltage-Gated Sodium & Potassium Channel Gates", estimated_minutes: 45, cognitive_load: "MEDIUM" as CognitiveLoad, enabled: true, suggested_time: "13:00" },
      { id: "u-7", title: "Axonal Transport & Neurotransmitter Exocytosis", estimated_minutes: 60, cognitive_load: "LOW" as CognitiveLoad, enabled: true, suggested_time: "15:00" },
    ],
  },
  {
    id: "macro-outline",
    name: "Macroeconomics Outline",
    subject: "Macroeconomic Theory & Policy",
    examDate: "2026-12-05",
    color: "#10b981",
    sampleText: `Course: ECON-204 Macroeconomic Theory & Policy
Final Assessment: 2026-12-05
Modules:
- Dynamic Stochastic General Equilibrium Models (90m, HIGH load)
- Taylor Rule & Inflation Targeting Feedback (60m, MEDIUM load)
- Sovereign Debt Crises & Fiscal Austerity (45m, LOW load)`,
    units: [
      { id: "u-8", title: "Dynamic Stochastic General Equilibrium Models", estimated_minutes: 90, cognitive_load: "HIGH" as CognitiveLoad, enabled: true, suggested_time: "09:00" },
      { id: "u-9", title: "Taylor Rule & Inflation Targeting Feedback", estimated_minutes: 60, cognitive_load: "MEDIUM" as CognitiveLoad, enabled: true, suggested_time: "11:30" },
      { id: "u-10", title: "Sovereign Debt Crises & Fiscal Austerity", estimated_minutes: 45, cognitive_load: "LOW" as CognitiveLoad, enabled: true, suggested_time: "14:00" },
    ],
  },
];

interface AIScannerScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export function AIScannerScreen({ navigation }: AIScannerScreenProps) {
  const {
    addSubject,
    addStudyUnit,
    addBlock,
    geminiApiKey,
    setGeminiApiKey,
    setIsAIScanning,
  } = useMobileStudyStore();

  const [activeTab, setActiveTab] = useState<"camera" | "text" | "samples">("camera");
  const [syllabusInput, setSyllabusInput] = useState("");
  const [capturedImage, setCapturedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "completed">("idle");
  const [scanStage, setScanStage] = useState<"preparing" | "reading" | "checking">("preparing");
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const shimmerAnim = React.useRef(new Animated.Value(0.4)).current;

  const [activeModel, setActiveModel] = useState("Gemini 3.5 Flash Lite");
  const [activeSubject, setActiveSubject] = useState("");
  const [activeExamDate, setActiveExamDate] = useState("");
  const [activeColor, setActiveColor] = useState("#3A86FF");
  const [extractedUnits, setExtractedUnits] = useState<MobileParsedUnit[]>([]);

  // Keep global store informed so tab switches maintain awareness
  React.useEffect(() => {
    setIsAIScanning(scanState === "scanning");
  }, [scanState, setIsAIScanning]);

  // Smooth glowing shimmer animation for review screen skeleton
  React.useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (scanState === "scanning") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.85,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.35,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    }
    return () => {
      loop?.stop();
    };
  }, [scanState, shimmerAnim]);

  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScanState("idle");
    setScanStage("preparing");
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please allow camera access in device settings to take photos of assignments and syllabus notes."
        );
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.75,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        setCapturedImage({
          uri: res.assets[0].uri,
          base64: res.assets[0].base64 || "",
        });
      }
    } catch (err: any) {
      Alert.alert("Camera Error", err?.message || "Could not launch camera.");
    }
  };

  const handlePickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.75,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        setCapturedImage({
          uri: res.assets[0].uri,
          base64: res.assets[0].base64 || "",
        });
      }
    } catch (err: any) {
      Alert.alert("Gallery Error", err?.message || "Could not pick image.");
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!capturedImage?.base64) {
      Alert.alert("No Photo Selected", "Please take a photo or select an image from gallery first.");
      return;
    }

    const tStart = Date.now();
    setScanStage("preparing");
    setScanState("scanning");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const promptStr = "Deconstruct this photographed study task, syllabus, or lecture outline into structured atomic study units.";
      
      // Stage 2: Reading timetable
      setScanStage("reading");

      const { extraction, model } = await extractSyllabusFromAI(
        {
          imageBase64: capturedImage.base64,
          mimeType: "image/jpeg",
          text: promptStr,
          signal: controller.signal,
        },
        geminiApiKey
      );

      if (controller.signal.aborted) return;

      // Stage 3: Checking subjects
      setScanStage("checking");

      setActiveModel(model);
      setActiveSubject(extraction.subject_title);
      setActiveExamDate(extraction.exam_date || "");
      setActiveColor(extraction.color_hex || "#3A86FF");
      setExtractedUnits(
        extraction.units.map((u) => ({
          ...u,
          enabled: true,
          suggested_time: u.suggested_time || "10:00",
        }))
      );

      // Immediately show review screen (no artificial delay!)
      setScanState("completed");
      const tEnd = Date.now();
      if (__DEV__) { console.log(`[DEBUG TIMING] Total Scan Pipeline Duration: ${tEnd - tStart}ms`); }
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) {
        if (__DEV__) { console.log("[AIScannerScreen] Scan was cancelled by user."); }
        setScanState("idle");
        return;
      }
      setScanState("idle");
      Alert.alert(
        "Gemini Vision Error",
        err?.message || "Could not analyze image with Gemini."
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleRunRealAI = async () => {
    if (!syllabusInput.trim()) {
      Alert.alert("Empty Syllabus", "Please type or paste syllabus topics, lecture schedule, or exam notes.");
      return;
    }

    setScanStage("preparing");
    setScanState("scanning");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setScanStage("reading");
      const { extraction, model } = await extractSyllabusFromAI(
        { text: syllabusInput, signal: controller.signal },
        geminiApiKey
      );

      if (controller.signal.aborted) return;

      setScanStage("checking");
      setActiveModel(model);
      setActiveSubject(extraction.subject_title);
      setActiveExamDate(extraction.exam_date || "");
      setActiveColor(extraction.color_hex || "#3A86FF");
      setExtractedUnits(
        extraction.units.map((u) => ({
          ...u,
          enabled: true,
          suggested_time: u.suggested_time || "10:00",
        }))
      );

      // Immediately show review screen (no artificial delay!)
      setScanState("completed");
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) {
        if (__DEV__) { console.log("[AIScannerScreen] Scan was cancelled by user."); }
        setScanState("idle");
        return;
      }
      setScanState("idle");
      Alert.alert(
        "Gemini Analysis Error",
        err?.message || "Could not analyze syllabus. Check your internet connection."
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleUsePreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActiveModel("Sample Curriculum Preset");
    setActiveSubject(preset.subject);
    setActiveExamDate(preset.examDate);
    setActiveColor(preset.color);
    setExtractedUnits(preset.units);
    setScanState("completed");
  };

  const toggleUnit = (unitId: string) => {
    setExtractedUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, enabled: !u.enabled } : u))
    );
  };

  const handleConfirmAndSchedule = () => {
    const enabledUnits = extractedUnits.filter((u) => u.enabled);
    if (enabledUnits.length === 0) {
      Alert.alert("No Topics Selected", "Please select at least one study unit to schedule.");
      return;
    }

    const newSubject = addSubject({
      title: activeSubject || "New Subject",
      exam_date: activeExamDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      color_hex: activeColor || "#3b82f6",
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    enabledUnits.forEach((u, index) => {
      const studyUnit = addStudyUnit({
        subject_id: newSubject.id,
        title: u.title,
        estimated_minutes: u.estimated_minutes,
        cognitive_load: u.cognitive_load,
      });

      const dayOffset = Math.floor(index / 2);
      const blockDate = new Date(tomorrow);
      blockDate.setDate(blockDate.getDate() + dayOffset);

      const [hours, minutes] = (u.suggested_time || "10:00").split(":").map(Number);
      blockDate.setHours(hours || 10, minutes || 0, 0, 0);

      const endDate = new Date(blockDate);
      endDate.setMinutes(endDate.getMinutes() + u.estimated_minutes);

      addBlock({
        study_unit_id: studyUnit.id,
        start_time: blockDate.toISOString(),
        end_time: endDate.toISOString(),
        block_type: "STUDY",
      });
    });

    Alert.alert(
      "Ingestion Complete",
      `Created course "${newSubject.title}" and scheduled ${enabledUnits.length} study sessions into your calendar!`,
      [
        {
          text: "View Calendar",
          onPress: () => {
            setScanState("idle");
            setCapturedImage(null);
            navigation.navigate("Calendar");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan Syllabus with AI</Text>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={12} color={colors.violet} style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Gemini AI</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Turn photos, course outlines, and task notes into organized study blocks.
        </Text>



        {/* ─── State 1: Ingest Form ─── */}
        {scanState === "idle" && (
          <View style={styles.idleContainer}>
            {/* Tabs */}
            <View style={styles.tabBar}>
              <Pressable
                style={[styles.tab, activeTab === "camera" && styles.tabActive]}
                onPress={() => setActiveTab("camera")}
              >
                <Ionicons
                  name="camera-outline"
                  size={15}
                  color={activeTab === "camera" ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "camera" && styles.tabTextActive,
                  ]}
                >
                  Camera
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tab, activeTab === "text" && styles.tabActive]}
                onPress={() => setActiveTab("text")}
              >
                <Ionicons
                  name="document-text-outline"
                  size={15}
                  color={activeTab === "text" ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "text" && styles.tabTextActive,
                  ]}
                >
                  Text
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tab, activeTab === "samples" && styles.tabActive]}
                onPress={() => setActiveTab("samples")}
              >
                <Ionicons
                  name="layers-outline"
                  size={15}
                  color={activeTab === "samples" ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "samples" && styles.tabTextActive,
                  ]}
                >
                  Samples
                </Text>
              </Pressable>
            </View>

            {/* Camera Tab Content */}
            {activeTab === "camera" && (
              <View style={styles.cameraSection}>
                {!capturedImage ? (
                  <View style={styles.viewfinderCard}>
                    <View style={styles.viewfinderIconWrap}>
                      <Ionicons name="camera" size={36} color={colors.primary} />
                    </View>
                    <Text style={styles.viewfinderTitle}>Capture Task or Syllabus</Text>
                    <Text style={styles.viewfinderSubtitle}>
                      Photograph your syllabus sheet, assignment notes, or whiteboard to automatically build your schedule.
                    </Text>

                    <View style={styles.cameraButtonsRow}>
                      <Pressable style={styles.photoActionBtnPrimary} onPress={handleTakePhoto}>
                        <Ionicons name="camera" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.photoActionTextPrimary}>Take Photo</Text>
                      </Pressable>

                      <Pressable style={styles.photoActionBtnSecondary} onPress={handlePickGallery}>
                        <Ionicons name="images-outline" size={16} color={colors.text} style={{ marginRight: 6 }} />
                        <Text style={styles.photoActionTextSecondary}>Choose Gallery</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.previewCard}>
                    <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} />
                    <View style={styles.previewOverlay}>
                      <Pressable style={styles.retakeBtn} onPress={() => setCapturedImage(null)}>
                        <Ionicons name="refresh" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.retakeBtnText}>Retake Photo</Text>
                      </Pressable>
                    </View>

                    <Pressable style={styles.analyzeBtn} onPress={handleAnalyzePhoto}>
                      <Ionicons name="sparkles" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                      <Text style={styles.analyzeBtnText}>Analyze Photo with Gemini AI</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Text Tab Content */}
            {activeTab === "text" && (
              <View style={styles.textSection}>
                <Text style={styles.label}>Paste Syllabus / Course Schedule:</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={`e.g.\nCourse: Advanced Quantum Mechanics\nFinal Exam: 2026-11-30\n\nTopics:\n1. Wave-Particle Duality (60m)\n2. Schrödinger Equation (90m)\n3. Quantum Harmonic Oscillator (75m)`}
                  placeholderTextColor={colors.textMuted}
                  value={syllabusInput}
                  onChangeText={setSyllabusInput}
                  multiline
                  numberOfLines={7}
                  textAlignVertical="top"
                />

                <Pressable
                  style={[styles.runButton, !syllabusInput.trim() && styles.runButtonDisabled]}
                  onPress={handleRunRealAI}
                >
                  <Ionicons name="sparkles" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                  <Text style={styles.runButtonText}>
                    Extract Topics with AI
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Samples Tab Content */}
            {activeTab === "samples" && (
              <View style={styles.presetsSection}>
                <Text style={styles.presetHeading}>Available Sample Syllabi:</Text>
                {PRESETS.map((p) => (
                  <View key={p.id} style={styles.presetCard}>
                    <View style={[styles.presetDot, { backgroundColor: p.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.presetName}>{p.name}</Text>
                      <Text style={styles.presetSubject}>{p.subject}</Text>
                    </View>
                    <View style={styles.presetActions}>
                      <Pressable
                        style={styles.loadTextBtn}
                        onPress={() => {
                          setSyllabusInput(p.sampleText);
                          setActiveTab("text");
                        }}
                      >
                        <Text style={styles.loadTextBtnText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={styles.instantScanBtn}
                        onPress={() => handleUsePreset(p.id)}
                      >
                        <Text style={styles.instantScanBtnText}>Scan →</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── State 2: Progress Screen with Stages, Cancel & Review Skeleton ─── */}
        {scanState === "scanning" && (
          <View style={styles.scanningProgressContainer}>
            {/* Active Stage & Cancel Button Header Card */}
            <View style={styles.stageProgressCard}>
              <View style={styles.stageProgressHeader}>
                <View style={styles.stageProgressTitleRow}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.stageProgressTitle}>
                    {scanStage === "preparing"
                      ? "Preparing photo..."
                      : scanStage === "reading"
                      ? "Reading timetable..."
                      : "Checking subjects..."}
                  </Text>
                </View>
                <Pressable
                  style={styles.cancelScanBtn}
                  onPress={handleCancelScan}
                  hitSlop={10}
                >
                  <Ionicons name="close-circle-outline" size={16} color={colors.rose} style={{ marginRight: 4 }} />
                  <Text style={styles.cancelScanBtnText}>Cancel</Text>
                </Pressable>
              </View>

              {/* 3 Steps Visual Timeline */}
              <View style={styles.stepsRow}>
                {/* Step 1: Preparing photo */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      scanStage !== "preparing" ? styles.stepCircleDone : styles.stepCircleActive,
                    ]}
                  >
                    {scanStage !== "preparing" ? (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    ) : (
                      <Text style={styles.stepCircleText}>1</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      scanStage === "preparing" && styles.stepLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    Preparing photo
                  </Text>
                </View>

                <View
                  style={[
                    styles.stepLine,
                    scanStage !== "preparing" && styles.stepLineDone,
                  ]}
                />

                {/* Step 2: Reading timetable */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      scanStage === "checking"
                        ? styles.stepCircleDone
                        : scanStage === "reading"
                        ? styles.stepCircleActive
                        : styles.stepCircleIdle,
                    ]}
                  >
                    {scanStage === "checking" ? (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    ) : (
                      <Text
                        style={[
                          styles.stepCircleText,
                          scanStage === "preparing" && styles.stepCircleTextIdle,
                        ]}
                      >
                        2
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      scanStage === "reading" && styles.stepLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    Reading timetable
                  </Text>
                </View>

                <View
                  style={[
                    styles.stepLine,
                    scanStage === "checking" && styles.stepLineDone,
                  ]}
                />

                {/* Step 3: Checking subjects */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      scanStage === "checking"
                        ? styles.stepCircleActive
                        : styles.stepCircleIdle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepCircleText,
                        scanStage !== "checking" && styles.stepCircleTextIdle,
                      ]}
                    >
                      3
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      scanStage === "checking" && styles.stepLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    Checking subjects
                  </Text>
                </View>
              </View>
            </View>

            {/* Shimmering Skeleton of the Review Screen */}
            <View style={styles.skeletonReviewWrapper}>
              <Text style={styles.skeletonSectionHint}>
                Review Screen Layout (Receiving extracted data...)
              </Text>

              {/* Skeleton Header Card */}
              <Animated.View style={[styles.skeletonHeaderCard, { opacity: shimmerAnim }]}>
                <View style={styles.skeletonDot} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={styles.skeletonTitleBar} />
                  <View style={styles.skeletonSubBar} />
                  <View style={styles.skeletonEngineBar} />
                </View>
              </Animated.View>

              {/* Skeleton Topic Rows */}
              {[1, 2, 3, 4].map((idx) => (
                <Animated.View
                  key={idx}
                  style={[styles.skeletonUnitCard, { opacity: shimmerAnim }]}
                >
                  <View style={styles.skeletonCheckbox} />
                  <View style={{ flex: 1, gap: 6, marginHorizontal: spacing.sm }}>
                    <View
                      style={[
                        styles.skeletonTitleBar,
                        { width: idx % 2 === 0 ? "70%" : "88%" },
                      ]}
                    />
                    <View style={[styles.skeletonSubBar, { width: "45%" }]} />
                  </View>
                  <View style={styles.skeletonBadge} />
                </Animated.View>
              ))}

              {/* Skeleton Schedule Action Button */}
              <Animated.View style={[styles.skeletonButton, { opacity: shimmerAnim }]} />
            </View>
          </View>
        )}

        {/* ─── State 3: Extracted Units Review ─── */}
        {scanState === "completed" && (
          <View style={styles.completedContainer}>
            <View style={styles.reviewHeader}>
              <View style={[styles.reviewDot, { backgroundColor: activeColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewSubject}>{activeSubject}</Text>
                <Text style={styles.reviewExam}>Target Exam: {activeExamDate}</Text>
                <Text style={styles.reviewModel}>Engine: {activeModel}</Text>
              </View>
              <Pressable
                style={styles.rescanBtn}
                onPress={() => setScanState("idle")}
              >
                <Text style={styles.rescanBtnText}>Rescan</Text>
              </Pressable>
            </View>

            <Text style={styles.unitsHeading}>
              Topics ({extractedUnits.filter((u) => u.enabled).length} selected)
            </Text>

            {extractedUnits.map((u) => (
              <Pressable
                key={u.id}
                style={[styles.unitItem, !u.enabled && styles.unitItemDisabled]}
                onPress={() => toggleUnit(u.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    u.enabled && styles.checkboxChecked,
                  ]}
                >
                  {u.enabled && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitItemTitle}>{u.title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.unitItemTime}>
                      {u.estimated_minutes}m • Suggested: {u.suggested_time}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.loadBadge,
                    u.cognitive_load === "HIGH"
                      ? styles.loadHigh
                      : u.cognitive_load === "MEDIUM"
                      ? styles.loadMedium
                      : styles.loadLow,
                  ]}
                >
                  <Text style={styles.loadBadgeText}>{u.cognitive_load}</Text>
                </View>
              </Pressable>
            ))}

            <Pressable
              style={styles.scheduleButton}
              onPress={handleConfirmAndSchedule}
            >
              <Ionicons name="calendar" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.scheduleButtonText}>
                Schedule {extractedUnits.filter((u) => u.enabled).length} Sessions
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderColor: "rgba(168, 85, 247, 0.3)",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.violet,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  keyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  keyBarTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  keyBarSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  keyConfigBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderColor: colors.border,
    borderWidth: 1,
  },
  keyConfigBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  keyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  keyCardHeading: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  keyInput: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.fontSizes.xs,
  },
  saveKeyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveKeyBtnText: {
    color: colors.text,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  idleContainer: {
    gap: spacing.md,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    borderColor: colors.border,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.surfaceSubtle,
  },
  tabText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  cameraSection: {
    gap: spacing.md,
  },
  viewfinderCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderStyle: "dashed",
  },
  viewfinderIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  viewfinderTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  viewfinderSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  cameraButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  photoActionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  photoActionTextPrimary: {
    color: "#ffffff",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  photoActionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  photoActionTextSecondary: {
    color: colors.text,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  previewImage: {
    width: "100%",
    height: 240,
    borderRadius: radius.md,
    backgroundColor: "#000000",
  },
  previewOverlay: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  retakeBtnText: {
    color: colors.text,
    fontSize: typography.fontSizes.xs,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderBottomWidth: 3,
    borderBottomColor: colors.accentBottom,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  analyzeBtnText: {
    color: colors.textInverse,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  textSection: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.fontSizes.xs,
    minHeight: 130,
    lineHeight: 18,
  },
  runButton: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    borderBottomWidth: 3,
    borderBottomColor: colors.accentBottom,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  runButtonDisabled: {
    opacity: 0.5,
  },
  runButtonText: {
    color: colors.textInverse,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  presetsSection: {
    gap: spacing.xs,
  },
  presetHeading: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  presetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  presetName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  presetSubject: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  presetActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  loadTextBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadTextBtnText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  instantScanBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  instantScanBtnText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  scanningProgressContainer: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  stageProgressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  stageProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageProgressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stageProgressTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cancelScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    borderRadius: radius.full,
  },
  cancelScanBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.rose,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  stepCircleDone: {
    backgroundColor: "#10b981",
  },
  stepCircleIdle: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepCircleText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  stepCircleTextIdle: {
    color: colors.textMuted,
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  stepLine: {
    flex: 0.5,
    height: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  stepLineDone: {
    backgroundColor: "#10b981",
  },
  skeletonReviewWrapper: {
    gap: spacing.md,
  },
  skeletonSectionHint: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    marginLeft: 2,
  },
  skeletonHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  skeletonDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
    opacity: 0.6,
  },
  skeletonTitleBar: {
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    width: "60%",
  },
  skeletonSubBar: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    width: "40%",
  },
  skeletonEngineBar: {
    height: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    width: "25%",
  },
  skeletonUnitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  skeletonCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonBadge: {
    width: 48,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  skeletonButton: {
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    opacity: 0.4,
    marginTop: spacing.xs,
  },
  completedContainer: {
    gap: spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  reviewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  reviewSubject: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  reviewExam: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewModel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 2,
  },
  rescanBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderColor: colors.border,
    borderWidth: 1,
  },
  rescanBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  unitsHeading: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unitItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  unitItemDisabled: {
    opacity: 0.45,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderColor: colors.border,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitItemTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  unitItemTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  loadBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  loadLow: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  loadMedium: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  loadHigh: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  loadBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  scheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  scheduleButtonText: {
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
});
