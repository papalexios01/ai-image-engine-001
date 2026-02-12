// ═══════════════════════════════════════════════════════════
// types.ts — Complete type definitions for AI Image Engine
// ═══════════════════════════════════════════════════════════

// ────────────────────────────────────────
// AI Provider Types
// ────────────────────────────────────────

/** Base AI provider shape shared across text and image providers */
export type AIProvider = {
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'stability' | 'replicate' | 'dalle' | 'midjourney';
  apiKey: string;
  model: string;
  baseUrl?: string;
};

/** Provider config for text/analysis AI (briefs, alt text, image placement) */
export type TextAIProvider = AIProvider & {
  maxTokens?: number;
  temperature?: number;
};

/**
 * Alias used by aiService.ts for the analysis AI configuration.
 * Identical to TextAIProvider — kept for backward compatibility.
 */
export type AnalysisAIConfig = TextAIProvider;

/**
 * Provider config for image generation AI.
 * Used by aiService.ts for image generation calls.
 */
export type ImageAIConfig = AIProvider & {
  /** Optional: number of images to generate per request */
  n?: number;
  /** Optional: response format (e.g., 'b64_json', 'url') */
  responseFormat?: string;
};

// ────────────────────────────────────────
// Image Settings
// ────────────────────────────────────────

/** Image generation parameters — passed alongside the AI config */
export type ImageSettings = {
  /** Style prompt appended to every image generation (e.g., "photorealistic, 4k") */
  style: string;
  /** Negative prompt to avoid unwanted elements */
  negativePrompt?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Aspect ratio string, e.g., "16:9", "1:1" */
  aspectRatio?: string;
  /** Image size string for APIs that use it, e.g., "1024x1024" */
  size?: string;
  /** Number of generation steps (for Stability/Replicate) */
  steps?: number;
  /** CFG scale / guidance scale */
  guidanceScale?: number;
  /** Seed for reproducibility (-1 or undefined for random) */
  seed?: number;
  /** Quality setting (e.g., "standard", "hd") */
  quality?: string;
};

/**
 * Legacy alias — some parts of the codebase may reference ImageConfig
 * instead of ImageSettings. They are identical.
 */
export type ImageConfig = ImageSettings;

// ────────────────────────────────────────
// WordPress Types
// ────────────────────────────────────────

export type WordPressConfig = {
  siteUrl: string;
  username: string;
  appPassword: string;
};

/** Mirrors the WordPress REST API response shape for a post */
export interface WordPressPost {
  id: number;
  title: { rendered: string };
  link: string;
  slug?: string;
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  date?: string;
  modified?: string;
  /** Number of <img> tags found in the post content */
  imageCount: number;

  // ── Existing image data (fetched from WP) ──
  existingImageUrl?: string;
  existingImageAltText?: string;

  // ── AI-generated image data ──
  generatedImage?: {
    url: string;
    alt: string;
    mediaId: number;
    brief?: string;
  };

  // ── Analysis result (from AnalysisModal) ──
  analysis?: {
    score: number;
    altText: string;
    brief: string;
    suggestions?: string[];
  };

  // ── Content with image placeholder (cached from AI placement call) ──
  contentWithPlaceholder?: string;

  // ── Processing status ──
  status?:
    | 'idle'
    | 'pending'
    | 'generating_brief'
    | 'generating_image'
    | 'analyzing'
    | 'analyzing_placement'
    | 'uploading'
    | 'inserting'
    | 'setting_featured'
    | 'updating_meta'
    | 'analysis_success'
    | 'success'
    | 'error';

  statusMessage?: string;
}

/** Shape returned by the WordPress REST API when uploading media */
export interface WordPressMediaResponse {
  id: number;
  source_url: string;
  alt_text?: string;
  title?: { rendered: string };
  media_details?: {
    width: number;
    height: number;
    file: string;
    sizes?: Record<string, {
      source_url: string;
      width: number;
      height: number;
    }>;
  };
}

// ────────────────────────────────────────
// Master Configuration
// ────────────────────────────────────────

export interface Configuration {
  wordpress: WordPressConfig;
  ai: {
    /** AI provider used for text analysis (briefs, alt text, image placement) */
    analysis: AnalysisAIConfig;
    /** AI provider used for image generation */
    image: ImageAIConfig;
  };
  image: ImageSettings;
  /** Optional: fetch/filter settings */
  fetch?: {
    perPage?: number;
    postStatus?: 'publish' | 'draft' | 'any';
    categoryId?: number;
    tagId?: number;
    search?: string;
    missingFeaturedOnly?: boolean;
  };
}

// ────────────────────────────────────────
// AI Service Return Types
// ────────────────────────────────────────

/** Returned by generateImageBriefsAndAltsBatch for each post */
export interface ImageBriefResult {
  brief: string;
  altText: string;
  postId?: number;
}

/** Returned by analyzePostImage (AnalysisModal) */
export interface ImageAnalysisResult {
  score: number;
  altText: string;
  brief: string;
  suggestions?: string[];
}

/**
 * Asset result type — used by aiService when returning
 * uploaded/generated asset metadata.
 */
export interface AssetResult {
  url: string;
  mediaId: number;
  altText: string;
  brief?: string;
}

// ────────────────────────────────────────
// Component Prop Helpers
// ────────────────────────────────────────

export interface IconProps {
  className?: string;
}

export interface GenerationModalProps {
  posts: WordPressPost[];
  totalJobs: number;
  onClose: () => void;
  onClearCompleted: () => void;
}

export interface AnalysisModalProps {
  post: WordPressPost;
  config: Configuration;
  onClose: () => void;
  onUpdatePost: (postId: number, updates: Partial<WordPressPost>) => void;
  onRegenerate: (post: WordPressPost) => void;
}

export interface BulkAltTextModalProps {
  posts: WordPressPost[];
  onClose: () => void;
  onSave: (updates: { mediaId: number; altText: string }[]) => Promise<void>;
}

export interface UploadImageModalProps {
  post: WordPressPost;
  config: Configuration;
  onClose: () => void;
  onUpload: (post: WordPressPost, imageDataUrl: string, altText: string) => void;
}
