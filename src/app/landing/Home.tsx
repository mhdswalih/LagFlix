import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Tv, Star, Search, Menu, X, Zap, 
  Volume2, VolumeX, Maximize, Minimize, 
  SkipBack, SkipForward, AlertCircle, 
  ChevronLeft, Pause
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  logo?: string;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [allShows, setAllShows] = useState<Channel[]>([]);
  const [displayShows, setDisplayShows] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [showLimit, setShowLimit] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [randomPreviewChannel, setRandomPreviewChannel] = useState<Channel | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Generate thumbnail based on channel name
  const getChannelThumbnail = (channel: Channel): string => {
    // Check if we already have a thumbnail
    if (channel.thumbnail) return channel.thumbnail;
    
    // Check if image failed to load before
    if (imageErrors.has(channel.id)) {
      // fallback: use a generic image
      return `https://dummyimage.com/300x200/888/fff&text=${encodeURIComponent(channel.name.substring(0, 20))}`;
    }

    // Try to get from TV logo APIs (these are just examples, actual implementation would vary)
    const channelName = channel.name.toLowerCase();
    
    // Check for known channel logos
    const knownLogos: Record<string, string> = {
      'bbc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/BBC_News.svg/800px-BBC_News.svg.png',
      'cnn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/800px-CNN.svg.png',
      'espn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/800px-ESPN_wordmark.svg.png',
      'discovery': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Discovery_Channel_logo.svg/800px-Discovery_Channel_logo.svg.png',
      'national geographic': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/National_Geographic_Logo.svg/800px-National_Geographic_Logo.svg.png',
      'hbo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/800px-HBO_logo.svg.png',
      'netflix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/800px-Netflix_2015_logo.svg.png',
    };

    // Try to match known logos
    for (const [key, logoUrl] of Object.entries(knownLogos)) {
      if (channelName.includes(key)) {
        return logoUrl;
      }
    }

    // Use category-based generic thumbnails
    const categories = [
      { keywords: ['sports', 'football', 'basketball', 'soccer', 'tennis'], color: 'ef4444' },
      { keywords: ['news', 'bbc', 'cnn', 'al jazeera', 'fox'], color: '3b82f6' },
      { keywords: ['movie', 'film', 'cinema', 'hollywood'], color: '8b5cf6' },
      { keywords: ['music', 'mtv', 'v music', 'radio'], color: 'ec4899' },
      { keywords: ['kids', 'cartoon', 'disney', 'nickelodeon'], color: '10b981' },
      { keywords: ['documentary', 'science', 'history', 'nature'], color: 'f59e0b' },
    ];

    for (const category of categories) {
      if (category.keywords.some(keyword => channelName.includes(keyword))) {
        return `https://dummyimage.com/300x200/${category.color}/ffffff&text=${encodeURIComponent(channel.name.substring(0, 20))}`;
      }
    }

    // Fallback to colored gradient based on channel name
    // fallback: use a generic image
    return `https://dummyimage.com/300x200/888/fff&text=${encodeURIComponent(channel.name.substring(0, 20))}`;
  };

  const handleImageError = (channelId: string) => {
    setImageErrors(prev => new Set(prev).add(channelId));
  };

  // Filter channels efficiently
  const filteredShows = useMemo(() => {
    if (!searchQuery.trim()) {
      return allShows.slice(0, showLimit);
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = allShows.filter(show =>
      show.name.toLowerCase().includes(lowerQuery)
    );
    
    return filtered.slice(0, 100);
  }, [searchQuery, allShows, showLimit]);

  // Fetch channels
  useEffect(() => {
    fetchShows();
  }, []);

  // Update display shows
  useEffect(() => {
    setDisplayShows(filteredShows);
  }, [filteredShows]);

  // Update random preview channel
  useEffect(() => {
    if (allShows.length > 0 && !randomPreviewChannel) {
      const randomIndex = Math.floor(Math.random() * allShows.length);
      setRandomPreviewChannel(allShows[randomIndex]);
    }
  }, [allShows]);

  // Handle video playback
  useEffect(() => {
    if (selectedIndex === null || !videoRef.current || allShows.length === 0) return;

    const video = videoRef.current;
    const selectedChannel = allShows[selectedIndex];
    
    if (!selectedChannel) return;
    
    const cleanUrl = selectedChannel.url.replace(/\r/g, '').trim();

    setStreamError(false);
    setIsBuffering(true);

    if (cleanUrl.includes('.m3u8')) {
      video.src = cleanUrl;
      video.load();

      const handleError = () => {
        setStreamError(true);
        setIsBuffering(false);
      };

      const handleCanPlay = () => {
        setIsBuffering(false);
        video.play().catch(console.error);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(video.duration);
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleWaiting = () => setIsBuffering(true);
      const handlePlaying = () => setIsBuffering(false);

      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);

      return () => {
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
      };
    } else {
      video.src = cleanUrl;
      video.load();

      const handleError = () => {
        setStreamError(true);
        setIsBuffering(false);
      };

      const handleCanPlay = () => {
        setIsBuffering(false);
        video.play().catch(console.error);
      };

      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay);

      return () => {
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [selectedIndex, allShows]);

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;

    const hideControls = () => {
      if (isPlaying && showControls) {
        setShowControls(false);
      }
    };

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(hideControls, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const fetchShows = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('https://iptv-org.github.io/iptv/index.m3u');
      const text = await response.text();
      const lines = text.split('\n');
      const channels: Channel[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF')) {
          const name = lines[i].split(',')[1]?.trim();
          const url = lines[i + 1]?.replace(/\r/g, '').trim();

          if (name && url && url.startsWith('http')) {
            // Extract logo from EXTINF line if available
            let logo: string | undefined;
            const logoMatch = lines[i].match(/tvg-logo="([^"]+)"/);
            if (logoMatch) {
              logo = logoMatch[1];
            }

            channels.push({
              name,
              url,
              id: `${name}-${url}`,
              logo
            });
          }
        }
      }

      console.log('✅ Fetched channels:', channels.length);
      setAllShows(channels);
      setDisplayShows(channels.slice(0, showLimit));
      
      // Set random preview channel
      if (channels.length > 0) {
        const randomIndex = Math.floor(Math.random() * channels.length);
        setRandomPreviewChannel(channels[randomIndex]);
      }
    } catch (error) {
      console.error('❌ Error fetching channels:', error);
      const fallbackChannels: Channel[] = [
        { 
          name: 'Sports Channel HD', 
          url: 'https://example.com/sports.m3u8', 
          id: 'sports1',
          thumbnail: 'https://dummyimage.com/300x200/ef4444/ffffff&text=Sports+HD'
        },
        { 
          name: 'News 24/7', 
          url: 'https://example.com/news.m3u8', 
          id: 'news1',
          thumbnail: 'https://dummyimage.com/300x200/3b82f6/ffffff&text=News+24/7'
        },
      ];
      setAllShows(fallbackChannels);
      setDisplayShows(fallbackChannels);
      setRandomPreviewChannel(fallbackChannels[0]);
    }
    setLoading(false);
  };

  const selectedChannel = selectedIndex !== null ? allShows[selectedIndex] : null;

  const playRandomChannel = (): void => {
    if (allShows.length === 0) {
      // If no channels loaded yet, fetch first
      fetchShows().then(() => {
        if (allShows.length > 0) {
          const randomIndex = Math.floor(Math.random() * allShows.length);
          setSelectedIndex(randomIndex);
        }
      });
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * allShows.length);
    setSelectedIndex(randomIndex);
  };

  const handlePlayChannel = (channel: Channel): void => {
    const idx = allShows.findIndex(s => s.id === channel.id);
    if (idx !== -1) {
      setSelectedIndex(idx);
    }
  };

  const toggleFullscreen = async (): Promise<void> => {
    if (!videoRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await videoRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = (): void => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = (): void => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipChannel = (direction: 'prev' | 'next'): void => {
    if (allShows.length === 0 || selectedIndex === null) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = selectedIndex > 0 ? selectedIndex - 1 : allShows.length - 1;
    } else {
      newIndex = selectedIndex < allShows.length - 1 ? selectedIndex + 1 : 0;
    }
    setSelectedIndex(newIndex);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!videoRef.current || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = (): void => {
    setSearchQuery('');
  };

  const loadMoreChannels = (): void => {
    setShowLimit(prev => prev + 100);
  };

  // Player view
  if (selectedIndex !== null && selectedChannel) {
    return (
      <div 
        className="fixed inset-0 bg-black z-50 flex flex-col"
        onMouseMove={() => {
          setShowControls(true);
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
          }
        }}
      >
        {/* Video Player Container */}
        <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            controls={false}
            className="w-full h-full object-contain"
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
          />

          {/* Buffering Indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white">Loading stream...</p>
              </div>
            </div>
          )}

          {/* Stream Error */}
          {streamError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="w-12 h-12 text-red-600" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
                  <p className="text-slate-300 mb-4">This stream is blocked, geo-restricted, or broken.</p>
                  <p className="text-slate-400 text-sm mb-4">Try another channel or test in VLC first</p>
                </div>
                <button
                  onClick={() => skipChannel('next')}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-semibold text-white transition"
                >
                  Try Next Channel
                </button>
              </div>
            </div>
          )}

          {/* YouTube-style Top Bar */}
          {showControls && (
            <div className="absolute top-0 left-0 right-0 bg-linear-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="flex items-center gap-2 text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                  <span className="font-medium">Back</span>
                </button>
                
                <div className="text-white text-lg font-medium truncate max-w-md">
                  {selectedChannel.name}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* YouTube-style Center Play Button */}
          {!isPlaying && showControls && (
            <button
              onClick={togglePlay}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-6 rounded-full transition-all"
            >
              <Play className="w-16 h-16 text-white" fill="white" />
            </button>
          )}

          {/* YouTube-style Bottom Controls */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black via-black/90 to-transparent p-4">
              {/* Progress Bar */}
              <div 
                ref={progressBarRef}
                className="relative h-1 mb-4 bg-white/30 rounded-full cursor-pointer group"
                onClick={handleProgressClick}
              >
                <div 
                  className="absolute h-full bg-red-600 rounded-full"
                  style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                />
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
                />
              </div>

              {/* Control Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>

                  {/* Skip Previous */}
                  <button
                    onClick={() => skipChannel('prev')}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                    title="Previous channel"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  {/* Skip Next */}
                  <button
                    onClick={() => skipChannel('next')}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                    title="Next channel"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2 group">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:bg-white/10 p-2 rounded-full transition"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <div className="w-24 h-1 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-full h-full cursor-pointer accent-red-600"
                      />
                    </div>
                  </div>

                  {/* Time Display */}
                  <div className="text-white text-sm font-mono">
                    {formatTime(currentTime)} / ----
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Tv className="w-8 h-8 text-red-600" />
            <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">LagFlix</span>
          </div>

          <div className="hidden md:flex gap-8 items-center">
            <a href="#home" className="hover:text-red-600 transition">Home</a>
            <a href="#shows" className="hover:text-red-600 transition">Channels</a>
            <a href="#features" className="hover:text-red-600 transition">Features</a>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 p-4">
            <a href="#home" className="block py-2 hover:text-red-600">Home</a>
            <a href="#shows" className="block py-2 hover:text-red-600">Channels</a>
            <a href="#features" className="block py-2 hover:text-red-600">Features</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-pink-600/10 blur-3xl -z-10"></div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Watch <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Live TV</span> Free
            </h1>
            <p className="text-xl text-slate-400">Stream {allShows.length.toLocaleString()} live TV channels from around the world. No subscriptions, no hidden fees. Pure entertainment.</p>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={playRandomChannel}
                className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-full font-bold flex items-center gap-2 transition transform hover:scale-105 group relative"
                title="Play a random live TV channel"
              >
                <Play className="w-5 h-5" />
                Start Watching
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Play random channel
                </span>
              </button>
              <button className="border-2 border-red-600 hover:bg-red-600/10 px-8 py-3 rounded-full font-bold transition">
                Learn More
              </button>
            </div>
          </div>

          <div className="relative">
            <div 
              className="bg-gradient-to-br from-red-600 to-pink-600 rounded-2xl p-1 cursor-pointer group hover:scale-[1.02] transition-transform overflow-hidden"
              onClick={playRandomChannel}
            >
              <div className="bg-slate-900 rounded-xl p-8 flex items-center justify-center aspect-video relative overflow-hidden">
                {/* Channel preview background */}
                {randomPreviewChannel && (
                  <div className="absolute inset-0 opacity-20">
                    <div className={getChannelThumbnail(randomPreviewChannel).startsWith('bg-gradient') 
                      ? `w-full h-full ${getChannelThumbnail(randomPreviewChannel)}`
                      : 'w-full h-full bg-gradient-to-br from-red-900/30 to-pink-900/30'
                    } />
                  </div>
                )}
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-pulse group-hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 ml-1" fill="white" />
                  </div>
                  {randomPreviewChannel && (
                    <div className="mt-4 text-center max-w-xs">
                      <p className="text-slate-300 text-sm mb-1">Sample channel:</p>
                      <p className="text-white font-semibold truncate">{randomPreviewChannel.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Channel info overlay */}
            {allShows.length > 0 && (
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 min-w-[200px] border border-slate-700 shadow-xl">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <p className="text-xs text-slate-300">Currently showing</p>
                </div>
                <p className="text-sm font-semibold text-white">
                  {allShows.length.toLocaleString()} channels available
                </p>
                <p className="text-xs text-slate-400 mt-1">Click to play random channel</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-4 w-6 h-6 text-slate-500" />
            <input
              type="text"
              placeholder={`Search ${allShows.length.toLocaleString()} channels...`}
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-red-600 text-white placeholder-slate-500"
            />
          </div>
          <div className="mt-2 text-sm text-slate-400">
            {searchQuery ? (
              <span>Found {filteredShows.length} channels matching "{searchQuery}"</span>
            ) : (
              <span>Showing {displayShows.length} of {allShows.length.toLocaleString()} channels</span>
            )}
          </div>
        </div>
      </section>

      {/* Channels Section */}
      <section id="shows" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-4xl font-bold">
              {searchQuery ? (
                `Search Results (${filteredShows.length})`
              ) : (
                `Live Channels (${allShows.length.toLocaleString()})`
              )}
            </h2>
            {loading && (
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                Loading channels...
              </div>
            )}
          </div>

          {displayShows.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No channels found for "{searchQuery}"</p>
              <button
                onClick={clearSearch}
                className="mt-4 bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-semibold transition"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayShows.map((show) => {
                  const thumbnail = getChannelThumbnail(show);
                  const isGradientClass = thumbnail.startsWith('bg-gradient');
                  
                  return (
                    <div
                      key={show.id}
                      className="group cursor-pointer bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02]"
                      onClick={() => handlePlayChannel(show)}
                    >
                      <div className="relative aspect-video overflow-hidden">
                        {isGradientClass ? (
                          <div className={`w-full h-full ${thumbnail} flex items-center justify-center`}>
                            <div className="text-center p-4">
                              <Tv className="w-12 h-12 text-white/80 mx-auto mb-2" />
                              <h3 className="text-white font-bold text-lg line-clamp-2">{show.name}</h3>
                            </div>
                          </div>
                        ) : (
                          <>
                            <img
                              src={thumbnail}
                              alt={show.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={() => handleImageError(show.id)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <Play className="w-12 h-12 text-white" fill="white" />
                            </div>
                          </>
                        )}
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          LIVE
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {!isGradientClass && (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                              <img
                                src={thumbnail}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.className = 'w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-bold text-lg group-hover:text-red-600 transition line-clamp-2 mb-1">{show.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span>Live TV</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Tv className="w-3 h-3" />
                                Channel
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {!searchQuery && displayShows.length < allShows.length && (
                <div className="text-center mt-12">
                  <button
                    onClick={loadMoreChannels}
                    className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-full font-semibold text-white transition"
                  >
                    Load More Channels ({allShows.length - displayShows.length} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Why Choose LagFlix?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold">Lightning Fast</h3>
              <p className="text-slate-400">Stream with minimal buffering</p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
                <Tv className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold">Global Channels</h3>
              <p className="text-slate-400">Access {allShows.length.toLocaleString()}+ channels worldwide</p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
                <Star className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold">100% Free</h3>
              <p className="text-slate-400">No subscriptions or hidden fees</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4 bg-slate-950">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Tv className="w-6 h-6 text-red-600" />
              <span className="font-bold">LagFlix</span>
            </div>
            <p className="text-slate-400 text-sm">Your gateway to unlimited entertainment</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li><a href="#" className="hover:text-red-600">Home</a></li>
              <li><a href="#" className="hover:text-red-600">Channels</a></li>
              <li><a href="#" className="hover:text-red-600">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li><a href="#" className="hover:text-red-600">Privacy</a></li>
              <li><a href="#" className="hover:text-red-600">Terms</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Follow Us</h4>
            <div className="flex gap-4 text-slate-400">
              <a href="#" className="hover:text-red-600">Twitter</a>
              <a href="#" className="hover:text-red-600">Instagram</a>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
          <p>&copy; 2024 LagFlix. All rights reserved.</p>
          <p className="mt-2 text-xs text-slate-500">{allShows.length.toLocaleString()} channels available</p>
        </div>
      </footer>
    </div>
  );
}