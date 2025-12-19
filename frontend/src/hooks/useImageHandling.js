import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for handling image selection and preview
 */
export function useImageHandling() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle image selection
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setTimeout(() => {
        if (imageRef.current) {
          setImageSize({
            width: imageRef.current.offsetWidth,
            height: imageRef.current.offsetHeight
          });
        }
      }, 50);
    }
  }, []);

  // Reset image
  const resetImage = useCallback(() => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setImageSize({ width: 0, height: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        handleImageLoad();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleImageLoad]);

  // Recalculate size when preview URL changes
  useEffect(() => {
    if (previewUrl && imageRef.current) {
      setTimeout(() => {
        handleImageLoad();
      }, 100);
    }
  }, [previewUrl, handleImageLoad]);

  return {
    selectedImage,
    previewUrl,
    imageSize,
    imageRef,
    fileInputRef,
    handleImageSelect,
    handleImageLoad,
    resetImage
  };
}
