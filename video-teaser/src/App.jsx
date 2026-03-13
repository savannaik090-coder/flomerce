import VideoTemplate from './VideoTemplate';

function App() {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="relative w-full max-h-screen aspect-video">
        <VideoTemplate />
      </div>
    </div>
  );
}

export default App;
