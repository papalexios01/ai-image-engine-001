import React, { useState, useRef, useEffect } from 'react';
import { WordPressPost, Configuration } from '../types';
import { XIcon, UploadCloudIcon, Loader, ImageIcon } from './icons/Icons';

interface Props {
  post: WordPressPost;
  config: Configuration;
  onClose: () => void;
  onUpload: (post: WordPressPost, imageDataUrl: string, altText: string) => void;
}

const UploadImageModal: React.FC<Props> = ({ post, config, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!preview || !altText.trim()) {
      alert('Please select an image and enter alt text.');
      return;
    }
    setIsUploading(true);
    onUpload(post, preview, altText.trim());
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-xl border border-border max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Upload Image</h2>
            <p className="text-sm text-text-secondary mt-1 line-clamp-1">
              {stripHtml(post.title.rendered)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-full text-subtle hover:bg-surface-muted hover:text-text-primary disabled:opacity-50"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !preview && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer
              ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-border hover:border-brand-primary/50'}
              ${preview ? 'cursor-default' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFile();
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <UploadCloudIcon className="w-12 h-12 mx-auto text-muted" />
                <p className="mt-2 text-text-primary font-medium">
                  Drag and drop an image here
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  or click to browse
                </p>
                <p className="text-xs text-muted mt-3">
                  Supports: JPG, PNG, GIF, WebP
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="altText" className="block text-sm font-medium text-text-primary mb-1.5">
              Alt Text <span className="text-red-500">*</span>
            </label>
            <input
              id="altText"
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for accessibility and SEO"
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-surface text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
            <p className="text-xs text-muted mt-1">
              This helps with accessibility and search engine optimization.
            </p>
          </div>

          <div className="bg-surface-muted/50 rounded-lg p-4 border border-border">
            <div className="flex items-start gap-3">
              <ImageIcon className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">Smart Placement</p>
                <p className="text-xs text-text-secondary mt-1">
                  AI will analyze the blog post content and automatically insert this image at the most relevant position for maximum engagement.
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-4 border-t border-border flex justify-end gap-3 bg-surface-muted/30">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wide py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface bg-surface text-text-secondary border border-border hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!preview || !altText.trim() || isUploading}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wide py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface text-white bg-gradient-to-br from-brand-primary to-brand-secondary shadow hover:shadow-md hover:-translate-y-0.5 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isUploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadCloudIcon className="w-4 h-4" />
                Upload & Insert
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UploadImageModal;
