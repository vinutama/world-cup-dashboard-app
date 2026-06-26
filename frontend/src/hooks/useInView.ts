import { useRef, useState, useEffect, type RefObject } from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
  once?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  const { once = true, threshold = 0.1, ...rest } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(el);
        } else {
          setInView(false);
        }
      },
      { threshold, ...rest }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // intentionally not dependent on `inView` — observer handles lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, once]);

  return { ref, inView };
}
