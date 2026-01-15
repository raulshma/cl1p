'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import FileDropzone from '@/components/FileDropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FileDropzoneDemoPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleDrop = (files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);

    toast.success(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
  };

  const handleClear = () => {
    setUploadedFiles([]);
    toast.success('All uploaded files have been cleared');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          File Dropzone Demo
        </h1>
        <p className="text-lg text-muted-foreground">
          Drag and drop file upload with visual feedback
        </p>
      </div>

      {/* Main Dropzone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop files here or click to browse. You can upload images, PDFs, and text files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone onDrop={handleDrop} />
        </CardContent>
      </Card>

      {/* Custom Configuration Examples */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Images Only</CardTitle>
            <CardDescription>
              Accepts only image files with a 5MB limit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileDropzone
              onDrop={handleDrop}
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
              }}
              maxSize={5 * 1024 * 1024}
              maxFiles={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Small Files Only</CardTitle>
            <CardDescription>
              Accepts any file type up to 1MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileDropzone
              onDrop={handleDrop}
              maxSize={1024 * 1024}
              maxFiles={10}
            />
          </CardContent>
        </Card>
      </div>

      {/* Uploaded Files Summary */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Uploaded Files</CardTitle>
                <CardDescription>
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                </CardDescription>
              </div>
              <Button onClick={handleClear} variant="destructive">
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.type || 'Unknown type'} • {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            Key capabilities of the FileDropzone component
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Drag and drop file upload</li>
            <li>✓ Click to browse and select files</li>
            <li>✓ Visual feedback for drag states</li>
            <li>✓ File type validation</li>
            <li>✓ File size validation</li>
            <li>✓ Multiple file support</li>
            <li>✓ Image preview for image files</li>
            <li>✓ Individual file removal</li>
            <li>✓ Responsive design</li>
            <li>✓ Dark mode support</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
