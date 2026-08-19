import React, { useRef, useEffect, useState } from 'react';

interface AutoScrollCarouselProps {
  children: React.ReactNode;
  speed?: 'slow' | 'normal' | 'fast';
  direction?: 'left' | 'right';
  className?: string;
  gap?: string;
}

export const AutoScrollCarousel: React.FC<AutoScrollCarouselProps> = ({
  children,
  speed = 'normal',
  direction = 'left',
  className = '',
  gap = 'gap-8',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const speedValue = speed === 'slow' ? 0.5 : speed === 'fast' ? 2 : 1;

  useEffect(() => {
    let animationFrameId: number;
    let lastTime: number;

    const scroll = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (containerRef.current && !isHovered) {
        const { scrollLeft, scrollWidth } = containerRef.current;
        
        if (direction === 'left') {
          containerRef.current.scrollLeft += speedValue * (delta / 16);
          if (scrollLeft >= scrollWidth / 2) {
            containerRef.current.scrollLeft -= scrollWidth / 2;
          }
        } else {
          containerRef.current.scrollLeft -= speedValue * (delta / 16);
          if (scrollLeft <= 0) {
            containerRef.current.scrollLeft += scrollWidth / 2;
          }
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [direction, speedValue, isHovered]);

  const handleManualScroll = (scrollDir: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 350; // approximate width of one card
      containerRef.current.scrollBy({
        left: scrollDir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };



  return (
    <div 
      className={`relative w-full ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Buttons */}
      <button 
        onClick={() => handleManualScroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-primary hover:bg-gray-50 focus:outline-none transition-transform hover:scale-105"
        aria-label="Scroll left"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <button 
        onClick={() => handleManualScroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-primary hover:bg-gray-50 focus:outline-none transition-transform hover:scale-105"
        aria-label="Scroll right"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      {/* Scroll Container */}
      <div 
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className={`flex w-max shrink-0 ${gap}`}>
          {children}
          {children}
          {children}
          {children}
        </div>
      </div>
    </div>
  );
};
