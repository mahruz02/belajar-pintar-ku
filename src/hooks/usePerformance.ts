import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Performance optimization hooks

// Debounce hook for search and input fields
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Throttle hook for scroll events and frequent updates
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - (now - lastCallRef.current));
      }
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

// Memoized data processing
export function useMemoizedData<T, U>(
  data: T[],
  processingFn: (data: T[]) => U,
  dependencies: any[] = []
): U {
  return useMemo(() => {
    return processingFn(data);
  }, [data, ...dependencies]);
}

// Virtual scrolling for large lists
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const scrollTop = useRef(0);
  const startIndex = Math.floor(scrollTop.current / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollTop.current = e.currentTarget.scrollTop;
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
  };
}

// Intersection Observer for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        
        if (visible && !hasBeenVisible) {
          setHasBeenVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options, hasBeenVisible]);

  return { isVisible, hasBeenVisible };
}

// Performance monitoring
export function usePerformanceMonitor() {
  const performanceData = useRef<{
    renderCount: number;
    renderTimes: number[];
    lastRenderTime: number;
  }>({
    renderCount: 0,
    renderTimes: [],
    lastRenderTime: 0,
  });

  useEffect(() => {
    const now = performance.now();
    const data = performanceData.current;
    
    data.renderCount++;
    
    if (data.lastRenderTime > 0) {
      const renderTime = now - data.lastRenderTime;
      data.renderTimes.push(renderTime);
      
      // Keep only last 100 render times
      if (data.renderTimes.length > 100) {
        data.renderTimes.shift();
      }
    }
    
    data.lastRenderTime = now;
  });

  const getAverageRenderTime = useCallback(() => {
    const times = performanceData.current.renderTimes;
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }, []);

  const getRenderCount = useCallback(() => {
    return performanceData.current.renderCount;
  }, []);

  return {
    getAverageRenderTime,
    getRenderCount,
  };
}
