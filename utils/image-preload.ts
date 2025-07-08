/**
 * Enhanced image preloading utility for critical images
 * Optimizes LCP (Largest Contentful Paint) by preloading priority images
 */

import { PreloadOptions } from "types/common";

/**
 * Preload an image with optimal Next.js image optimization
 * This creates a prefetch request that will be cached by the browser
 */
export const preloadImage = (
  src: string,
  options: PreloadOptions = {}
): void => {
  const {
    priority = false,
    sizes = "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw",
    quality = 75,
    fetchPriority = priority ? 'high' : 'auto'
  } = options;

  if (typeof window === 'undefined') return;

  // Create optimized Next.js image URL
  const imageUrl = `/_next/image?url=${encodeURIComponent(src)}&w=640&q=${quality}`;

  // Check if already preloaded
  const existingPreload = document.querySelector(
    `link[rel="preload"][href="${imageUrl}"]`
  );
  
  if (existingPreload) return;

  // Create preload link element
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = imageUrl;
  link.fetchPriority = fetchPriority;

  // Add sizes for responsive images
  if (sizes) {
    link.setAttribute('imagesizes', sizes);
  }

  // Add to document head
  document.head.appendChild(link);
};

/**
 * Preload multiple images with intelligent prioritization
 * Uses requestIdleCallback for better performance
 */
export const preloadImages = (
  images: Array<{ src: string; options?: PreloadOptions }>
): void => {
  if (typeof window === 'undefined') return;

  const preloadNext = (index: number) => {
    if (index >= images.length) return;

    const { src, options } = images[index];
    preloadImage(src, options);

    // Use requestIdleCallback for better performance
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => preloadNext(index + 1));
    } else {
      setTimeout(() => preloadNext(index + 1), 0);
    }
  };

  // Start preloading
  preloadNext(0);
};

/**
 * Preload images based on viewport intersection
 * Preloads images that are about to enter the viewport
 */
export const preloadOnIntersection = (
  images: Array<{ src: string; element: Element; options?: PreloadOptions }>
): void => {
  if (typeof window === 'undefined' || !window.IntersectionObserver) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const imageData = images.find(img => img.element === entry.target);
          if (imageData) {
            preloadImage(imageData.src, imageData.options);
            observer.unobserve(entry.target);
          }
        }
      });
    },
    {
      // Trigger when image is 200px away from viewport
      rootMargin: '200px',
      threshold: 0
    }
  );  images.forEach(({ element }) => {
    observer.observe(element);
  });
};
