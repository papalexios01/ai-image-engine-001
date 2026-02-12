// ═══════════════════════════════════════════════════════════
// types.ts — Complete type definitions for AI Image Engine
// ═══════════════════════════════════════════════════════════

// ────────────────────────────────────────
// AI Provider Types
// ────────────────────────────────────────

/** Provider options for text/analysis AI (briefs, alt text, placement) */
export type TextAIProvider = {
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter';
  apiKey: string;
  model: string;
  /** Optional: base URL override for self-hosted or proxy endpoints */
  baseUrl?: string;
  /** Optional: max tokens for responses */
  maxTokens?: number;
  /** Optional: temperature (0–2) */
  temperature?: number;
};

/** Provider options for image generation AI */
export type AIProvider = {
  provider: 'openai' | 'stability' | 'replicate' | 'dalle' | 'midjourney' | 'openrouter';
  apiKey: string;
  model: string;
  /** Optional: base URL override */
  baseUrl?: string;
};

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
// Image Configuration
// ────────────────────────────────────────

export type ImageConfig = {
  /** Style prompt appended to every image generation (e.g. "photorealistic, 4k") */
  style: string;
  /** Negative prompt to avoid unwanted elements */
  negativePrompt?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Aspect ratio string, e.g. "16:9", "1:1" */
  aspectRatio?: string;
  /** Number of generation steps (for Stability/Replicate) */
  steps?: number;
  /** CFG scale / guidance scale */
  guidanceScale?: number;
  /** Seed for reproducibility (-1 or undefined for random) */
  seed?: number;
};

// ────────────────────────────────────────
// Master Configuration (passed to ResultsStep)
// ────────────────────────────────────────

export interface Configuration {
  wordpress: WordPressConfig;
  ai: {
    /** AI provider used for text analysis (briefs, alt text, image placement) */
    analysis: TextAIProvider;
    /** AI provider used for image generation */
    image: AIProvider;
  };
  image: ImageConfig;
  /** Optional: fetch settings */
  fetch?: {
    /** Posts per page when querying WordPress */
    perPage?: number;
    /** Post status filter */
    postStatus?: 'publish' | 'draft' | 'any';
    /** Category ID filter */
    categoryId?: number;
    /** Tag ID filter */
    tagId?: number;
    /** Search query */
    search?: string;
    /** Only fetch posts missing featured images */
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

// ────────────────────────────────────────
// Component Prop Helpers
// ────────────────────────────────────────

/** Common icon props used across the app */
export interface IconProps {
  className?: string;
}

/** For GenerationModal — tracks batch progress */
export interface GenerationModalProps {
  posts: WordPressPost[];
  totalJobs: number;
  onClose: () => void;
  onClearCompleted: () => void;
}

/** For AnalysisModal */
export interface AnalysisModalProps {
  post: WordPressPost;
  config: Configuration;
  onClose: () => void;
  onUpdatePost: (postId: number, updates: Partial<WordPressPost>) => void;
  onRegenerate: (post: WordPressPost) => void;
}

/** For BulkAltTextModal */
export interface BulkAltTextModalProps {
  posts: WordPressPost[];
  onClose: () => void;
  onSave: (updates: { mediaId: number; altText: string }[]) => Promise<void>;
}

/** For UploadImageModal */
export interface UploadImageModalProps {
  post: WordPressPost;
  config: Configuration;
  onClose: () => void;
  onUpload: (post: WordPressPost, imageDataUrl: string, altText: string) => void;
}
