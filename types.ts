// ═══════════════════════════════════════════════════════════
// types.ts — AI Image Engine — FINAL
// ═══════════════════════════════════════════════════════════

export enum AppState {
  Configuration = 'configuration',
  Crawling = 'crawling',
  Results = 'results',
}

export enum TextAIProvider {
  Gemini = 'gemini',
  OpenAI = 'openai',
  Groq = 'groq',
  OpenRouter = 'openrouter',
}

export enum AIProvider {
  Gemini = 'gemini',
  DallE3 = 'dall-e-3',
  OpenRouter = 'openrouter',
  Stability = 'stability',
  Pollinations = 'pollinations',
}

export enum AspectRatio {
  Square = '1:1',
  Landscape = '16:9',
  Portrait = '9:16',
}

// FIX: Member must be "WebP" not "WEBP"
// ConfigurationStep.tsx uses ImageFormat.WebP
export enum ImageFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  WebP = 'webp',
}

export interface CrawlProgress {
  current: number;
  total: number;
  message?: string;
  status?: 'idle' | 'counting' | 'crawling' | 'processing' | 'complete' | 'error';
}

export interface AnalysisAIConfig {
  provider: TextAIProvider;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface ImageAIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  n?: number;
  responseFormat?: string;
}

export interface ImageSettings {
  style: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio | string;
  format?: ImageFormat | string;
  width?: number;
  height?: number;
  size?: string;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  quality?: number;
}

export type ImageConfig = ImageSettings;

// FIX: Must be "url" not "siteUrl"
// App.tsx uses config.wordpress.url
// ConfigurationStep creates { url: wpUrl, ... }
// wordpressService.ts expects config.url
export interface WordPressConfig {
  url: string;
  username: string;
  appPassword?: string;
}

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
  imageCount: number;
  existingImageUrl?: string;
  existingImageAltText?: string;
  generatedImage?: {
    url: string;
    alt: string;
    mediaId: number;
    brief?: string;
  };
  analysis?: {
    score: number;
    altText: string;
    brief: string;
    suggestions?: string[];
  };
  contentWithPlaceholder?: string;
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

export interface Configuration {
  wordpress: WordPressConfig;
  ai: {
    analysis: AnalysisAIConfig;
    image: ImageAIConfig;
  };
  image: ImageSettings;
  fetch?: {
    perPage?: number;
    postStatus?: 'publish' | 'draft' | 'any';
    categoryId?: number;
    tagId?: number;
    search?: string;
    missingFeaturedOnly?: boolean;
  };
}

export interface ImageBriefResult {
  brief: string;
  altText: string;
  postId?: number;
}

export interface ImageAnalysisResult {
  score: number;
  altText: string;
  brief: string;
  suggestions?: string[];
}

export interface AssetResult {
  url: string;
  mediaId: number;
  altText: string;
  brief?: string;
}

export interface IconProps {
  className?: string;
}
