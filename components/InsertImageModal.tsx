import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WordPressPost } from '../types';
import { XIcon, SparklesIcon, ImageIcon, Loader } from './icons/Icons';

interface Props {
  post: WordPressPost;
  imageUrl: string;
  altText: string;
  onClose: () => void;
  onAutoInsert: () => void;
  onManualInsert: (newContent: string) => void;
}

interface ContentBlock {
  index: number;
  tagName: string;
  textPreview: string;
  isHeading: boolean;
}

const InsertionPoint: React.FC<{
  isSelected: boolean;
  onClick: () => void;
  label: string;
}> = ({ isSelected, onClick, label }) => (
  <button
    onClick={onClick}
    className={`w-full py-2.5 px-3 rounded-md border-2 border-dashed transition-all text-xs font-medium my-1
      ${isSelected
        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm scale-[1.01]'
        : 'border-transparent hover:border-brand-primary/40 hover:bg-brand-primary/5 text-muted hover:text-brand-primary'
      }`}
    title={label}
  >
    <div className="flex items-center justify-center gap-2">
      {isSelected ? (
        <>
          <ImageIcon className="w-4 h-4" />
          <span>✓ Image will be inserted here</span>
        </>
      ) : (
        <span>+ {label}</span>
      )}
    </div>
  </button>
);

const ContentBlockPreview: React.FC<{ block: ContentBlock }> = ({ block }) => (
  <div
    className={`px-3 py-2 rounded bg-surface-muted/40 border border-border/50 text-sm text-text-secondary leading-relaxed
      ${block.isHeading ? 'font-bold text-text-primary bg-surface-muted/70' : ''}`}
  >
    <span className="inline-block text-[10px] text-muted mr-2 font-mono bg-background px-1.5 py-0.5 rounded">
      {block.tagName}
    </span>
    {block.textPreview}
    {block.textPreview.length >= 150 && '...'}
  </div>
);

