import React, { useEffect, useState, useRef } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  CloudArrowUpIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { imagesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ImageLibrary() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewImage, setPreviewImage] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await imagesAPI.getAll();
      setImages(response.data);
    } catch (error) {
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fileArray = Array.from(files);
      if (fileArray.length === 1) {
        await imagesAPI.upload(fileArray[0]);
      } else {
        await imagesAPI.uploadMultiple(fileArray);
      }
      toast.success(`${fileArray.length} image${fileArray.length > 1 ? 's' : ''} uploaded successfully`);
      fetchImages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await imagesAPI.delete(id);
      toast.success('Image deleted successfully');
      fetchImages();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected images?`)) return;
    try {
      await imagesAPI.bulkDelete(selected);
      toast.success(`${selected.length} images deleted`);
      setSelected([]);
      fetchImages();
    } catch (error) {
      toast.error('Failed to delete images');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selected.length === filteredImages.length) {
      setSelected([]);
    } else {
      setSelected(filteredImages.map((img) => img.id));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    toast.success('URL copied to clipboard');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredImages = images.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);
  const aiGeneratedCount = images.filter((img) => img.isAIGenerated).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Image Library</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your marketing images and media files
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {selected.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-4 py-2.5 border border-red-300 rounded-lg shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
                Delete ({selected.length})
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Upload Images
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.avif,.heic,.heif"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50">
              <PhotoIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Images</p>
              <p className="text-2xl font-bold text-gray-900">{images.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50">
              <CloudArrowUpIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50">
              <SparklesIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">AI Generated</p>
              <p className="text-2xl font-bold text-gray-900">{aiGeneratedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-50">
              <ArrowDownTrayIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {images.length > 0 ? formatFileSize(totalSize / images.length) : '0 KB'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images..."
              className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {images.length > 0 && (
            <button
              onClick={selectAll}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {selected.length === filteredImages.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Drop Zone + Image Grid */}
      <div
        className={`bg-white shadow-sm rounded-lg border-2 overflow-hidden transition-colors ${
          dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">
            All Images
            {searchQuery && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredImages.length} result{filteredImages.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
        </div>

        {dragActive && (
          <div className="absolute inset-0 bg-primary-50 bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center">
              <CloudArrowUpIcon className="mx-auto h-16 w-16 text-primary-500" />
              <p className="mt-2 text-lg font-medium text-primary-700">Drop images here to upload</p>
            </div>
          </div>
        )}

        {filteredImages.length === 0 ? (
          <div
            className="text-center py-16 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <PhotoIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No images yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Drag and drop images here, or click to upload
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Upload Your First Image
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className={`group relative bg-gray-100 border-2 rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                  selected.includes(image.id)
                    ? 'border-primary-500 ring-2 ring-primary-200'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {/* Image */}
                <div className="aspect-square relative">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M18.364 5.636a9 9 0 11-12.728 0 9 9 0 0112.728 0zM12 8a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z"/></svg>';
                    }}
                  />
                  {image.isAIGenerated && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <SparklesIcon className="w-3 h-3 mr-1" />
                        AI
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPreviewImage(image)}
                      className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Preview"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => copyUrl(image.url)}
                      className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Copy URL"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Checkbox */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(image.id)}
                    onChange={() => toggleSelect(image.id)}
                    className="h-5 w-5 text-primary-600 border-2 border-white rounded shadow-sm cursor-pointer"
                  />
                </div>

                {/* Info */}
                <div className="p-3 bg-white">
                  <p className="text-sm font-medium text-gray-900 truncate">{image.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
              <button
                onClick={() => copyUrl(previewImage.url)}
                className="p-2 bg-white/90 rounded-lg text-gray-700 hover:bg-white transition-colors"
                title="Copy URL"
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 bg-white/90 rounded-lg text-gray-700 hover:bg-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-w-full max-h-[70vh] object-contain"
            />
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{previewImage.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(previewImage.size)} • {previewImage.mimeType}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(previewImage.id)}
                  className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
