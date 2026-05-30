import { AbsoluteFill, interpolate, useVideoConfig, spring, useCurrentFrame, Sequence, Composition, registerRoot } from 'remotion';
import React from 'react';

// Slide 0: Cover
const CoverSlide0 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '#0f172a' }}>
      <div style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
        fontSize: 72, color: '#ffffff', textAlign: 'center', padding: '40vh 0'
      }}>
        智能分析报告
      </div>
    </AbsoluteFill>
  );
};

// Slide 1: Content - 核心事实
const ContentSlide1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '#0f172a', padding: 40 }}>
      <div style={{ fontSize: 36, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 20 }}>
        核心事实
      </div>
            <div style={{
        backgroundColor: '#3b82f6',
        borderRadius: 12, padding: 20, marginBottom: 16,
        opacity: interpolate(progress, [0.15, 0.45], [0, 1]),
        transform: `translateX(${interpolate(progress, [0.15, 0.65], [-50, 0])}px)`
      }}>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}># AI动态课件生成系统 v2.0 - 架构设计</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}># AI动态课件生成系统 v2.0 - 架构设计</div>
      </div>
    </AbsoluteFill>
  );
};

// Slide 2: Summary
const SummarySlide2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 48, color: '#8b5cf6', marginBottom: 40 }}>总结</div>
              <div style={{
          fontSize: 24, color: '#ffffff', marginBottom: 16,
          opacity: interpolate(progress, [0.0, 0.3], [0, 1])
        }}>
          1. # AI动态课件生成系统 v2.0 - 架构设计
        </div>
    </AbsoluteFill>
  );
};


const TOTAL_FRAMES = 540;

const SlideSequence = () => (
  <>
      <Sequence from={0} durationInFrames={180}>
        <CoverSlide0 />
      </Sequence>
      <Sequence from={180} durationInFrames={180}>
        <ContentSlide1 />
      </Sequence>
      <Sequence from={360} durationInFrames={180}>
        <SummarySlide2 />
      </Sequence>
  </>
);

const RemotionRoot = () => {
  return (
    <Composition
      id="SlideSequence"
      component={SlideSequence}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
