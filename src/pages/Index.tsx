import { useState, useRef } from "react";
import Navigation from "@/components/Navigation";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Video, Image, Music, Upload, FileAudio, X, Zap, Lightbulb, Play, Camera, Headphones, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  const [videoType, setVideoType] = useState<'clips' | 'images'>('clips');
  const [contentLinks, setContentLinks] = useState("");
  const [musicLink, setMusicLink] = useState("");
  const [subtitleStyleSelected, setSubtitleStyleSelected] = useState(false);
  const [videoDuration, setVideoDuration] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const {
    apiKey,
    hasApiKey
  } = useApiKey();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const handleAudioUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an audio file.",
        variant: "destructive"
      });
      return;
    }
    setIsProcessingAudio(true);
    try {
      const fileName = `audio_${Date.now()}_${file.name}`;
      const {
        data,
        error
      } = await supabase.storage.from('audio-files').upload(fileName, file);
      if (error) throw error;
      const {
        data: urlData
      } = supabase.storage.from('audio-files').getPublicUrl(fileName);
      setAudioUrl(urlData.publicUrl);
      setUploadedAudio(file);
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.ceil(audio.duration);
        setVideoDuration(duration.toString());
        URL.revokeObjectURL(audio.src);
        toast({
          title: "Audio uploaded",
          description: `Duration: ${duration} seconds`
        });
      });
      audio.addEventListener('error', () => {
        toast({
          title: "Error",
          description: "Could not detect audio duration.",
          variant: "destructive"
        });
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload audio file.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAudio(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    if (audioFile) {
      handleAudioUpload(audioFile);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const generateAndRenderVideo = async () => {
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your JSON2Video API key in the navbar.",
        variant: "destructive"
      });
      return;
    }
    if (!uploadedAudio) {
      toast({
        title: "Missing Voiceover",
        description: "Please upload a voiceover file.",
        variant: "destructive"
      });
      return;
    }
    if (!contentLinks.trim()) {
      toast({
        title: "Missing Content",
        description: "Please add video/image URLs.",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    try {
      // Generate JSON configuration
      const urls = contentLinks.split('\n').filter(url => url.trim().length > 0);
      if (urls.length === 0) {
        toast({
          title: "Invalid URLs",
          description: "Please provide valid URLs.",
          variant: "destructive"
        });
        return;
      }
      const shuffledUrls = shuffleArray(urls);
      const duration = parseInt(videoDuration) || 30;
      const durationPerClip = Math.max(1, Math.floor(duration / shuffledUrls.length));
      const scenes = shuffledUrls.map(url => ({
        elements: [{
          type: videoType === 'clips' ? 'video' : 'image',
          src: url.trim(),
          fit: 'cover',
          ...(videoType === 'clips' ? {
            scale: {
              width: 1920,
              height: 1080
            },
            pan: 'top',
            'pan-distance': 0.1,
            zoom: 1,
            duration: durationPerClip,
            volume: 0
          } : {
            duration: durationPerClip
          })
        }]
      }));
      const jsonConfig = {
        scenes,
        comment: `${videoType === 'clips' ? 'Video clips' : 'Image'} based generation ${subtitleStyleSelected ? 'with' : 'with no'} subtitles`,
        resolution: "full-hd",
        quality: "high",
        draft: false,
        elements: [...(audioUrl ? [{
          volume: 2,
          duration: duration,
          type: "audio",
          trim: {
            end: duration
          },
          src: audioUrl,
          loop: 0
        }] : []), ...(musicLink ? [{
          volume: 0.5,
          duration: duration,
          type: "audio",
          src: musicLink.trim(),
          loop: 1
        }] : []), ...(subtitleStyleSelected && audioUrl ? [{
          settings: {
            "outline-width": 6,
            "word-color": "#FFFF00",           // Yellow text
            "shadow-offset": 4,
            "font-url": "https://drive.google.com/uc?export=download&id=1g7X2XRKM25IErbIyCBsAWu65O1Hv43Zh",
            "max-words-per-line": 4,
            "shadow-color": "#000000",         // Black shadow
            "style": "classic",
            "font-family": "Roboto",
            "position": "bottom-center",       // Positioned at bottom center
            "outline-color": "#000000",        // Black outline
            "line-color": "#FFFFFF"            // White line color
          },
          model: "default",
          language: "en",
          type: "subtitles",
          src: audioUrl
        }] : [])]
      };

      // Generate video directly
      const {
        data,
        error
      } = await supabase.functions.invoke('json2video-render', {
        body: {
          action: 'render',
          json: jsonConfig,
          apiKey: apiKey.trim()
        }
      });
      if (error) throw error;
      toast({
        title: "Video Generation Started!",
        description: "Redirecting to JSON2Video dashboard to monitor progress..."
      });

      // Redirect to JSON2Video dashboard
      setTimeout(() => {
        window.open('https://json2video.com/dashboard/renders/', '_blank');
      }, 2000);
    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to start video generation. Please check your settings and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const urlCount = contentLinks.split('\n').filter(url => url.trim().length > 0).length;
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20 dark:from-background dark:via-slate-900/50 dark:to-slate-800/20">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
              Community Video Generator
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform your community content into engaging videos with automated subtitles and professional styling.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
            <Card className="border border-border/50 shadow-elegant bg-card/80 backdrop-blur-sm dark:bg-card/90 dark:border-slate-700/50 dark:shadow-2xl overflow-hidden">
            
            
            <CardContent className="space-y-8 p-8">
              {/* Video Type Selection */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/20 dark:to-slate-700/20 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                  <Label className="text-lg font-semibold text-slate-800 dark:text-slate-100">Choose Content Type</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`group relative flex flex-col items-center gap-4 p-6 rounded-xl border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${videoType === 'clips' ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 shadow-lg dark:shadow-purple-500/10' : 'border-border dark:border-slate-600/50 bg-white/50 dark:bg-slate-800/30 hover:bg-white/80 dark:hover:bg-slate-700/40'}`} onClick={() => setVideoType('clips')}>
                    <div className={`p-4 rounded-full transition-all duration-300 ${videoType === 'clips' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'}`}>
                      <Video className={`h-6 w-6 ${videoType === 'clips' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Video Clips</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Use video content with motion</p>
                    </div>
                    {videoType === 'clips' && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className={`group relative flex flex-col items-center gap-4 p-6 rounded-xl border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${videoType === 'images' ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 shadow-lg dark:shadow-purple-500/10' : 'border-border dark:border-slate-600/50 bg-white/50 dark:bg-slate-800/30 hover:bg-white/80 dark:hover:bg-slate-700/40'}`} onClick={() => setVideoType('images')}>
                    <div className={`p-4 rounded-full transition-all duration-300 ${videoType === 'images' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'}`}>
                      <Image className={`h-6 w-6 ${videoType === 'images' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Static Images</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Use still image content</p>
                    </div>
                    {videoType === 'images' && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content URLs */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50/30 to-cyan-50/30 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl border border-blue-200/30 dark:border-blue-800/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-sm">
                      {videoType === 'clips' ? (
                        <Video className="h-4 w-4 text-white" />
                      ) : (
                        <Image className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div>
                      <Label className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {videoType === 'clips' ? 'Video Clip Links' : 'Image Links'} 
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Paste your {videoType === 'clips' ? 'video' : 'image'} URLs, one per line
                      </p>
                    </div>
                  </div>
                  {urlCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        {urlCount} URLs
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Textarea 
                    placeholder={`Example:\nhttps://example.com/${videoType === 'clips' ? 'video1.mp4' : 'image1.jpg'}\nhttps://example.com/${videoType === 'clips' ? 'video2.mp4' : 'image2.jpg'}`}
                    value={contentLinks} 
                    onChange={e => setContentLinks(e.target.value)} 
                    className="min-h-[140px] resize-none bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 transition-colors" 
                  />
                  {!contentLinks.trim() && (
                    <div className="absolute top-3 right-3">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Upload */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-emerald-50/30 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl border border-emerald-200/30 dark:border-emerald-800/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-sm">
                    <Headphones className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Upload Voiceover <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Add your audio narration or voiceover file
                    </p>
                  </div>
                </div>
                
                <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer overflow-hidden ${isDragOver ? 'border-emerald-400 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-500/10 scale-[1.02]' : 'border-slate-300 hover:border-slate-400 dark:border-slate-600/50 dark:hover:border-slate-500'} ${uploadedAudio ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-600/50' : 'bg-white/50 dark:bg-slate-800/30 hover:bg-white/80 dark:hover:bg-slate-700/40'}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => !uploadedAudio && fileInputRef.current?.click()}>
                  {uploadedAudio ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-sm">
                          <FileAudio className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {uploadedAudio.name}
                          </p>
                          {videoDuration && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                Duration: {videoDuration} seconds
                              </span>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedAudio(null);
                            setAudioUrl("");
                            setVideoDuration("");
                          }} 
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center shadow-sm">
                        {isProcessingAudio ? (
                          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                          {isProcessingAudio ? "Processing Audio..." : "Drop your audio file here"}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Or click to browse • MP3, WAV, M4A supported
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAudioUpload(file);
                }} />
                </div>
              </div>

              {/* Background Music */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-violet-50/30 to-purple-50/30 dark:from-violet-900/10 dark:to-purple-900/10 rounded-xl border border-violet-200/30 dark:border-violet-800/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg shadow-sm">
                    <Music className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Background Music
                    </Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Optional: Add background music to enhance your video
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <Input 
                    placeholder="https://example.com/background-music.mp3" 
                    value={musicLink} 
                    onChange={e => setMusicLink(e.target.value)} 
                    className="bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 focus:border-violet-400 dark:focus:border-violet-500 transition-colors pl-4 pr-12" 
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {musicLink.trim() ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Music className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Subtitles Toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/20 dark:bg-slate-800/30 rounded-lg border border-border/30 dark:border-slate-700/30">
                <div>
                  <Label className="text-base font-medium">Subtitles</Label>
                  <p className="text-sm text-muted-foreground">Auto-generate subtitles from audio</p>
                </div>
                <Switch checked={subtitleStyleSelected} onCheckedChange={setSubtitleStyleSelected} />
              </div>
              
              {/* Pro Tip Section */}
              <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-slate-800/50 dark:via-slate-700/50 dark:to-slate-800/50 rounded-lg p-4 border border-blue-200/50 dark:border-slate-600/30 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-full flex items-center justify-center shadow-sm">
                    <Lightbulb className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-1">
                      Pro Tip
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      For best results, use high-quality {videoType === 'clips' ? 'video clips' : 'images'} and ensure your voiceover is clear. 
                      Keep your content URLs organized and consider adding background music to enhance engagement.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Generate Button */}
              <Button 
                onClick={generateAndRenderVideo} 
                disabled={isGenerating || !uploadedAudio || !contentLinks.trim() || !hasApiKey} 
                className="group w-full h-16 text-base font-semibold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-700 hover:via-purple-600 hover:to-indigo-700 dark:from-purple-500 dark:via-purple-400 dark:to-indigo-500 dark:hover:from-purple-600 dark:hover:via-purple-500 dark:hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none disabled:shadow-none text-white rounded-xl" 
                size="lg"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Generating Video...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span>Generate Video</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default Index;