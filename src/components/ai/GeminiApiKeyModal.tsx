"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Key, CheckCircle2, ShieldCheck, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface GeminiApiKeyModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function GeminiApiKeyModal({ open, onClose }: GeminiApiKeyModalProps) {
  const defaultEnvKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("studyair-gemini-key") || defaultEnvKey;
    }
    return defaultEnvKey;
  });

  const [isSaved, setIsSaved] = useState(() => {
    if (Boolean(defaultEnvKey)) return true;
    if (typeof window !== "undefined") {
      return Boolean(localStorage.getItem("studyair-gemini-key"));
    }
    return false;
  });

  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    if (!apiKey.trim()) {
      localStorage.removeItem("studyair-gemini-key");
      setIsSaved(false);
      toast.info("Gemini API Key removed. Using local heuristic engine.");
      onClose();
      return;
    }

    localStorage.setItem("studyair-gemini-key", apiKey.trim());
    setIsSaved(true);
    toast.success("Gemini API Key Saved!", {
      description: "StudyAir will now use Google Gemini 3.8 Flash for multimodal vision & copilot reasoning.",
    });
    onClose();
  };

  const handleClear = () => {
    setApiKey("");
    localStorage.removeItem("studyair-gemini-key");
    setIsSaved(false);
    toast.info("Gemini API Key removed.");
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a Gemini API Key first.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch("/api/gemini/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Quick connection test",
          apiKey: apiKey.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.source === "gemini") {
        toast.success("Gemini Connection Successful!", {
          description: `Connected to ${data.model} with active quota.`,
        });
      } else {
        toast.info("Connected via StudyAir AI Engine", {
          description: data.note || "Ready for syllabus parsing.",
        });
      }
    } catch (err: unknown) {
      toast.error("Connection failed", {
        description: err instanceof Error ? err.message : "Unable to reach Gemini endpoint.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-border bg-card p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Google Gemini Settings
                <Badge
                  variant="outline"
                  className={
                    isSaved
                      ? "text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }
                >
                  {isSaved ? "Gemini Live" : "Fallback Mode"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure your Gemini API key for multimodal vision & copilot scheduling.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-normal"
              >
                Get API Key <ExternalLink className="h-3 w-3" />
              </a>
            </Label>
            <div className="relative">
              <Input
                id="gemini-key"
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-9 pr-9 text-xs font-mono border-border bg-background"
              />
              <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your API key is stored securely in your browser&apos;s localStorage and never transmitted to third parties.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Zero-Setup Fallback Architecture</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Don&apos;t have an API key right now? StudyAir automatically runs the built-in high-fidelity syllabus parser and local heuristics so everything works seamlessly.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            {isSaved && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                title="Remove API Key"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestKey}
              disabled={isTesting || !apiKey.trim()}
              className="h-8 text-xs border-border"
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Save Key
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
