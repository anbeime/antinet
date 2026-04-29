import { Composition } from "@remotion";
import { slides } from "./index";

export const MyVideo = () => {
  return (
    <>
      {slides.map((slide) => (
        <Composition
          id={slide.id}
          durationInFrames={slide.duration}
          fps={30}
          width={1920}
          height={1080}
          component={slide.component}
          defaultProps={{
            cards: [],
            summaryPoints: [],
          }}
        />
      ))}
    </>
  );
};

export default MyVideo;