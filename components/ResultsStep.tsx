import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { WordPressPost, Configuration, AIProvider, TextAIProvider } from '../types';
import PostCard from './PostCard';
import { generateImageBriefsAndAltsBatch, generateImage, getContentWithImagePlaceholder } from '../services/aiService';
import { uploadImage, updatePost, updateMediaAltText } from '../services/wordpressService';
import GenerationModal from './GenerationModal';
import AnalysisModal from './AnalysisModal';
import BulkAltTextModal from './BulkAltTextModal';
import UploadImageModal from './UploadImageModal';
import InsertImageModal from './InsertImageModal';
import { ImageIcon, SparklesIcon, UploadCloudIcon, CheckSquare, Square, EditIcon } from './icons/Icons';

const MAX_CONCURRENT_JOBS = 3;

type JobAction = 'generate' | 'insert' | 'insert_at' | 'set_featured' | 'upload_insert';

type Job = {
  post: WordPressPost;
  action: JobAction;
  payload?: {
    imageUrl: string;
    altText: string;
    imageDataUrl?: string;
    prebuiltContent?: string;
  };
};

interface Props {
  initialPosts: WordPressPost[];
  config: Configuration;
  onReset: () => void;
}

const ResultsStep: React.FC<Props> = ({ initialPosts, config, onReset }) => {
  const [posts, setPosts] = useState<WordPressPost[]>(initialPosts);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('all');

  const jobQueueRef = useRef<Job[]>([]);
  const activeCountRef = useRef(0);
  const isProcessingRef = useRef(false);

  const [batchPostIds, setBatchPostIds] = useState<Set<number>>(new Set());
  const [totalModalJobs, setTotalModalJobs] = useState(0);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [postToAnalyze, setPostToAnalyze] = useState<WordPressPost | null>(null);
  const [isAltTextModalOpen, setIsAltTextModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [postToUpload, setPostToUpload] = useState<WordPressPost | null>(null);

  const [insertModalData, setInsertModalData] = useState<{
    post: WordPressPost;
    imageUrl: string;
    altText: string;
  } | null>(null);

  const updatePostState = useCallback((postId: number, updates: Partial<WordPressPost>) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
  }, []);

  const postsRef = useRef(posts);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  // ── The core job processor ──
  const processJob = useCallback(async (job: Job) => {
    const { post, action, payload } = job;
    try {
      const currentPost = postsRef.current.find(p => p.id === post.id);
      if (!currentPost) throw new Error(`Post ${post.id} not found in current state.`);

      if (action === 'generate') {
        updatePostState(post.id, { status: 'generating_brief', statusMessage: 'Analyzing content...' });
        const [briefData] = await generateImageBriefsAndAltsBatch([currentPost], config.ai.analysis);
        if (!briefData) throw new Error("Failed to generate image brief.");

        const fullPrompt = `${briefData.brief}, ${config.image.style}${config.image.negativePrompt ? `, avoiding ${config.image.negativePrompt}` : ''}`;

        updatePostState(post.id, { status: 'generating_image', statusMessage: 'Creating image...' });
        const imageDataUrl = await generateImage(config.ai.image, fullPrompt, config.image);

        updatePostState(post.id, { status: 'uploading', statusMessage: 'Uploading to WordPress...' });
        const uploadedImage = await uploadImage(config.wordpress, imageDataUrl, `ai-img-${post.id}.png`, briefData.altText, briefData.altText);

        updatePostState(post.id, {
          status: 'success',
          statusMessage: 'Image generated!',
          generatedImage: {
            url: uploadedImage.source_url,
            mediaId: uploadedImage.id,
            alt: briefData.altText,
            brief: briefData.brief,
          },
        });

      } else if (action === 'insert') {
        if (!payload?.imageUrl) throw new Error("No image URL for insertion.");

        updatePostState(post.id, { status: 'analyzing_placement', statusMessage: 'AI finding best spot...' });
        const contentWithPlaceholder = await getContentWithImagePlaceholder(
          config.ai.analysis, currentPost.content.rendered, currentPost.title.rendered
        );

        const safeAlt = payload.altText.replace(/"/g, '&quot;');
        const imageHtml = `<figure class="wp-block-image size-large"><img src="${payload.imageUrl}" alt="${safeAlt}"/><figcaption>${payload.altText}</figcaption></figure>`;
        const newContent = contentWithPlaceholder.replace('<!-- INSERT_IMAGE_HERE -->', imageHtml);

        updatePostState(post.id, { status: 'inserting', statusMessage: 'Updating post...' });
        await updatePost(config.wordpress, post.id, { content: newContent });
        updatePostState(post.id, {
          status: 'success',
          statusMessage: 'Image inserted (auto)!',
          imageCount: currentPost.imageCount + 1,
          content: { ...currentPost.content, rendered: newContent },
        });

      } else if (action === 'insert_at') {
        if (!payload?.prebuiltContent) throw new Error("No content provided for manual insertion.");

        updatePostState(post.id, { status: 'inserting', statusMessage: 'Updating post...' });
        await updatePost(config.wordpress, post.id, { content: payload.prebuiltContent });
        updatePostState(post.id, {
          status: 'success',
          statusMessage: 'Image inserted (manual)!',
          imageCount: currentPost.imageCount + 1,
          content: { ...currentPost.content, rendered: payload.prebuiltContent },
        });

      } else if (action === 'set_featured') {
        if (!currentPost.generatedImage?.mediaId) throw new Error("No generated image to set as featured.");

        updatePostState(post.id, { status: 'setting_featured', statusMessage: 'Setting featured image...' });
        await updatePost(config.wordpress, post.id, { featured_media: currentPost.generatedImage.mediaId });
        updatePostState(post.id, {
          status: 'success',
          statusMessage: 'Featured image set!',
          featured_media: currentPost.generatedImage.mediaId,
        });

      } else if (action === 'upload_insert') {
        if (!payload?.imageDataUrl || !payload?.altText) throw new Error("Image data and alt text required.");

        updatePostState(post.id, { status: 'uploading', statusMessage: 'Uploading image...' });
        const uploadedImage = await uploadImage(
          config.wordpress, payload.imageDataUrl,
          `uploaded-img-${post.id}-${Date.now()}.png`,
          payload.altText, payload.altText
        );

        updatePostState(post.id, { status: 'analyzing_placement', statusMessage: 'Finding best spot...' });
        const contentWithPlaceholder = await getContentWithImagePlaceholder(
          config.ai.analysis, currentPost.content.rendered, currentPost.title.rendered
        );

        const safeAlt = payload.altText.replace(/"/g, '&quot;');
        const imageHtml = `<figure class="wp-block-image size-large"><img src="${uploadedImage.source_url}" alt="${safeAlt}"/><figcaption>${payload.altText}</figcaption></figure>`;
        const newContent = contentWithPlaceholder.replace('<!-- INSERT_IMAGE_HERE -->', imageHtml);

        updatePostState(post.id, { status: 'inserting', statusMessage: 'Updating post...' });
        await updatePost(config.wordpress, post.id, { content: newContent });

        updatePostState(post.id, {
          status: 'success',
          statusMessage: 'Image uploaded & inserted!',
          imageCount: currentPost.imageCount + 1,
          content: { ...currentPost.content, rendered: newContent },
          generatedImage: {
            url: uploadedImage.source_url,
            mediaId: uploadedImage.id,
            alt: payload.altText,
          },
        });
      }

    } catch (error) {
      console.error(`Job failed for post ${post.id} (${action}):`, error);
      updatePostState(post.id, {
        status: 'error',
        statusMessage: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    }
  }, [config, updatePostState]);

  // ── Ref-based queue drainer — no React state dependencies ──
  const drainQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const tryNext = () => {
      while (activeCountRef.current < MAX_CONCURRENT_JOBS && jobQueueRef.current.length > 0) {
        const job = jobQueueRef.current.shift()!;
        activeCountRef.current++;

        processJob(job).finally(() => {
          activeCountRef.current--;

          setBatchPostIds(prev => {
            const next = new Set(prev);
            next.delete(job.post.id);
            return next;
          });

          tryNext();
        });
      }

      if (activeCountRef.current === 0 && jobQueueRef.current.length === 0) {
        isProcessingRef.current = false;
      }
    };

    tryNext();
  }, [processJob]);

  // ── Public: add jobs to queue ──
  const addJobsToQueue = useCallback((jobs: Job[]) => {
    if (jobs.length === 0) return;
    setTotalModalJobs(prev => prev + jobs.length);
    setBatchPostIds(prev => {
      const next = new Set(prev);
      jobs.forEach(j => next.add(j.post.id));
      return next;
    });

    jobQueueRef.current.push(...jobs);
    setIsProgressModalOpen(true);

    drainQueue();
  }, [drainQueue]);

  // ── Auto-close modal when all jobs finish ──
  useEffect(() => {
    if (isProgressModalOpen && batchPostIds.size === 0 && totalModalJobs > 0) {
      const timer = setTimeout(() => {
        setIsProgressModalOpen(false);
        setTotalModalJobs(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isProgressModalOpen, batchPostIds.size, totalModalJobs]);

  // ────────────────────────────────────────
  // Action handlers
  // ────────────────────────────────────────

  const handleGenerate = useCallback((postsToProcess: WordPressPost[]) => {
    addJobsToQueue(postsToProcess.map(p => ({ post: p, action: 'generate' as JobAction })));
  }, [addJobsToQueue]);

  const handleInsert = useCallback((post: WordPressPost) => {
    const imageToInsert = post.generatedImage
      ? { imageUrl: post.generatedImage.url, altText: post.generatedImage.alt }
      : post.existingImageUrl
      ? { imageUrl: post.existingImageUrl, altText: post.existingImageAltText || '' }
      : null;

    if (!imageToInsert) {
      alert("No image available to insert for this post.");
      return;
    }

    setInsertModalData({
      post,
      imageUrl: imageToInsert.imageUrl,
      altText: imageToInsert.altText,
    });
  }, []);

  const handleAutoInsert = useCallback(() => {
    if (!insertModalData) return;
    const { post, imageUrl, altText } = insertModalData;
    addJobsToQueue([{ post, action: 'insert', payload: { imageUrl, altText } }]);
    setInsertModalData(null);
  }, [insertModalData, addJobsToQueue]);

  const handleManualInsert = useCallback((newContent: string) => {
    if (!insertModalData) return;
    const { post, imageUrl, altText } = insertModalData;
    addJobsToQueue([{
      post,
      action: 'insert_at',
      payload: { imageUrl, altText, prebuiltContent: newContent },
    }]);
    setInsertModalData(null);
  }, [insertModalData, addJobsToQueue]);

  const handleSetFeatured = useCallback((post: WordPressPost) => {
    addJobsToQueue([{ post, action: 'set_featured' }]);
  }, [addJobsToQueue]);

  const handleBulkInsertExisting = useCallback((postsToProcess: WordPressPost[]) => {
    const jobs: Job[] = postsToProcess
      .filter(p => p.existingImageUrl)
      .map(p => ({
        post: p,
        action: 'insert' as JobAction,
        payload: { imageUrl: p.existingImageUrl!, altText: p.existingImageAltText || '' },
      }));
    if (jobs.length > 0) {
      addJobsToQueue(jobs);
    } else {
      alert("None of the selected posts have an existing featured image to insert.");
    }
  }, [addJobsToQueue]);

  const handleToggleSelect = useCallback((postId: number) => {
    setSelectedPostIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) newSet.delete(postId);
      else newSet.add(postId);
      return newSet;
    });
  }, []);

  const selectedPosts = useMemo(() => posts.filter(p => selectedPostIds.has(p.id)), [posts, selectedPostIds]);

  const selectedPostsWithGeneratedImages = useMemo(
    () => selectedPosts.filter(p => p.generatedImage?.url),
    [selectedPosts]
  );

  const filteredPosts = useMemo(() => {
    if (filter === 'missing') return posts.filter(p => p.featured_media === 0 || p.imageCount === 0);
    if (filter === 'generated') return posts.filter(p => !!p.generatedImage);
    return posts;
  }, [posts, filter]);

  const handleSelectAll = useCallback(() => {
    if (selectedPostIds.size === filteredPosts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(filteredPosts.map(p => p.id)));
    }
  }, [selectedPostIds.size, filteredPosts]);

  const missingImagePosts = useMemo(
    () => posts.filter(p => !p.generatedImage && (p.featured_media === 0 || p.imageCount === 0)),
    [posts]
  );

  const handleAnalyze = useCallback((post: WordPressPost) => {
    setPostToAnalyze(post);
    setIsAnalysisModalOpen(true);
  }, []);

  const handleUploadClick = useCallback((post: WordPressPost) => {
    setPostToUpload(post);
    setIsUploadModalOpen(true);
  }, []);

  const handleUploadImage = useCallback((post: WordPressPost, imageDataUrl: string, altText: string) => {
    setIsUploadModalOpen(false);
    setPostToUpload(null);
    addJobsToQueue([{
      post,
      action: 'upload_insert',
      payload: { imageUrl: '', altText, imageDataUrl },
    }]);
  }, [addJobsToQueue]);

  const handleGenerateForAllMissing = useCallback(() => {
    if (window.confirm(`This will generate images for all ${missingImagePosts.length} posts missing one. This may use significant API credits. Proceed?`)) {
      handleGenerate(missingImagePosts);
    }
  }, [missingImagePosts, handleGenerate]);

  const handleSaveAltText = useCallback(async (updates: { mediaId: number; altText: string }[]) => {
    const postIdsToUpdate = new Set(
      posts.filter(p => p.generatedImage && updates.some(u => u.mediaId === p.generatedImage!.mediaId)).map(p => p.id)
    );
    posts.forEach(p => {
      if (postIdsToUpdate.has(p.id)) {
        updatePostState(p.id, { status: 'updating_meta', statusMessage: 'Saving alt text...' });
      }
    });

    const promises = updates.map(async ({ mediaId, altText }) => {
      try {
        await updateMediaAltText(config.wordpress, mediaId, altText);
        return { mediaId, altText, success: true, error: null };
      } catch (error) {
        return { mediaId, altText: '', success: false, error: error instanceof Error ? error.message : 'Update failed' };
      }
    });

    const results = await Promise.all(promises);

    setPosts(prev => prev.map(p => {
      if (!p.generatedImage) return p;
      const result = results.find(r => r.mediaId === p.generatedImage!.mediaId);
      if (!result) return p;
      if (result.success) {
        return { ...p, status: 'success', statusMessage: 'Alt text updated!', generatedImage: { ...p.generatedImage, alt: result.altText } };
      } else {
        return { ...p, status: 'error', statusMessage: `Failed to update alt text: ${result.error}` };
      }
    }));

    setIsAltTextModalOpen(false);
  }, [config.wordpress, posts, updatePostState]);

  const handleClearCompleted = useCallback(() => {
    jobQueueRef.current = [];
    activeCountRef.current = 0;
    isProcessingRef.current = false;
    setBatchPostIds(new Set());
    setTotalModalJobs(0);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsProgressModalOpen(false);
    if (batchPostIds.size === 0) {
      setTotalModalJobs(0);
    }
  }, [batchPostIds.size]);

  const modalPosts = useMemo(() => {
    return posts.filter(p => batchPostIds.has(p.id));
  }, [posts, batchPostIds]);

  return (
    <div className="animate-fade-in">
      {isProgressModalOpen && (
        <GenerationModal
          posts={modalPosts}
          totalJobs={totalModalJobs}
          onClose={handleModalClose}
          onClearCompleted={handleClearCompleted}
        />
      )}

      {isAnalysisModalOpen && postToAnalyze && (
        <AnalysisModal
          post={postToAnalyze}
          config={config}
          onClose={() => setIsAnalysisModalOpen(false)}
          onUpdatePost={updatePostState}
          onRegenerate={(post) => handleGenerate([post])}
        />
      )}

      {isAltTextModalOpen && (
        <BulkAltTextModal
          posts={selectedPostsWithGeneratedImages}
          onClose={() => setIsAltTextModalOpen(false)}
          onSave={handleSaveAltText}
        />
      )}

      {isUploadModalOpen && postToUpload && (
        <UploadImageModal
          post={postToUpload}
          config={config}
          onClose={() => { setIsUploadModalOpen(false); setPostToUpload(null); }}
          onUpload={handleUploadImage}
        />
      )}

      {insertModalData && (
        <InsertImageModal
          post={insertModalData.post}
          imageUrl={insertModalData.imageUrl}
          altText={insertModalData.altText}
          onClose={() => setInsertModalData(null)}
          onAutoInsert={handleAutoInsert}
          onManualInsert={handleManualInsert}
        />
      )}

      <div className="bg-surface rounded-lg shadow-xl p-4 sm:p-6 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Post Dashboard</h2>
            <p className="text-text-secondary">{filteredPosts.length} posts found. {selectedPostIds.size} selected.</p>
          </div>
          <button onClick={onReset} className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wide py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-muted disabled:opacity-50 disabled:cursor-not-allowed bg-surface-muted text-text-secondary hover:bg-border">
            Start Over
          </button>
        </div>

        <div className="bg-surface-muted/60 p-3 rounded-lg border border-border mb-4 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={handleSelectAll} className="flex items-center space-x-2 p-2 rounded-md hover:bg-border transition-colors">
              {selectedPostIds.size === filteredPosts.length && filteredPosts.length > 0
                ? <CheckSquare className="w-6 h-6 text-brand-primary" />
                : <Square className="w-6 h-6 text-subtle" />}
              <span className="font-semibold text-text-primary">
                {selectedPostIds.size > 0 ? `${selectedPostIds.size} Selected` : 'Select All'}
              </span>
            </button>
            <div className="w-px h-8 bg-border"></div>
          </div>
          <div className="flex-grow flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-muted tracking-wider mr-2">Actions</span>
              <button disabled={selectedPosts.length === 0} onClick={() => handleGenerate(selectedPosts)} className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wide py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-muted disabled:opacity-50 disabled:cursor-not-allowed text-white bg-gradient-to-br from-brand-primary to-brand-secondary shadow hover:shadow-md hover:-translate-y-0.5 focus:ring-brand-primary">
                <SparklesIcon className="w-5 h-5" /> <span>Generate Images</span>
              </button>
              <button disabled={selectedPosts.length === 0} onClick={() => handleBulkInsertExisting(selectedPosts)} className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wide py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-muted disabled:opacity-50 disabled:cursor-not-allowed bg-surface text-text-secondary border border-border shadow-sm hover:border-brand-primary hover:text-brand-primary hover:shadow focus:ring-brand-primary">
                <ImageIcon className="w-5 h-5" /> <span>Insert Existing Images</span>
              </button>
              <button disabled={missingImagePosts.length === 0} onClick={handleGenerateForAllMissing} className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wide py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-muted disabled:opacity-50 disabled:cursor-not-allowed text-white bg-gradient-to-br from-special-start to-special-end shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:ring-special-start disabled:from-slate-400 disabled:to-slate-500 animate-subtle-pulse">
                <SparklesIcon className="w-5 h-5" /> <span>Generate For All Missing ({missingImagePosts.length})</span>
              </button>
            </div>
            <div className="w-px h-8 bg-border hidden md:block"></div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-muted tracking-wider mr-2">Manage</span>
              <button disabled={selectedPostsWithGeneratedImages.length === 0} onClick={() => setIsAltTextModalOpen(true)} className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wide py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-muted disabled:opacity-50 disabled:cursor-not-allowed bg-surface text-text-secondary border border-border shadow-sm hover:border-brand-primary hover:text-brand-primary hover:shadow focus:ring-brand-primary">
                <EditIcon className="w-5 h-5" /> <span>Edit Alt Text</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-sm font-medium rounded-full text-text-secondary bg-surface-muted/60 hover:bg-border transition-colors ${filter === 'all' ? 'bg-brand-primary text-white hover:bg-brand-secondary shadow' : ''}`}>All Posts</button>
          <button onClick={() => setFilter('missing')} className={`px-4 py-1.5 text-sm font-medium rounded-full text-text-secondary bg-surface-muted/60 hover:bg-border transition-colors ${filter === 'missing' ? 'bg-brand-primary text-white hover:bg-brand-secondary shadow' : ''}`}>Missing Images</button>
          <button onClick={() => setFilter('generated')} className={`px-4 py-1.5 text-sm font-medium rounded-full text-text-secondary bg-surface-muted/60 hover:bg-border transition-colors ${filter === 'generated' ? 'bg-brand-primary text-white hover:bg-brand-secondary shadow' : ''}`}>Generated Images</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isSelected={selectedPostIds.has(post.id)}
              onToggleSelect={() => handleToggleSelect(post.id)}
              onGenerate={() => handleGenerate([post])}
              onInsert={() => handleInsert(post)}
              onSetFeatured={() => handleSetFeatured(post)}
              onAnalyze={() => handleAnalyze(post)}
              onUpload={() => handleUploadClick(post)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsStep;
