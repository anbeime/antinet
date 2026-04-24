
import { AbsoluteFill, spring, interpolate, useVideoConfig } from 'remotion';

const theme = {"bg": "#0f172a", "primary": "#ffffff", "accent": "#8b5cf6"};


// Slide 1: Cover
const CoverSlide0 = () => {
  const progress = spring({ fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: '#0f172a' }>
      <div style={
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: 'translateY(' + interpolate(progress, [0, 1], [30, 0]) + 'px)',
        fontSize: 72, color: '#ffffff', textAlign: 'center', padding: '40vh 0'
      }>
        ????
      </div>
    </AbsoluteFill>
  );
};


// Slide 2: Content - 核心事实
const ContentSlide1 = () => {
  const progress = spring({ fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: '#0f172a', padding: 40 }>
      <div style={ fontSize: 36, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 20 }>
        核心事实
      </div>
      
      <div style={
        backgroundColor: '#3b82f6',
        borderRadius: 12, padding: 20, marginBottom: 16,
        opacity: interpolate(progress, [0.15, 0.44999999999999996], [0, 1]),
        transform: 'translateX(' + interpolate(progress, [0.15, 0.65], [-50, 0]) + 'px)'
      }>
        <div style={ fontSize: 24, fontWeight: 'bold', color: 'white' }>??1</div>
        <div style={ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8 }>????</div>
      </div>
    </AbsoluteFill>
  );
};


// Slide 3: Summary
const SummarySlide2 = () => {
  const progress = spring({ fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: '#0f172a', justifyContent: 'center', alignItems: 'center' }>
      <div style={ fontSize: 48, color: '#8b5cf6', marginBottom: 40 }>总结</div>
      
        <div style={
          fontSize: 24, color: '#ffffff', marginBottom: 16,
          opacity: interpolate(progress, [0.0, 0.3], [0, 1])
        }>
          1. ??1
        </div>
    </AbsoluteFill>
  );
};


export const SlideSequence = [Slides];
