// ═══════════════════════════════════════════════════════════
// types.ts — Complete type definitions for AI Image Engine
// ═══════════════════════════════════════════════════════════

// ────────────────────────────────────────
// Enums (MUST be enums — used as runtime
// values in switch statements & comparisons)
// ────────────────────────────────────────

/** Application state — controls which step/view is shown */
export enum AppState {
  Configuration = 'configuration',
  Crawling = 'crawling',
  Results = 'results',
}

/** Text/Analysis AI provider identifiers */
export enum TextAIProvider {
  Gemini = 'gemini',
  OpenAI = 'openai',
  Groq = 'groq',
  OpenRouter = 'openrouter',
}

/** Image generation AI provider identifiers */
export enum AIProvider {
  Gemini = 'gemini',
  DallE3 = 'dall-e-3',
  OpenRouter = 'openrouter',
  Stability = 'stability',
  Pollinations = 'pollinations',
}

/** Aspect ratio options for image generation */
export enum AspectRatio {
  Square = '1:1',
  Landscape = '16:9',
  Portrait = '9:16',
}

/** Image output format options */
export enum ImageFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  WEBP = 'webp',
}

// ────────────────────────────────────────
// Crawl Progress
// ────────────────────────────────────────

/** Tracks progress during the WordPress post crawling/fetching step */
export interface CrawlProgress {
  /** Number of posts fetched so far */
  current: number;
  /** Total number of posts to fetch */
  total: number;
  /** Human-readable status message */
  message?: string;
  /** Current crawl phase */
  status?: 'idle' | 'counting' | 'crawling' | 'processing' | 'complete' | 'error';
}

// ────────────────────────────────────────
// AI Configuration Interfaces
// ────────────────────────────────────────

/** Configuration for text/analysis AI (briefs, alt text, image placement) */
export interface AnalysisAIConfig {
  provider: TextAIProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

/** Configuration for image generation AI */
export interface ImageAIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  n?: number;
  responseFormat?: string;
}

// ────────────────────────────────────────
// Image Settings
// ────────────────────────────────────────

/** Image generation parameters — style, size, aspect ratio, etc. */
export interface ImageSettings {
  /** Style prompt appended to every image generation */
  style: string;
  /** Negative prompt to avoid unwanted elements */
  negativePrompt?: string;
  /** Aspect ratio for the generated image */
  aspectRatio?: AspectRatio | string;
  /** Output format */
  format?: ImageFormat | string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
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
}

/** Legacy alias */
export type ImageConfig = ImageSettings;

// ────────────────────────────────────────
// WordPress Types
// ────────────────────────────────────────

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  appPassword: string;
}

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

  // ── Content with image placeholder ──
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
    /** AI provider used for text analysis */
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

/** Asset result type — uploaded/generated asset metadata */
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
