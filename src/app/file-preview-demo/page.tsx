'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import FileDropzone, { type FileWithPreview } from '@/components/FileDropzone';
import { FilePreview } from '@/components/FilePreview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FilePreviewDemoPage() {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([]);
  const [variant, setVariant] = useState<'grid' | 'list' | 'compact'>('grid');

  const handleDrop = (files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...(files as FileWithPreview[])]);
    toast.success(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
  };

  const handleRemove = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
    toast.success('File removed');
  };

  const handleClear = () => {
    uploadedFiles.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setUploadedFiles([]);
    toast.success('All files cleared');
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          File Preview Demo
        </h1>
        <p className="text-lg text-muted-foreground">
          Preview images, PDFs, text files, and more with thumbnails
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Upload images, PDFs, text files, or other documents to see previews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone
            onDrop={handleDrop}
            accept={{
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
              'application/pdf': ['.pdf'],
              'text/*': ['.txt', '.md', '.csv'],
              'application/json': ['.json'],
              'application/zip': ['.zip'],
            }}
          />
        </CardContent>
      </Card>

      {/* Variant Selector */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Style</CardTitle>
                <CardDescription>Choose how to display file previews</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setVariant('grid')}
                  variant={variant === 'grid' ? 'default' : 'outline'}
                  size="sm"
                >
                  Grid
                </Button>
                <Button
                  onClick={() => setVariant('list')}
                  variant={variant === 'list' ? 'default' : 'outline'}
                  size="sm"
                >
                  List
                </Button>
                <Button
                  onClick={() => setVariant('compact')}
                  variant={variant === 'compact' ? 'default' : 'outline'}
                  size="sm"
                >
                  Compact
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* File Previews */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>File Previews</CardTitle>
                <CardDescription>
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                </CardDescription>
              </div>
              <Button onClick={handleClear} variant="destructive" size="sm">
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <motion.div
              className={
                variant === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                  : variant === 'list'
                  ? 'space-y-3'
                  : 'flex flex-wrap gap-2'
              }
              layout
            >
              {uploadedFiles.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  variant={variant}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </motion.div>
          </CardContent>
        </Card>
      )}

      {/* Sample Files Section */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Previews</CardTitle>
          <CardDescription>
            Examples of how different file types are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Example */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['PNG', 'JPEG', 'GIF', 'SVG'].map((type) => (
                <div
                  key={type}
                  className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-xs text-muted-foreground">{type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PDF Example */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">PDF Documents</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center border border-border"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-xs text-muted-foreground">PDF</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Text Example */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Text Files</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['TXT', 'MD', 'CSV', 'JSON'].map((type) => (
                <div
                  key={type}
                  className="aspect-square bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center border border-border"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-xs text-muted-foreground">{type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Files */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Other Files</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['ZIP', 'Audio', 'Video', 'Unknown'].map((type) => (
                <div
                  key={type}
                  className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {type === 'ZIP' ? '📦' : type === 'Audio' ? '🎵' : type === 'Video' ? '🎥' : '📁'}
                    </div>
                    <p className="text-xs text-muted-foreground">{type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Key capabilities of the FilePreview component</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Image thumbnails with loading states</li>
            <li>✓ Full-size preview modal for images</li>
            <li>✓ PDF icons with preview modal</li>
            <li>✓ Text file content preview</li>
            <li>✓ File icons for unsupported formats</li>
            <li>✓ Multiple display variants (grid, list, compact)</li>
            <li>✓ Remove individual files</li>
            <li>✓ Responsive design</li>
            <li>✓ Dark mode support</li>
            <li>✓ Error handling for corrupt files</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
