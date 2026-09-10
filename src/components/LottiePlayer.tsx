import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

interface LottiePlayerProps {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export function LottiePlayer({ animationData, loop = false, autoplay = true, className }: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    // Standardize animation data structure if wrapped in .default
    const cleanData = animationData.default ? animationData.default : animationData;

    // Create deep copy as lottie-web modifies the object in-place
    let dataCopy;
    try {
      dataCopy = JSON.parse(JSON.stringify(cleanData));
    } catch (e) {
      dataCopy = { ...cleanData };
    }

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop,
      autoplay,
      animationData: dataCopy,
    });

    return () => {
      anim.destroy();
    };
  }, [animationData, loop, autoplay]);

  return <div ref={containerRef} className={className} />;
}