const InsertImageModal: React.FC<Props> = ({
  post, imageUrl, altText, onClose, onAutoInsert, onManualInsert,
}) => {
  const [mode, setMode] = useState<'choose' | 'manual'>('choose');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Parse content into visual blocks for manual placement
  const contentBlocks: ContentBlock[] = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content.rendered, 'text/html');
    return Array.from(doc.body.children)
      .map((child, index) => ({
        index,
        tagName: child.tagName.toLowerCase(),
        textPreview: (child.textContent?.trim() || '').substring(0, 150),
        isHeading: /^h[1-6]$/.test(child.tagName.toLowerCase()),
      }))
      .filter(block => block.textPreview.length > 0);
  }, [post.content.rendered]);

  const handleAutoInsert = useCallback(() => {
    setIsProcessing(true);
    onAutoInsert();
  }, [onAutoInsert]);

  const handleManualConfirm = useCallback(() => {
    if (selectedPosition === null) return;
    setIsProcessing(true);

    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content.rendered, 'text/html');
    const children = Array.from(doc.body.children);

    const safeAlt = altText.replace(/"/g, '&quot;');
    const imageHtml = `\n<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="${imageUrl}" alt="${safeAlt}"/><figcaption>${altText}</figcaption></figure>\n<!-- /wp:image -->\n`;

    if (selectedPosition === -1) {
      // Insert at the very beginning
      doc.body.insertAdjacentHTML('afterbegin', imageHtml);
    } else {
      const targetBlock = contentBlocks[selectedPosition];
      if (targetBlock && children[targetBlock.index]) {
        children[targetBlock.index].insertAdjacentHTML('afterend', imageHtml);
      } else {
        // Fallback: append
        doc.body.insertAdjacentHTML('beforeend', imageHtml);
      }
    }

    onManualInsert(doc.body.innerHTML);
  }, [selectedPosition, contentBlocks, post.content.rendered, imageUrl, altText, onManualInsert]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-3xl border border-border max-h-[90vh] flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-text-primary">Insert Image into Post</h2>
            <p className="text-sm text-text-secondary mt-0.5 truncate">
              {stripHtml(post.title.rendered)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-full text-subtle hover:bg-surface-muted hover:text-text-primary disabled:opacity-50 flex-shrink-0 ml-3"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Body */}
        <div className="p-6 flex-grow overflow-y-auto">
          {/* Image Preview Bar */}
          <div className="flex items-center gap-4 mb-6 p-3 bg-surface-muted/50 rounded-lg border border-border">
            <img
              src={imageUrl}
              alt={altText}
              className="w-16 h-16 rounded-md object-cover flex-shrink-0 border border-border"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">{altText || 'Image'}</p>
              <p className="text-xs text-muted mt-1">This image will be inserted into the post content</p>
            </div>
          </div>

          {/* Mode: Choose */}
          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary mb-4 font-medium">
                How would you like to insert this image?
              </p>

              {/* Auto Insert Option */}
              <button
                onClick={handleAutoInsert}
                disabled={isProcessing}
                className="w-full p-5 rounded-xl border-2 border-brand-primary/30 hover:border-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-brand-primary/10 group-hover:bg-brand-primary/20 transition-colors flex-shrink-0">
                    <SparklesIcon className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-base">🤖 Auto Insert</p>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                      AI analyzes your content and automatically finds the <strong>perfect spot</strong> for maximum reader engagement. Recommended for most posts.
                    </p>
                  </div>
                </div>
                {isProcessing && (
                  <div className="flex items-center gap-2 mt-3 ml-14 text-brand-primary">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Adding to queue...</span>
                  </div>
                )}
              </button>

              {/* Manual Insert Option */}
              <button
                onClick={() => setMode('manual')}
                disabled={isProcessing || contentBlocks.length === 0}
                className="w-full p-5 rounded-xl border-2 border-border hover:border-brand-primary/50 hover:bg-surface-muted/50 transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-surface-muted group-hover:bg-border transition-colors flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-base">📍 Manual Insert</p>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                      Preview your post content and choose <strong>exactly where</strong> to place the image. Click between paragraphs to select the position.
                    </p>
                  </div>
                </div>
              </button>

              {contentBlocks.length === 0 && (
                <p className="text-xs text-muted text-center mt-2">
                  Manual insertion is unavailable — the post has no parseable content blocks.
                </p>
              )}
            </div>
          )}

          {/* Mode: Manual */}
          {mode === 'manual' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-text-primary">
                  Click where you want to insert the image:
                </p>
                <button
                  onClick={() => { setMode('choose'); setSelectedPosition(null); }}
                  className="text-xs text-brand-primary hover:underline font-medium"
                >
                  ← Back to options
                </button>
              </div>

              <div className="space-y-0.5 bg-background/50 rounded-lg p-3 border border-border">
                {/* Insertion point: Beginning of post */}
                <InsertionPoint
                  isSelected={selectedPosition === -1}
                  onClick={() => setSelectedPosition(-1)}
                  label="Insert at the beginning of the post"
                />

                {contentBlocks.map((block, i) => (
                  <React.Fragment key={block.index}>
                    <ContentBlockPreview block={block} />
                    <InsertionPoint
                      isSelected={selectedPosition === i}
                      onClick={() => setSelectedPosition(i)}
                      label={`Insert after this ${block.isHeading ? 'heading' : 'section'}`}
                    />
                  </React.Fragment>
                ))}
              </div>

              {/* Selected position preview */}
              {selectedPosition !== null && (
                <div className="mt-4 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex items-center gap-3">
                  <img src={imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  <p className="text-sm text-brand-primary font-medium">
                    Image will be placed {selectedPosition === -1 ? 'at the beginning' : `after block #${selectedPosition + 1}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — only in manual mode */}
        {mode === 'manual' && (
          <footer className="p-4 border-t border-border flex justify-between items-center bg-surface-muted/30 flex-shrink-0">
            <p className="text-sm text-muted">
              {selectedPosition !== null
                ? `Ready to insert`
                : 'Select an insertion point above'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="text-sm font-semibold py-2.5 px-4 rounded-lg bg-surface text-text-secondary border border-border hover:border-brand-primary hover:text-brand-primary transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualConfirm}
                disabled={selectedPosition === null || isProcessing}
                className="text-sm font-semibold py-2.5 px-5 rounded-lg text-white bg-gradient-to-br from-brand-primary to-brand-secondary shadow hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-2 transition-all"
              >
                {isProcessing ? <Loader className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Insert Here
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default InsertImageModal;

