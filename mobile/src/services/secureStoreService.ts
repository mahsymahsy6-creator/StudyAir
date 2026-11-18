/**
 * StudyAir Mobile — Secure Key & Credential Storage
 * 
 * Hardware-backed secure storage using expo-secure-store (Android Keystore / iOS Keychain).
 * Never tracks keys in plain text or git.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_GEMINI_KEY = "studyair_secure_gemini_api_key";
const SECURE_PROXY_TOKEN = "studyair_secure_proxy_token";

let memoryFallbackKey: string | null = null;
let memoryFallbackToken: string | null = null;

export async function getSecureGeminiKey(): Promise<string> {
  if (Platform.OS === "web") {
    return memoryFallbackKey || "";
  }
  try {
    const val = await SecureStore.getItemAsync(SECURE_GEMINI_KEY);
    return val || memoryFallbackKey || "";
  } catch (e) {
    console.warn("[SecureStore] Could not read Gemini key:", e);
    return memoryFallbackKey || "";
  }
}

export async function setSecureGeminiKey(key: string): Promise<boolean> {
  memoryFallbackKey = key;
  if (Platform.OS === "web") return true;

  try {
    if (key.trim()) {
      await SecureStore.setItemAsync(SECURE_GEMINI_KEY, key.trim());
    } else {
      await SecureStore.deleteItemAsync(SECURE_GEMINI_KEY);
    }
    return true;
  } catch (e) {
    console.warn("[SecureStore] Could not persist Gemini key:", e);
    return false;
  }
}

export async function getSecureProxyToken(): Promise<string> {
  if (Platform.OS === "web") {
    return memoryFallbackToken || "";
  }
  try {
    const val = await SecureStore.getItemAsync(SECURE_PROXY_TOKEN);
    return val || memoryFallbackToken || "";
  } catch {
    return memoryFallbackToken || "";
  }
}

export async function setSecureProxyToken(token: string): Promise<boolean> {
  memoryFallbackToken = token;
  if (Platform.OS === "web") return true;

  try {
    if (token.trim()) {
      await SecureStore.setItemAsync(SECURE_PROXY_TOKEN, token.trim());
    } else {
      await SecureStore.deleteItemAsync(SECURE_PROXY_TOKEN);
    }
    return true;
  } catch {
    return false;
  }
}
